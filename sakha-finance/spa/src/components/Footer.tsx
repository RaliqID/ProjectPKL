import { Logo } from '@/components/Logo'

/**
 * Application footer, shown at the bottom of both the landing page and the
 * in-app pages.
 *
 * Carries the project attribution (author + institution) and the honest
 * disclaimer that this is a prototype using fictional data. Keeping it in one
 * component means the attribution is identical everywhere it appears.
 */
export function Footer({ variant = 'landing' }: { variant?: 'landing' | 'app' }) {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-ink-200 bg-ink-50">
      <div
        className={
          'mx-auto flex max-w-6xl flex-col gap-6 px-5 py-8 lg:flex-row lg:items-start lg:justify-between lg:px-8 ' +
          (variant === 'app' ? 'max-w-none' : '')
        }
      >
        <div className="max-w-md">
          <Logo size="sm" withTagline />
          <p className="mt-3 text-xs leading-relaxed text-ink-500">
            Sistem Informasi Pengelolaan Data dan Dokumen Finance — prototype pengembangan
            berdasarkan kegiatan PKL di PT. Sakha Internasional.
          </p>
        </div>

        <div className="flex flex-col gap-1 lg:items-end lg:text-right">
          <p className="text-xs text-ink-500">
            Dikembangkan oleh <span className="font-semibold text-ink-800">Raliq Hidayat</span>
          </p>
          <p className="text-2xs text-ink-400">
            © {year} Raliq Hidayat · SAKHA Finance Operations
          </p>
          <p className="text-2xs text-ink-400">
            Bukan sistem produksi resmi. Seluruh data bersifat contoh (fiktif).
          </p>
        </div>
      </div>
    </footer>
  )
}
