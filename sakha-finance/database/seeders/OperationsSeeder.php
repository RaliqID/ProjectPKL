<?php

namespace Database\Seeders;

use App\Enums\DeliveryStatus;
use App\Enums\DocumentStatus;
use App\Enums\DocumentType;
use App\Enums\InvoiceStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\TransactionStatus;
use App\Models\ActivityLog;
use App\Models\AppNotification;
use App\Models\Customer;
use App\Models\Delivery;
use App\Models\Document;
use App\Models\DocumentVersion;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Transaction;
use App\Models\User;
use App\Services\ActivityLogService;
use App\Services\VerificationService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Builds a realistic operational dataset with intentionally problematic
 * records so the verification engine and attention queue are demonstrable.
 *
 * Scenarios:
 *  A. Healthy, completed transaction
 *  B. Missing document -> NEEDS_REVIEW
 *  C. Payment mismatch (overpayment) -> NEEDS_REVIEW
 *  D. Partial payment -> WARNING
 *  E. Overdue invoice -> ATTENTION
 *  F. Delayed delivery -> ATTENTION
 *  G. Duplicate invoice number -> WARNING
 */
class OperationsSeeder extends Seeder
{
    private const COURIERS = ['JNE', 'J&T', 'SiCepat', 'AnterAja', 'Other'];

    private int $codeCounter = 1;
    private int $invoiceCounter = 1;
    private int $paymentCounter = 1;
    private int $deliveryCounter = 1;

    public function run(): void
    {
        $customers = Customer::where('status', 'ACTIVE')->get();
        $operator = User::where('email', 'operator@sakha.test')->first();
        $admin = User::where('email', 'admin@sakha.test')->first();
        $reviewer = User::where('email', 'reviewer@sakha.test')->first();

        if ($customers->isEmpty() || ! $operator) {
            $this->command->warn('Run UserSeeder and CustomerSeeder first.');
            return;
        }

        // Generate 52 transactions across the past 6 months.
        for ($i = 0; $i < 52; $i++) {
            $this->createTransaction($customers->random(), $operator, $i);
        }

        // Dedicated, easy-to-find demo scenarios (guaranteed to exist).
        $this->scenarioA_healthy($customers[0], $operator, $reviewer);
        $this->scenarioB_missingDocument($customers[1], $operator);
        $this->scenarioC_paymentMismatch($customers[2], $operator);
        $this->scenarioD_partialPayment($customers[3], $operator);
        $this->scenarioE_overdueInvoice($customers[4], $operator);
        $this->scenarioF_delayedDelivery($customers[5], $operator);
        $this->scenarioG_duplicateInvoice($customers[6], $operator);

        // Populate every remaining document type so each document tab has content:
        // Receipt, Tax Invoice, Purchase Order, Sales Order, Journal, BA, Other.
        $this->seedSupportingDocuments($operator);

        // Run verification once for every open transaction so the overview
        // and verification queue start populated. Each run is backdated to its
        // transaction's own date so the analytics trend reflects a realistic
        // history rather than every run landing on "today".
        $verification = app(VerificationService::class);
        Transaction::whereNotIn('status', [TransactionStatus::DRAFT])->limit(60)->get()->each(function (Transaction $t) use ($verification) {
            try {
                $run = $verification->run($t);

                $when = $t->transaction_date
                    ? \Illuminate\Support\Carbon::parse($t->transaction_date)->addDays(random_int(1, 6))
                    : now()->subDays(random_int(3, 90));
                $run->forceFill(['created_at' => $when, 'updated_at' => $when])->save();
                $run->checks()->update(['created_at' => $when, 'updated_at' => $when]);
            } catch (\Throwable $e) {
                // Seed should never abort on a single record.
            }
        });

        // Clear the notification flood created by verifying 50+ records, then
        // create a curated set of notifications for the reviewer/admin.
        AppNotification::query()->delete();
        $this->seedNotifications($admin, $reviewer);
    }

    private function createTransaction(Customer $customer, User $operator, int $index): Transaction
    {
        $date = now()->subDays(170 - ($index * 3))->addHours(random_int(8, 17));
        $subtotal = random_int(2, 40) * 250000;
        $discount = random_int(0, 2) === 0 ? random_int(1, 5) * 50000 : 0;
        $tax = (int) round(($subtotal - $discount) * 0.11);
        $total = $subtotal - $discount + $tax;

        $status = $this->randomWeightedStatus($index);

        $paymentCount = match ($status) {
            TransactionStatus::DRAFT, TransactionStatus::PROCESSING => 0,
            TransactionStatus::AWAITING_PAYMENT => random_int(0, 1),
            default => random_int(1, 2),
        };

        $transaction = Transaction::create([
            'transaction_code' => $this->nextCode($date->year),
            'customer_id' => $customer->id,
            'transaction_date' => $date->toDateString(),
            'status' => TransactionStatus::DRAFT,
            'reference_number' => 'REF-'.strtoupper(Str::random(6)),
            'purchase_order_number' => 'PO-'.random_int(10000, 99999),
            'sales_order_number' => 'SO-'.random_int(10000, 99999),
            'subtotal' => $subtotal,
            'discount' => $discount,
            'tax' => $tax,
            'total_amount' => $total,
            'notes' => $index % 7 === 0 ? 'Pengiriman dibagi menjadi dua batch.' : null,
            'created_by' => $operator->id,
            'updated_by' => $operator->id,
            'created_at' => $date,
            'updated_at' => $date,
        ]);

        Invoice::create([
            'transaction_id' => $transaction->id,
            'invoice_number' => $this->nextInvoice($date->year),
            'invoice_date' => $date->copy()->addDay()->toDateString(),
            'due_date' => $date->copy()->addDays(30)->toDateString(),
            'amount' => $total - $tax,
            'tax_amount' => $tax,
            'status' => InvoiceStatus::ISSUED,
            'created_by' => $operator->id,
            'created_at' => $date,
            'updated_at' => $date,
        ]);

        for ($p = 0; $p < $paymentCount; $p++) {
            $this->createPayment($transaction, $operator, $total, $date, $p, $paymentCount);
        }

        $this->maybeCreateDelivery($transaction, $status, $date);
        $this->maybeCreateDocuments($transaction, $operator, $status, $date);

        $this->syncDerivedStatus($transaction, $status);

        $this->logCreation($transaction, $operator, $date);

        return $transaction;
    }

    private function createPayment(Transaction $transaction, User $operator, int $total, $date, int $p, int $paymentCount): void
    {
        $isPartial = $paymentCount > 1 || random_int(0, 4) === 0;
        $amount = $isPartial && $paymentCount === 1
            ? (int) round($total * random_int(30, 70) / 100)
            : ($paymentCount > 1 ? (int) round($total / $paymentCount) : $total);

        if ($p === $paymentCount - 1 && $paymentCount > 1) {
            $alreadyPaid = Payment::where('transaction_id', $transaction->id)->sum('amount');
            $amount = max($total - $alreadyPaid, 0);
        }

        if ($amount <= 0) {
            return;
        }

        $status = random_int(0, 9) === 0 ? PaymentStatus::PENDING : PaymentStatus::CONFIRMED;
        $payDate = $date->copy()->addDays(random_int(1, 20));

        Payment::create([
            'transaction_id' => $transaction->id,
            'invoice_id' => $transaction->invoices()->value('id'),
            'payment_reference' => 'PAY-'.strtoupper(Str::random(8)),
            'payment_date' => $payDate->toDateString(),
            'amount' => $amount,
            'method' => collect([PaymentMethod::BANK_TRANSFER, PaymentMethod::CASH, PaymentMethod::MARKETPLACE])->random(),
            'status' => $status,
            'created_by' => $operator->id,
            'created_at' => $payDate,
            'updated_at' => $payDate,
        ]);
    }

    private function maybeCreateDelivery(Transaction $transaction, TransactionStatus $status, $date): void
    {
        $deliveryStages = [
            TransactionStatus::PREPARING_DELIVERY,
            TransactionStatus::IN_DELIVERY,
            TransactionStatus::DELIVERED,
            TransactionStatus::COMPLETED,
        ];

        if (! in_array($status, $deliveryStages, true)) {
            return;
        }

        $deliveryStatus = match ($status) {
            TransactionStatus::PREPARING_DELIVERY => DeliveryStatus::PREPARING,
            TransactionStatus::IN_DELIVERY => collect([DeliveryStatus::SHIPPED, DeliveryStatus::IN_TRANSIT])->random(),
            default => DeliveryStatus::DELIVERED,
        };

        $shipDate = $date->copy()->addDays(random_int(1, 5));
        $eta = $shipDate->copy()->addDays(random_int(2, 6));

        Delivery::create([
            'transaction_id' => $transaction->id,
            'delivery_number' => $this->nextDelivery($date->year),
            'courier' => collect(self::COURIERS)->random(),
            'tracking_number' => strtoupper(Str::random(2)).random_int(100000000, 999999999),
            'shipping_date' => $shipDate->toDateString(),
            'estimated_delivery_date' => $eta->toDateString(),
            'delivered_at' => $deliveryStatus === DeliveryStatus::DELIVERED ? $eta : null,
            'status' => $deliveryStatus,
            'recipient_name' => $transaction->customer->name,
            'created_at' => $shipDate,
            'updated_at' => $shipDate,
        ]);
    }

    private function maybeCreateDocuments(Transaction $transaction, User $operator, TransactionStatus $status, $date): void
    {
        if ($status === TransactionStatus::DRAFT) {
            return;
        }

        // The Finance file normally holds: invoice + resi + tanda terima, plus a
        // delivery order and payment proof as the transaction progresses. Most
        // transactions are complete; a realistic minority is missing one document
        // so the ketelitian/verification screens have genuine findings to show.
        $types = [DocumentType::INVOICE, DocumentType::RESI, DocumentType::TANDA_TERIMA];

        if (in_array($status, [TransactionStatus::PAID, TransactionStatus::PREPARING_DELIVERY, TransactionStatus::IN_DELIVERY, TransactionStatus::DELIVERED, TransactionStatus::COMPLETED], true)) {
            $types[] = DocumentType::PAYMENT_PROOF;
        }

        if (in_array($status, [TransactionStatus::IN_DELIVERY, TransactionStatus::DELIVERED, TransactionStatus::COMPLETED], true)) {
            $types[] = DocumentType::DELIVERY_ORDER;
        }

        // Randomly drop one document to exercise the missing-document path.
        // Kept rare (1 in 6) so most files are complete.
        if (random_int(0, 5) === 0 && count($types) > 1) {
            unset($types[array_rand($types)]);
            $types = array_values($types);
        }

        foreach ($types as $i => $type) {
            $this->createDocument($transaction, $operator, $type, $date->copy()->addDays($i + 1));
        }
    }

    /**
     * Attach the "supporting" document types to a spread of transactions, so the
     * Documents page has real content under every type tab (Receipt, Tax Invoice,
     * Purchase Order, Sales Order, Journal, BA, Other).
     */
    private function seedSupportingDocuments(User $operator): void
    {
        $transactions = Transaction::whereNotIn('status', [TransactionStatus::DRAFT])
            ->inRandomOrder()
            ->limit(40)
            ->get();

        // How many transactions get each supporting type. Keys are plain strings
        // (PHP arrays cannot use enum instances as keys).
        $plan = [
            DocumentType::RECEIPT->value => 26,
            DocumentType::TAX_INVOICE->value => 22,
            DocumentType::PURCHASE_ORDER->value => 18,
            DocumentType::SALES_ORDER->value => 16,
            DocumentType::JOURNAL->value => 14,
            DocumentType::BA->value => 10,
            DocumentType::OTHER->value => 8,
        ];

        foreach ($plan as $typeValue => $count) {
            $type = DocumentType::from($typeValue);
            $transactions->take($count)->each(function (Transaction $trx, int $i) use ($type, $operator) {
                // Vary status so the Documents page shows uploaded / verified / rejected.
                // Guard the date: the model may return a Carbon instance or a string.
                $base = $trx->transaction_date;
                $when = $base
                    ? \Illuminate\Support\Carbon::parse($base)->addDays(random_int(1, 12))
                    : now()->subDays(random_int(3, 60));

                $document = $this->createDocument($trx, $operator, $type, $when, $i % 13 === 0);

                if ($i % 4 === 0) {
                    $document->forceFill([
                        'status' => DocumentStatus::VERIFIED,
                        'verified_at' => $when,
                    ])->save();
                } elseif ($i % 7 === 0) {
                    $document->forceFill(['status' => DocumentStatus::UNDER_REVIEW])->save();
                }
            });
        }
    }

    private function createDocument(Transaction $transaction, User $operator, DocumentType $type, $when, bool $rejected = false): Document
    {
        $number = match ($type) {
            DocumentType::INVOICE => $transaction->invoices()->value('invoice_number'),
            DocumentType::PAYMENT_PROOF => 'PAY-'.strtoupper(Str::random(6)),
            DocumentType::DELIVERY_ORDER => $transaction->deliveries()->value('tracking_number') ?: 'DO-'.random_int(1000, 9999),
            DocumentType::RECEIPT => 'RCPT-'.random_int(10000, 99999),
            DocumentType::TAX_INVOICE => '010.'.random_int(100, 999).'-'.random_int(10, 99).'.'.random_int(10000000, 99999999),
            DocumentType::PURCHASE_ORDER => $transaction->purchase_order_number ?: 'PO-'.random_int(10000, 99999),
            DocumentType::SALES_ORDER => $transaction->sales_order_number ?: 'SO-'.random_int(10000, 99999),
            DocumentType::JOURNAL => 'JV-'.now()->format('Y').'-'.str_pad((string) random_int(1, 9999), 4, '0', STR_PAD_LEFT),
            DocumentType::BA => 'BA-'.str_pad((string) random_int(1, 999), 3, '0', STR_PAD_LEFT),
            default => strtoupper(Str::random(8)),
        };

        $filename = $this->placeholderFilename($type, $transaction->transaction_code);
        $path = $this->writePlaceholderFile($transaction, $type, $filename);

        $document = Document::create([
            'transaction_id' => $transaction->id,
            'document_type' => $type,
            'original_filename' => $filename,
            'stored_filename' => $filename,
            'file_path' => $path,
            'mime_type' => 'application/pdf',
            'file_size' => Storage::disk('local')->size($path),
            'document_number' => $number,
            'uploaded_by' => $operator->id,
            'status' => $rejected ? DocumentStatus::REJECTED : DocumentStatus::UPLOADED,
            'current_version' => 1,
            'created_at' => $when,
            'updated_at' => $when,
        ]);

        DocumentVersion::create([
            'document_id' => $document->id,
            'version' => 1,
            'original_filename' => $filename,
            'stored_filename' => $filename,
            'file_path' => $path,
            'mime_type' => 'application/pdf',
            'file_size' => $document->file_size,
            'uploaded_by' => $operator->id,
            'change_note' => 'Initial upload',
            'created_at' => $when,
            'updated_at' => $when,
        ]);

        return $document;
    }

    private function placeholderFilename(DocumentType $type, string $code): string
    {
        return strtolower($type->folder().'-'.$code.'.pdf');
    }

    /**
     * Write a tiny valid PDF so previews/downloads work in the demo.
     */
    private function writePlaceholderFile(Transaction $transaction, DocumentType $type, string $filename): string
    {
        $dir = "transactions/{$transaction->transaction_code}/{$type->folder()}";
        $path = "{$dir}/{$filename}";

        if (! Storage::disk('local')->exists($path)) {
            Storage::disk('local')->put($path, $this->minimalPdf($transaction->transaction_code, $type->label()));
        }

        return $path;
    }

    private function minimalPdf(string $code, string $label): string
    {
        // A genuinely valid, single-page PDF. The earlier version declared
        // `/Length` as the whole stream body and omitted the xref/trailer
        // bookkeeping, so strict viewers (Chrome's built-in one) refused to
        // render it and reported "Failed to load PDF document".
        $clean = static fn (string $s): string => str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $s);

        $title = $clean('SAKHA - '.$label);
        $reference = $clean($code);
        $stamp = $clean(now()->format('d M Y H:i'));

        // A little bit of layout so the placeholder reads like a real document.
        $stream = "BT\n"
            ."/F2 18 Tf 0.06 0.09 0.16 rg 72 720 Td ({$title}) Tj ET\n"
            ."BT\n/F1 11 Tf 0.35 0.40 0.48 rg 72 700 Td (Document reference: {$reference}) Tj ET\n"
            ."BT\n/F1 11 Tf 0.35 0.40 0.48 rg 72 684 Td (Generated: {$stamp}) Tj ET\n"
            ."0.90 0.92 0.95 RG 1 w 72 664 m 540 664 l S\n"
            ."BT\n/F1 12 Tf 0.15 0.18 0.24 rg 72 636 Td (This is a DEMO placeholder document generated by the) Tj ET\n"
            ."BT\n/F1 12 Tf 0.15 0.18 0.24 rg 72 618 Td (SAKHA prototype. It contains no company data.) Tj ET\n";

        $objects = [];
        $objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
        $objects[2] = "<< /Type /Pages /Kids [3 0 R] /Count 1 >>";
        $objects[3] = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
            ."/Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>";
        $objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
        $objects[5] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";
        $objects[6] = "<< /Length ".strlen($stream)." >>\nstream\n".$stream."endstream";

        // Serialise while recording each object's byte offset for the xref table.
        $pdf = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
        $offsets = [];
        foreach ($objects as $num => $body) {
            $offsets[$num] = strlen($pdf);
            $pdf .= "{$num} 0 obj\n{$body}\nendobj\n";
        }

        $xrefOffset = strlen($pdf);
        $count = count($objects) + 1; // +1 for the free object 0
        $pdf .= "xref\n0 {$count}\n";
        $pdf .= "0000000000 65535 f \n";
        for ($i = 1; $i <= count($objects); $i++) {
            $pdf .= str_pad((string) $offsets[$i], 10, '0', STR_PAD_LEFT)." 00000 n \n";
        }
        $pdf .= "trailer\n<< /Size {$count} /Root 1 0 R >>\n";
        $pdf .= "startxref\n{$xrefOffset}\n%%EOF";

        return $pdf;
    }

    private function baseTransaction(Customer $customer, User $operator, string $suffix, int $subtotal, int $daysAgo): Transaction
    {
        $date = now()->subDays($daysAgo)->startOfDay()->addHours(9);
        $tax = (int) round($subtotal * 0.11);

        return Transaction::create([
            'transaction_code' => "TRX-DEMO-{$suffix}",
            'customer_id' => $customer->id,
            'transaction_date' => $date->toDateString(),
            'status' => TransactionStatus::DRAFT,
            'reference_number' => "REF-DEMO-{$suffix}",
            'purchase_order_number' => 'PO-DEMO-'.$suffix,
            'sales_order_number' => 'SO-DEMO-'.$suffix,
            'subtotal' => $subtotal,
            'discount' => 0,
            'tax' => $tax,
            'total_amount' => $subtotal + $tax,
            'created_by' => $operator->id,
            'updated_by' => $operator->id,
            'created_at' => $date,
            'updated_at' => $date,
        ]);
    }

    private function createInvoiceFor(Transaction $transaction, User $operator, string $number, ?int $overrideAmount = null): Invoice
    {
        $date = $transaction->transaction_date;

        // Keep the invoice consistent with the transaction: amount + tax == total.
        // tax is the 11% portion already baked into the transaction total, so
        // amount = total - tax guarantees an exact match (no rounding drift).
        $tax = $overrideAmount === null
            ? (int) round(((int) $transaction->total_amount) * 0.11 / 1.11)
            : (int) round($overrideAmount * 0.11 / 1.11);

        $amount = $overrideAmount === null
            ? ((int) $transaction->total_amount) - $tax
            : $overrideAmount - $tax;

        return Invoice::create([
            'transaction_id' => $transaction->id,
            'invoice_number' => $number,
            'invoice_date' => $date->copy()->addDay()->toDateString(),
            'due_date' => $date->copy()->addDays(30)->toDateString(),
            'amount' => $amount,
            'tax_amount' => $tax,
            'status' => InvoiceStatus::ISSUED,
            'created_by' => $operator->id,
            'created_at' => $date,
            'updated_at' => $date,
        ]);
    }

    private function scenarioA_healthy(Customer $customer, User $operator, ?User $reviewer): void
    {
        $trx = $this->baseTransaction($customer, $operator, 'A-HEALTHY', 8000000, 40);
        $invoice = $this->createInvoiceFor($trx, $operator, 'INV-DEMO-A');
        $total = (int) $trx->total_amount;

        Payment::create([
            'transaction_id' => $trx->id, 'invoice_id' => $invoice->id,
            'payment_reference' => 'PAY-DEMO-A', 'payment_date' => $trx->transaction_date->copy()->addDays(3)->toDateString(),
            'amount' => $total, 'method' => PaymentMethod::BANK_TRANSFER, 'status' => PaymentStatus::CONFIRMED,
            'created_by' => $operator->id, 'created_at' => $trx->transaction_date->copy()->addDays(3),
        ]);

        Delivery::create([
            'transaction_id' => $trx->id, 'delivery_number' => 'DO-DEMO-A', 'courier' => 'JNE',
            'tracking_number' => 'JNE'.random_int(100000000, 999999999),
            'shipping_date' => $trx->transaction_date->copy()->addDays(2)->toDateString(),
            'estimated_delivery_date' => $trx->transaction_date->copy()->addDays(5)->toDateString(),
            'delivered_at' => $trx->transaction_date->copy()->addDays(5),
            'status' => DeliveryStatus::DELIVERED, 'recipient_name' => $customer->name,
            'created_at' => $trx->transaction_date->copy()->addDays(2),
        ]);

        foreach ([DocumentType::INVOICE, DocumentType::DELIVERY_ORDER, DocumentType::PAYMENT_PROOF] as $i => $type) {
            $doc = $this->createDocument($trx, $operator, $type, $trx->transaction_date->copy()->addDays($i + 1));
            if ($reviewer) {
                $doc->forceFill(['status' => DocumentStatus::VERIFIED, 'verified_at' => now(), 'verified_by' => $reviewer->id])->save();
            }
        }

        $trx->forceFill(['status' => TransactionStatus::COMPLETED])->save();
        $this->syncInvoicePaid($invoice);
        $this->logCreation($trx, $operator, $trx->transaction_date);
    }

    private function scenarioB_missingDocument(Customer $customer, User $operator): void
    {
        $trx = $this->baseTransaction($customer, $operator, 'B-MISSING-DOC', 6500000, 18);
        $invoice = $this->createInvoiceFor($trx, $operator, 'INV-DEMO-B');

        Payment::create([
            'transaction_id' => $trx->id, 'invoice_id' => $invoice->id,
            'payment_reference' => 'PAY-DEMO-B', 'payment_date' => $trx->transaction_date->copy()->addDays(2)->toDateString(),
            'amount' => (int) $trx->total_amount, 'method' => PaymentMethod::BANK_TRANSFER, 'status' => PaymentStatus::CONFIRMED,
            'created_by' => $operator->id, 'created_at' => $trx->transaction_date->copy()->addDays(2),
        ]);

        // Only invoice uploaded -> payment proof + DO missing on purpose.
        $this->createDocument($trx, $operator, DocumentType::INVOICE, $trx->transaction_date->copy()->addDay());

        $trx->forceFill(['status' => TransactionStatus::NEEDS_REVIEW])->save();
        $this->syncInvoicePaid($invoice);
        $this->logCreation($trx, $operator, $trx->transaction_date);
    }

    private function scenarioC_paymentMismatch(Customer $customer, User $operator): void
    {
        $trx = $this->baseTransaction($customer, $operator, 'C-PAYMENT-MISMATCH', 5000000, 25);
        $invoice = $this->createInvoiceFor($trx, $operator, 'INV-DEMO-C');

        // Overpayment: pay more than the total (unexplained).
        Payment::create([
            'transaction_id' => $trx->id, 'invoice_id' => $invoice->id,
            'payment_reference' => 'PAY-DEMO-C', 'payment_date' => $trx->transaction_date->copy()->addDays(2)->toDateString(),
            'amount' => (int) $trx->total_amount + 2000000, 'method' => PaymentMethod::BANK_TRANSFER, 'status' => PaymentStatus::CONFIRMED,
            'created_by' => $operator->id, 'created_at' => $trx->transaction_date->copy()->addDays(2),
        ]);

        $this->createDocument($trx, $operator, DocumentType::INVOICE, $trx->transaction_date->copy()->addDay());
        $this->createDocument($trx, $operator, DocumentType::PAYMENT_PROOF, $trx->transaction_date->copy()->addDays(2));

        $trx->forceFill(['status' => TransactionStatus::NEEDS_REVIEW])->save();
        $this->logCreation($trx, $operator, $trx->transaction_date);
    }

    private function scenarioD_partialPayment(Customer $customer, User $operator): void
    {
        $trx = $this->baseTransaction($customer, $operator, 'D-PARTIAL-PAYMENT', 10000000, 14);
        $invoice = $this->createInvoiceFor($trx, $operator, 'INV-DEMO-D');

        Payment::create([
            'transaction_id' => $trx->id, 'invoice_id' => $invoice->id,
            'payment_reference' => 'PAY-DEMO-D-1', 'payment_date' => $trx->transaction_date->copy()->addDays(2)->toDateString(),
            'amount' => 4000000, 'method' => PaymentMethod::BANK_TRANSFER, 'status' => PaymentStatus::CONFIRMED,
            'created_by' => $operator->id, 'created_at' => $trx->transaction_date->copy()->addDays(2),
        ]);

        $this->createDocument($trx, $operator, DocumentType::INVOICE, $trx->transaction_date->copy()->addDay());
        $this->createDocument($trx, $operator, DocumentType::PAYMENT_PROOF, $trx->transaction_date->copy()->addDays(2));

        $invoice->forceFill(['status' => InvoiceStatus::PARTIALLY_PAID])->save();
        $trx->forceFill(['status' => TransactionStatus::AWAITING_PAYMENT])->save();
        $this->logCreation($trx, $operator, $trx->transaction_date);
    }

    private function scenarioE_overdueInvoice(Customer $customer, User $operator): void
    {
        $trx = $this->baseTransaction($customer, $operator, 'E-OVERDUE', 7200000, 60);
        // Due date far in the past, still unpaid.
        $invoice = $this->createInvoiceFor($trx, $operator, 'INV-DEMO-E');
        $invoice->forceFill([
            'invoice_date' => now()->subDays(60)->toDateString(),
            'due_date' => now()->subDays(30)->toDateString(),
            'status' => InvoiceStatus::OVERDUE,
        ])->save();

        $this->createDocument($trx, $operator, DocumentType::INVOICE, now()->subDays(59));

        $trx->forceFill(['status' => TransactionStatus::AWAITING_PAYMENT])->save();
        $this->logCreation($trx, $operator, $trx->transaction_date);
    }

    private function scenarioF_delayedDelivery(Customer $customer, User $operator): void
    {
        $trx = $this->baseTransaction($customer, $operator, 'F-DELAYED', 4300000, 22);
        $invoice = $this->createInvoiceFor($trx, $operator, 'INV-DEMO-F');

        Payment::create([
            'transaction_id' => $trx->id, 'invoice_id' => $invoice->id,
            'payment_reference' => 'PAY-DEMO-F', 'payment_date' => $trx->transaction_date->copy()->addDays(2)->toDateString(),
            'amount' => (int) $trx->total_amount, 'method' => PaymentMethod::MARKETPLACE, 'status' => PaymentStatus::CONFIRMED,
            'created_by' => $operator->id, 'created_at' => $trx->transaction_date->copy()->addDays(2),
        ]);

        Delivery::create([
            'transaction_id' => $trx->id, 'delivery_number' => 'DO-DEMO-F', 'courier' => 'SiCepat',
            'tracking_number' => 'SC'.random_int(100000000, 999999999),
            'shipping_date' => now()->subDays(18)->toDateString(),
            'estimated_delivery_date' => now()->subDays(6)->toDateString(),
            'status' => DeliveryStatus::IN_TRANSIT, 'recipient_name' => $customer->name,
            'notes' => 'Menunggu konfirmasi ekspedisi.', 'created_at' => now()->subDays(18),
        ]);

        foreach ([DocumentType::INVOICE, DocumentType::DELIVERY_ORDER, DocumentType::PAYMENT_PROOF] as $i => $type) {
            $this->createDocument($trx, $operator, $type, now()->subDays(20 - $i));
        }

        $this->syncInvoicePaid($invoice);
        $trx->forceFill(['status' => TransactionStatus::IN_DELIVERY])->save();
        $this->logCreation($trx, $operator, $trx->transaction_date);
    }

    private function scenarioG_duplicateInvoice(Customer $customer, User $operator): void
    {
        $trx = $this->baseTransaction($customer, $operator, 'G-DUPLICATE', 3300000, 12);
        $invoice = $this->createInvoiceFor($trx, $operator, 'INV-DEMO-G');

        // Same document number uploaded twice -> duplicate detection.
        $doc1 = $this->createDocument($trx, $operator, DocumentType::INVOICE, now()->subDays(11));
        $doc2 = $this->createDocument($trx, $operator, DocumentType::INVOICE, now()->subDays(10));
        $doc1->forceFill(['document_number' => 'INV-DEMO-G'])->save();
        $doc2->forceFill(['document_number' => 'INV-DEMO-G'])->save();

        $this->createDocument($trx, $operator, DocumentType::PAYMENT_PROOF, now()->subDays(10));

        $trx->forceFill(['status' => TransactionStatus::AWAITING_PAYMENT])->save();
        $this->logCreation($trx, $operator, $trx->transaction_date);
    }

    private function syncDerivedStatus(Transaction $transaction, TransactionStatus $target): void
    {
        $transaction->refresh();
        $transaction->load('payments', 'deliveries', 'invoices');
        $invoice = $transaction->invoices->first();

        $final = match ($target) {
            TransactionStatus::DRAFT => TransactionStatus::DRAFT,
            TransactionStatus::PROCESSING => TransactionStatus::PROCESSING,
            TransactionStatus::AWAITING_PAYMENT => $transaction->isFullyPaid() ? TransactionStatus::PAID : TransactionStatus::AWAITING_PAYMENT,
            TransactionStatus::PAID => $transaction->isFullyPaid() ? TransactionStatus::PAID : TransactionStatus::AWAITING_PAYMENT,
            TransactionStatus::PREPARING_DELIVERY => TransactionStatus::PREPARING_DELIVERY,
            TransactionStatus::IN_DELIVERY => TransactionStatus::IN_DELIVERY,
            TransactionStatus::DELIVERED => TransactionStatus::DELIVERED,
            TransactionStatus::COMPLETED => TransactionStatus::COMPLETED,
            TransactionStatus::NEEDS_REVIEW => TransactionStatus::NEEDS_REVIEW,
            TransactionStatus::CANCELLED => TransactionStatus::CANCELLED,
        };

        $transaction->forceFill(['status' => $final])->save();

        if ($invoice) {
            $paid = $transaction->confirmedPaidAmount();
            $status = match (true) {
                bccomp($paid, '0', 2) === 0 => $invoice->isOverdue() ? InvoiceStatus::OVERDUE : InvoiceStatus::ISSUED,
                bccomp($paid, (string) $invoice->amount, 2) >= 0 => InvoiceStatus::PAID,
                default => InvoiceStatus::PARTIALLY_PAID,
            };
            $invoice->forceFill(['status' => $status])->save();
        }
    }

    private function syncInvoicePaid(Invoice $invoice): void
    {
        if (bccomp($invoice->confirmedPaidAmount(), (string) $invoice->amount, 2) >= 0) {
            $invoice->forceFill(['status' => InvoiceStatus::PAID])->save();
        }
    }

    private function randomWeightedStatus(int $index): TransactionStatus
    {
        $pool = [
            TransactionStatus::DRAFT,
            TransactionStatus::PROCESSING,
            TransactionStatus::AWAITING_PAYMENT,
            TransactionStatus::AWAITING_PAYMENT,
            TransactionStatus::PAID,
            TransactionStatus::PAID,
            TransactionStatus::PREPARING_DELIVERY,
            TransactionStatus::IN_DELIVERY,
            TransactionStatus::DELIVERED,
            TransactionStatus::COMPLETED,
            TransactionStatus::COMPLETED,
            TransactionStatus::COMPLETED,
            TransactionStatus::NEEDS_REVIEW,
        ];

        return $pool[($index * 7 + 3) % count($pool)];
    }

    private function nextCode(int $year): string
    {
        return 'TRX-'.$year.'-'.str_pad((string) $this->codeCounter++, 5, '0', STR_PAD_LEFT);
    }

    private function nextInvoice(int $year): string
    {
        return 'INV-'.$year.'-'.str_pad((string) $this->invoiceCounter++, 5, '0', STR_PAD_LEFT);
    }

    private function nextDelivery(int $year): string
    {
        return 'DO-'.$year.'-'.str_pad((string) $this->deliveryCounter++, 5, '0', STR_PAD_LEFT);
    }

    private function logCreation(Transaction $transaction, User $operator, $when): void
    {
        ActivityLog::create([
            'user_id' => $operator->id,
            'entity_type' => 'transaction',
            'entity_id' => $transaction->id,
            'action' => 'transaction.created',
            'description' => "Transaction {$transaction->transaction_code} created",
            'metadata' => ['total_amount' => (string) $transaction->total_amount],
            'created_at' => $when,
            'updated_at' => $when,
        ]);
    }

    private function seedNotifications(?User $admin, ?User $reviewer): void
    {
        $targets = array_filter([$admin, $reviewer]);

        foreach ($targets as $user) {
            AppNotification::create([
                'user_id' => $user->id,
                'type' => 'document_missing',
                'severity' => 'HIGH',
                'title' => 'Dokumen wajib belum lengkap',
                'message' => 'TRX-DEMO-B-MISSING-DOC belum melengkapi dokumen wajib.',
                'entity_type' => 'transaction',
                'entity_id' => Transaction::where('transaction_code', 'TRX-DEMO-B-MISSING-DOC')->value('id'),
            ]);
            AppNotification::create([
                'user_id' => $user->id,
                'type' => 'payment_overdue',
                'severity' => 'HIGH',
                'title' => 'Invoice jatuh tempo',
                'message' => 'Invoice TRX-DEMO-E-OVERDUE telah melewati tanggal jatuh tempo.',
                'entity_type' => 'transaction',
                'entity_id' => Transaction::where('transaction_code', 'TRX-DEMO-E-OVERDUE')->value('id'),
            ]);
            AppNotification::create([
                'user_id' => $user->id,
                'type' => 'delivery_delayed',
                'severity' => 'MEDIUM',
                'title' => 'Pengiriman terlambat',
                'message' => 'Pengiriman TRX-DEMO-F-DELAYED melewati perkiraan tanggal tiba.',
                'entity_type' => 'transaction',
                'entity_id' => Transaction::where('transaction_code', 'TRX-DEMO-F-DELAYED')->value('id'),
            ]);
        }
    }
}
