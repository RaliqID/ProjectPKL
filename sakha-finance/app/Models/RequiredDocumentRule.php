<?php

namespace App\Models;

use App\Enums\DocumentType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RequiredDocumentRule extends Model
{
    use HasFactory;

    protected $fillable = [
        'document_type',
        'is_required',
        'is_active',
        'description',
    ];

    protected function casts(): array
    {
        return [
            'document_type' => DocumentType::class,
            'is_required' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    /**
     * The active required document types used by the verification engine.
     *
     * @return array<string>
     */
    public static function requiredTypes(): array
    {
        return static::query()
            ->where('is_active', true)
            ->where('is_required', true)
            ->get()
            ->map(fn (self $rule) => $rule->document_type->value)
            ->all();
    }

    /**
     * All active required rules keyed by document type (includes optional ones).
     *
     * @return array<string, bool>
     */
    public static function activeFlagMap(): array
    {
        return static::query()
            ->where('is_active', true)
            ->get()
            ->mapWithKeys(fn (self $rule) => [$rule->document_type->value => $rule->is_required])
            ->all();
    }
}
