<?php

namespace App\Console\Commands;

use App\Jobs\SendScheduledReport;
use Illuminate\Console\Command;

/**
 * Manually dispatch the scheduled report email.
 *
 * The scheduler runs this automatically (see bootstrap/app.php); this command
 * exists so an operator can trigger a send on demand or verify the pipeline,
 * e.g. `php artisan sakha:send-report monthly --sync`.
 */
class SendScheduledReportCommand extends Command
{
    protected $signature = 'sakha:send-report {frequency=monthly : daily|weekly|monthly} {--sync : Send immediately instead of queueing}';

    protected $description = 'Kirim laporan Finance (PDF) ke administrator melalui email.';

    public function handle(): int
    {
        $frequency = $this->argument('frequency');

        if (! in_array($frequency, ['daily', 'weekly', 'monthly'], true)) {
            $this->error('Frekuensi harus salah satu dari: daily, weekly, monthly.');

            return self::FAILURE;
        }

        $job = new SendScheduledReport($frequency);

        if ($this->option('sync')) {
            $this->info("Mengirim laporan {$frequency} sekarang...");
            dispatch_sync($job);
            $this->info('Selesai. Periksa kotak masuk email.');
        } else {
            dispatch($job);
            $this->info("Laporan {$frequency} masuk ke antrean. Jalankan worker bila belum aktif.");
        }

        return self::SUCCESS;
    }
}
