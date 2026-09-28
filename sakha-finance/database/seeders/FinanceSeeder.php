<?php

namespace Database\Seeders;

use App\Enums\DocumentType;
use App\Models\Archive;
use App\Models\Customer;
use App\Models\Document;
use App\Models\Expense;
use App\Models\Procurement;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

/**
 * Seeds the Finance-specific modules added on top of the core workflow:
 * Arsip (archive), Pengeluaran (expenses / claim bensin) and Pengadaan
 * (procurement + SPB).
 *
 * All values are fictional. Amounts, plate numbers and SPBU codes follow
 * Indonesian formats so the demo reads realistically without using any real
 * company or personal data.
 */
class FinanceSeeder extends Seeder
{
    public function run(): void
    {
        $operator = User::where('email', 'operator@sakha.test')->first();
        $admin = User::where('email', 'admin@sakha.test')->first();

        if (! $operator) {
            $this->command->warn('Run UserSeeder first.');
            return;
        }

        $this->seedArchives($operator);
        $this->seedExpenses($operator);
        $this->seedProcurements($operator);
        $this->seedFinanceNotifications($operator);
    }

    /** A couple of curated notifications so the bell is not empty on first login. */
    private function seedFinanceNotifications(User $operator): void
    {
        $admin = \App\Models\User::where('email', 'admin@sakha.test')->first();
        if (! $admin) {
            return;
        }

        $expense = Expense::query()->where('status', 'SUBMITTED')->latest('id')->first();
        $procurement = Procurement::query()->where('status', 'REQUESTED')->latest('id')->first();

        if ($expense) {
            $this->notifyUsers(
                'expense_submitted',
                'LOW',
                'Pengeluaran diajukan',
                "Pengeluaran {$expense->expense_code} sebesar Rp ".number_format((float) $expense->amount, 0, ',', '.').' menunggu persetujuan.',
            );
        }

        if ($procurement) {
            $this->notifyUsers(
                'procurement_created',
                'LOW',
                'Pengadaan dicatat',
                "Pengadaan {$procurement->procurement_code} — {$procurement->item_name} menunggu diproses.",
            );
        }
    }

    private function notifyUsers(string $type, string $severity, string $title, string $message): void
    {
        \App\Models\User::query()->where('is_active', true)->get()->each(function (User $user) use ($type, $severity, $title, $message) {
            \App\Models\AppNotification::create([
                'user_id' => $user->id,
                'type' => $type,
                'severity' => $severity,
                'title' => $title,
                'message' => $message,
                'entity_type' => null,
                'entity_id' => null,
            ]);
        });
    }

    /**
     * Build archive entries from already-seeded documents, spread over their
     * own dates so the year/month tree has more than one bucket.
     */
    private function seedArchives(User $operator): void
    {
        if (Archive::query()->exists()) {
            return;
        }

        $documents = Document::query()
            ->with('transaction.customer')
            ->whereNotNull('transaction_id')
            ->inRandomOrder()
            ->limit(120)
            ->get();

        $seq = 1;

        foreach ($documents as $document) {
            $date = $document->created_at ?? now();
            /** @var DocumentType $type */
            $type = $document->document_type;

            Archive::create([
                'archive_code' => 'ARS-'.str_pad((string) $seq, 6, '0', STR_PAD_LEFT),
                'document_id' => $document->id,
                'transaction_id' => $document->transaction_id,
                'customer_id' => $document->transaction?->customer_id,
                'document_type' => $type,
                'document_name' => $document->original_filename,
                'document_number' => $document->document_number,
                'file_name' => $document->stored_filename,
                'document_date' => $date,
                'period_year' => (int) $date->format('Y'),
                'period_month' => (int) $date->format('n'),
                'archive_location' => $this->locationFor($type, $date),
                'status' => 'STORED',
                'archived_by' => $operator->id,
            ]);

            $seq++;
        }
    }

    private function locationFor(DocumentType $type, Carbon $date): string
    {
        // Mirrors the physical filing convention: Bantex grouped by letter range,
        // then year, then month.
        $bantex = match ($type) {
            DocumentType::INVOICE, DocumentType::EFAKTUR, DocumentType::PURCHASE_INVOICE => 'Bantex A–L',
            DocumentType::RESI, DocumentType::TANDA_TERIMA, DocumentType::DELIVERY_ORDER, DocumentType::SURAT_JALAN => 'RESI PENGIRIMAN',
            DocumentType::JOURNAL => 'Scan Jurnal',
            DocumentType::BA => 'Bantex BA',
            default => 'Bantex M–Z',
        };

        return $bantex.' / '.$date->format('Y').' / '.$date->format('m');
    }

    /** Claim bensin and a few other operational expenses. */
    private function seedExpenses(User $operator): void
    {
        if (Expense::query()->exists()) {
            return;
        }

        $vehicles = ['B 1234 XYZ', 'B 5678 ABC', 'D 9012 DEF', 'L 3456 GHI'];
        $stations = ['SPBU 34.123.01', 'SPBU 31.125.02', 'SPBU 34.412.05', 'SPBU 35.161.03'];
        $fuels = ['Pertalite', 'Pertamax', 'Pertamax Turbo', 'Solar'];
        $statuses = ['DRAFT', 'SUBMITTED', 'APPROVED', 'APPROVED', 'PAID', 'REJECTED'];

        for ($i = 0; $i < 40; $i++) {
            $date = now()->subDays(random_int(1, 170))->startOfDay();
            $amount = random_int(8, 45) * 25000;

            Expense::create([
                'expense_code' => 'EXP-'.$date->format('Y').'-'.str_pad((string) ($i + 1), 4, '0', STR_PAD_LEFT),
                'category' => random_int(0, 6) === 0 ? 'TOLL' : 'FUEL',
                'expense_date' => $date,
                'vehicle' => $vehicles[array_rand($vehicles)],
                'odometer_km' => random_int(12000, 98000),
                'station' => $stations[array_rand($stations)],
                'fuel_type' => $fuels[array_rand($fuels)],
                'amount' => $amount,
                'proof_reference' => 'NOTA-'.random_int(10000, 99999),
                'status' => $statuses[array_rand($statuses)],
                'recorded_by' => $operator->id,
            ]);
        }
    }

    /** Lightweight procurement records doubling as the SPB register. */
    private function seedProcurements(User $operator): void
    {
        if (Procurement::query()->exists()) {
            return;
        }

        $items = [
            ['Kertas A4 80gsm', 'Tokopedia', 'rim', 55000],
            ['Tinta Printer Canon', 'Shopee', 'unit', 145000],
            ['Ordner Bantex Folio', 'Tokopedia', 'pcs', 38000],
            ['Amplop Coklat Folio', 'Marketplace', 'box', 27000],
            ['Lem Kertas Stick', 'Shopee', 'pcs', 12000],
            ['Map Plastik L', 'Tokopedia', 'pcs', 15000],
            ['Toner HP 107A', 'Marketplace', 'unit', 320000],
            ['Buku Besar Folio', 'Shopee', 'unit', 42000],
            ['Staples Kenko No.10', 'Marketplace', 'box', 9000],
            ['Label Stiker No.103', 'Tokopedia', 'box', 18000],
        ];

        $statuses = ['REQUESTED', 'ORDERED', 'SHIPPED', 'RECEIVED', 'RECEIVED', 'CANCELLED'];
        $divisions = ['Finance', 'Admin', 'Operasional', 'Gudang'];

        for ($i = 0; $i < 28; $i++) {
            [$name, $supplier, $unit, $unitPrice] = $items[array_rand($items)];
            $qty = random_int(1, 12);
            $date = now()->subDays(random_int(1, 170))->startOfDay();

            Procurement::create([
                'procurement_code' => 'PRC-'.$date->format('Y').'-'.str_pad((string) ($i + 1), 4, '0', STR_PAD_LEFT),
                'spb_number' => 'SPB-'.$date->format('Y').'-'.str_pad((string) ($i + 1), 4, '0', STR_PAD_LEFT),
                'request_date' => $date,
                'item_name' => $name,
                'supplier' => $supplier,
                'unit_price' => $unitPrice,
                'quantity' => $qty,
                'unit' => $unit,
                'division' => $divisions[array_rand($divisions)],
                'purpose' => 'Kebutuhan operasional '.$divisions[array_rand($divisions)],
                'total_amount' => $unitPrice * $qty,
                'tracking_number' => 'JNE-'.random_int(100000, 999999),
                'status' => $statuses[array_rand($statuses)],
                'created_by' => $operator->id,
            ]);
        }
    }
}
