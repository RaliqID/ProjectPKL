<?php

namespace Database\Seeders;

use App\Enums\DocumentType;
use App\Models\RequiredDocumentRule;
use App\Models\SystemSetting;
use Illuminate\Database\Seeder;

class SystemSeeder extends Seeder
{
    public function run(): void
    {
        // Default required documents follow the Finance workflow observed in PKL:
        // the core file is invoice + resi + tanda terima. A delivery order is
        // only relevant once the goods actually ship, so it is NOT required by
        // default (the stage-aware rule engine handles it where applicable).
        // The rest are optional.
        $defaults = [
            DocumentType::INVOICE->value => true,
            DocumentType::RESI->value => true,
            DocumentType::TANDA_TERIMA->value => true,
            DocumentType::DELIVERY_ORDER->value => false,
            DocumentType::SURAT_JALAN->value => false,
            DocumentType::PAYMENT_PROOF->value => false,
            DocumentType::EFAKTUR->value => false,
            DocumentType::PURCHASE_INVOICE->value => false,
            DocumentType::RECEIPT->value => false,
            DocumentType::TAX_INVOICE->value => false,
            DocumentType::PURCHASE_ORDER->value => false,
            DocumentType::SALES_ORDER->value => false,
            DocumentType::JOURNAL->value => false,
            DocumentType::BA->value => false,
            DocumentType::OTHER->value => false,
        ];

        foreach ($defaults as $type => $required) {
            RequiredDocumentRule::updateOrCreate(
                ['document_type' => $type],
                ['is_required' => $required, 'is_active' => true, 'description' => null],
            );
        }

        SystemSetting::put('company_display_name', 'PT. Sakha Internasional — Finance', 'string', 'Company display name');
        SystemSetting::put('default_currency', 'IDR', 'string', 'Default currency');
        SystemSetting::put('verification_auto_review_threshold', 1, 'int', 'Failed checks that force NEEDS_REVIEW');
    }
}
