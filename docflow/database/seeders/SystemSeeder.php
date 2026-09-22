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
        // Default required documents follow the operational workflow observed in PKL:
        // invoice + delivery order + payment proof are mandatory; others optional.
        $defaults = [
            DocumentType::INVOICE->value => true,
            DocumentType::DELIVERY_ORDER->value => true,
            DocumentType::PAYMENT_PROOF->value => true,
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

        SystemSetting::put('company_display_name', 'DOCFLOW Demo', 'string', 'Company display name');
        SystemSetting::put('default_currency', 'IDR', 'string', 'Default currency');
        SystemSetting::put('verification_auto_review_threshold', 1, 'int', 'Failed checks that force NEEDS_REVIEW');
    }
}
