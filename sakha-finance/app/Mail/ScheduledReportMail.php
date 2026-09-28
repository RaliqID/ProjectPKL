<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Scheduled report email.
 *
 * Carries a short plain-language summary and attaches the generated PDF. The
 * recipient is an administrator (the report is a staff-level artifact).
 */
class ScheduledReportMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * @param  array<string, string>  $summary  Label => value pairs shown in the body.
     */
    public function __construct(
        public string $reportTitle,
        public string $periodLabel,
        public array $summary,
        public string $pdfBytes,
        public string $pdfFilename,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Laporan {$this->reportTitle} — {$this->periodLabel}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.scheduled-report',
            with: [
                'reportTitle' => $this->reportTitle,
                'periodLabel' => $this->periodLabel,
                'summary' => $this->summary,
            ],
        );
    }

    /**
     * @return array<int, Attachment>
     */
    public function attachments(): array
    {
        return [
            Attachment::fromData(fn () => $this->pdfBytes, $this->pdfFilename)
                ->withMime('application/pdf'),
        ];
    }
}
