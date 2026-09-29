import { useState } from 'react'
import {
  Archive,
  ClipboardCheck,
  Download,
  FileDown,
  FileSpreadsheet,
  FileText,
  Fuel,
  Mail,
  Receipt,
  ShoppingCart,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { api, downloadFile } from '@/lib/api'
import { useToast } from '@/lib/toast'
import { useAuth } from '@/lib/auth'

/**
 * Laporan — one place for every export.
 *
 * Each report card offers the three delivery channels in one row: PDF (server
 * rendered, branded), CSV (raw data for spreadsheets) and Email (PDF to the
 * signed-in user's inbox). Having them side by side means an operator does not
 * have to remember which module hides which button.
 */

interface ReportDef {
  /** Report type, also the API path segment: /api/reports/{key}/{format}. */
  key: string
  title: string
  description: string
  icon: typeof Receipt
}

const REPORTS: ReportDef[] = [
  {
    key: 'transactions',
    title: 'Transaksi',
    description: 'Daftar transaksi beserta status dan nilainya.',
    icon: Receipt,
  },
  {
    key: 'invoices',
    title: 'Invoice',
    description: 'Invoice dengan jatuh tempo dan status pembayaran.',
    icon: FileText,
  },
  {
    key: 'archives',
    title: 'Arsip Dokumen',
    description: 'Dokumen tersimpan per jenis, pelanggan, dan lokasi arsip.',
    icon: Archive,
  },
  {
    key: 'expenses',
    title: 'Pengeluaran',
    description: 'Pengeluaran operasional termasuk klaim bensin (BBM).',
    icon: Fuel,
  },
  {
    key: 'procurements',
    title: 'Pengadaan & SPB',
    description: 'Catatan pengadaan barang dan Buku SPB.',
    icon: ShoppingCart,
  },
  {
    key: 'ketelitian',
    title: 'Pemeriksaan Ketelitian',
    description: 'Hasil pemeriksaan ketelitian data transaksi & invoice.',
    icon: ClipboardCheck,
  },
]

export function ReportsPage() {
  const toast = useToast()
  const { user } = useAuth()
  const [busy, setBusy] = useState<string | null>(null)

  async function run(report: ReportDef, kind: 'pdf' | 'excel' | 'csv' | 'email') {
    const id = `${report.key}:${kind}`
    setBusy(id)
    try {
      if (kind === 'email') {
        const res = await api.post<{ message: string }>('/api/reports/email', { type: report.key })
        toast.success(res.message)
      } else {
        const ext = kind === 'excel' ? 'xlsx' : kind
        await downloadFile(`/api/reports/${report.key}/${kind}`, `laporan-${report.key}.${ext}`)
        toast.success(`Laporan ${report.title} (${ext.toUpperCase()}) diunduh.`)
      }
    } catch (err) {
      toast.error('Gagal memproses laporan.', err instanceof Error ? err.message : undefined)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div>
      <PageHeader
        title="Laporan"
        description="Unduh atau kirim laporan Finance. Setiap laporan tersedia dalam PDF (siap cetak) dan CSV (untuk diolah)."
      />

      <div className="p-6 lg:p-8">
        <div className="df-card mb-6 flex items-start gap-3 p-4">
          <Mail className="mt-0.5 h-4 w-4 shrink-0 text-accent-600" aria-hidden />
          <p className="text-xs leading-relaxed text-ink-600">
            Tombol <strong>Email</strong> mengirim laporan PDF ke <strong>{user?.email}</strong>. Email
            otomatis terjadwal juga aktif (harian, mingguan, bulanan) untuk administrator.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {REPORTS.map((report) => {
            const Icon = report.icon
            return (
              <div key={report.key} className="df-card flex flex-col p-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent-50 text-accent-600">
                    <Icon className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-ink-900">{report.title}</h3>
                    <p className="mt-0.5 text-xs text-ink-500">{report.description}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 pt-4 border-t border-ink-100">
                  <Button
                    variant="secondary"
                    className="px-2.5 py-1.5 text-xs"
                    disabled={busy !== null}
                    onClick={() => run(report, 'excel')}
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    {busy === `${report.key}:excel` ? 'Menyiapkan…' : 'Excel'}
                  </Button>
                  <Button
                    variant="secondary"
                    className="px-2.5 py-1.5 text-xs"
                    disabled={busy !== null}
                    onClick={() => run(report, 'pdf')}
                  >
                    <FileDown className="h-3.5 w-3.5" />
                    {busy === `${report.key}:pdf` ? 'Menyiapkan…' : 'PDF'}
                  </Button>
                  <Button
                    variant="secondary"
                    className="px-2.5 py-1.5 text-xs"
                    disabled={busy !== null}
                    onClick={() => run(report, 'csv')}
                  >
                    <Download className="h-3.5 w-3.5" />
                    {busy === `${report.key}:csv` ? 'Menyiapkan…' : 'CSV'}
                  </Button>
                  <Button
                    variant="secondary"
                    className="px-2.5 py-1.5 text-xs"
                    disabled={busy !== null}
                    onClick={() => run(report, 'email')}
                  >
                    <Mail className="h-3.5 w-3.5" />
                    {busy === `${report.key}:email` ? 'Mengirim…' : 'Email'}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
