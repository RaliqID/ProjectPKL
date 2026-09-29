import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Archive,
  BadgeCheck,
  ClipboardCheck,
  FileText,
  Menu,
  PackageSearch,
  Receipt,
  Truck,
  Wallet,
  X,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { Reveal, MaskedReveal } from '@/components/Reveal'
import { Logo } from '@/components/Logo'
import { Footer as AppFooter } from '@/components/Footer'
import { ThemeToggle } from '@/components/ThemeToggle'
import { AnimatedGrid } from '@/components/AnimatedGrid'

/*
 * Landing page.
 *
 * Tone: an introduction to an internal Finance operations system, not a
 * product marketing page. It states what the system manages, shows the
 * document flow it follows, and lists the modules — the same information a
 * colleague would need before being given access. No pricing, no testimonials,
 * no "trusted by" claims, because none of that is true of an internship
 * prototype.
 *
 * Layout relies on hairline rules and a numbered register rather than a grid of
 * identical icon cards, which keeps it dense and closer to how the system reads.
 */

/* ---------------------------------------------------------------- Nav ---- */

function LandingNav() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const links = [
    { href: '#alur', label: 'Alur Kerja' },
    { href: '#modul', label: 'Modul' },
    { href: '#arsip', label: 'Arsip & Verifikasi' },
  ]

  return (
    <header
      className={
        'sticky top-0 z-40 transition-colors ' +
        (scrolled
          ? 'border-b border-ink-200 bg-white/95 backdrop-blur-sm'
          : 'border-b border-transparent bg-transparent')
      }
    >
      <div className="mx-auto flex h-[4.5rem] max-w-6xl items-center justify-between px-5 lg:px-8">
        <Logo to="/" size="md" withTagline />

        <nav className="hidden items-center gap-8 md:flex" aria-label="Bagian halaman">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-sm text-ink-600 transition-colors hover:text-ink-900">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          {user ? (
            <Link to="/app" className="df-btn-primary">
              Buka Sistem
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <Link to="/login" className="df-btn-primary">
              Masuk ke Sistem
            </Link>
          )}
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            className="rounded-md p-2 text-ink-600 hover:bg-ink-100"
            onClick={() => setOpen((v) => !v)}
            aria-label="Buka menu"
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-ink-200 bg-white px-5 py-4 md:hidden">
          <nav className="flex flex-col gap-3" aria-label="Bagian halaman">
            {links.map((l) => (
              <a key={l.href} href={l.href} className="text-sm text-ink-700" onClick={() => setOpen(false)}>
                {l.label}
              </a>
            ))}
          </nav>
          <div className="mt-4">
            <Link to="/login" className="df-btn-primary w-full">
              Masuk ke Sistem
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  )
}

/* --------------------------------------------------------------- Hero ---- */

function Hero() {
  const [hoverGrid, setHoverGrid] = useState(false)

  return (
    <section
      className="relative overflow-hidden border-b border-ink-200 bg-[var(--df-surface)]"
      onMouseEnter={() => setHoverGrid(true)}
      onMouseLeave={() => setHoverGrid(false)}
    >
      <AnimatedGrid active={hoverGrid} />
      <div className="relative mx-auto grid max-w-6xl grid-cols-1 gap-x-16 gap-y-12 px-5 py-16 lg:grid-cols-12 lg:px-8 lg:py-24">
        <div className="lg:col-span-7">
          <p className="df-section-label animate-[fade-in_500ms_ease-out_both]">Sistem Informasi Finance</p>
          <MaskedReveal delay={120}>
            <h1 className="df-display-1 mt-5 text-balance">
              Satu alur kerja untuk data Finance yang lebih tertata.
            </h1>
          </MaskedReveal>
          <p className="mt-5 max-w-xl animate-[slide-up_600ms_ease-out_300ms_both] text-base leading-relaxed text-ink-600">
            Sistem informasi untuk membantu pengelolaan invoice, pembayaran, dokumen, pengiriman, dan aktivitas
            administrasi Finance.
          </p>

          <div className="mt-8 flex animate-[slide-up_600ms_ease-out_420ms_both] flex-wrap items-center gap-3">
            <Link to="/login" className="df-btn-primary group px-5 py-2.5 text-sm">
              Masuk ke Sistem
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
            <a href="#alur" className="df-btn-secondary px-5 py-2.5 text-sm">
              Lihat Alur Kerja
            </a>
          </div>

          <p className="mt-6 animate-[slide-up_600ms_ease-out_540ms_both] text-xs text-ink-400">
            Prototype pengembangan berdasarkan kegiatan PKL di PT. Sakha Internasional. Bukan sistem produksi resmi
            perusahaan dan tidak memuat data perusahaan.
          </p>
        </div>

        {/* Alur ringkas sebagai kartu "dokumen" */}
        <Reveal from="right" delay={200} className="lg:col-span-5">
          <div className="df-card overflow-hidden transition-shadow duration-300 hover:shadow-lift">
            <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-500">Alur Dokumen</span>
              <span className="font-mono text-2xs text-ink-400">FINANCE</span>
            </div>
            <ol className="divide-y divide-ink-100">
              {[
                ['Invoice', 'Diterima & dicatat'],
                ['Pembayaran', 'Diperbarui & dicocokkan'],
                ['Dokumen', 'Diunggah & dinamai'],
                ['Verifikasi', 'Diperiksa kelengkapannya'],
                ['Arsip', 'Disimpan & ditemukan kembali'],
              ].map(([label, sub], i) => (
                <li key={label} className="flex items-start gap-4 px-5 py-3.5">
                  <span className="mt-0.5 font-mono text-2xs text-ink-400">{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <p className="text-sm font-medium text-ink-900">{label}</p>
                    <p className="mt-0.5 text-xs text-ink-500">{sub}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------- Alur ----- */

function Workflow() {
  const steps = [
    { icon: Receipt, title: 'Transaksi', desc: 'Mencatat transaksi dan menghubungkannya dengan pelanggan serta dokumen terkait.' },
    { icon: FileText, title: 'Invoice', desc: 'Menerbitkan invoice, memantau jatuh tempo, dan menautkan dokumen pendukung.' },
    { icon: Wallet, title: 'Pembayaran', desc: 'Memperbarui pembayaran, menghitung sisa, dan mencocokkan nominal dengan invoice.' },
    { icon: Truck, title: 'Pengiriman', desc: 'Mencatat pengiriman, resi, dan tanda terima yang berkaitan dengan Finance.' },
    { icon: Archive, title: 'Arsip', desc: 'Menyimpan dokumen secara terstruktur per tahun, bulan, jenis, dan pelanggan.' },
  ]

  return (
    <section id="alur" className="border-b border-ink-200 bg-ink-50">
      <div className="mx-auto max-w-6xl px-5 py-16 lg:px-8">
        <p className="df-section-label">Alur Kerja</p>
        <h2 className="df-display-2 mt-4 max-w-2xl">
          Data mengalir melalui satu jalur yang dapat ditelusuri.
        </h2>
        <p className="mt-3 max-w-2xl text-sm text-ink-600">
          Setiap dokumen terhubung ke transaksi yang menjadi asalnya, sehingga posisi sebuah berkas dapat ditelusuri
          dari awal hingga diarsipkan.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-ink-200 bg-ink-200 sm:grid-cols-2 lg:grid-cols-5">
          {steps.map((s, i) => {
            const Icon = s.icon
            return (
              <Reveal key={s.title} delay={i * 80} className="bg-white">
                <div className="group h-full bg-white p-5 transition-colors duration-200 hover:bg-accent-50/40">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-accent-50 text-accent-600 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:bg-accent-100">
                    <Icon className="h-[18px] w-[18px]" aria-hidden />
                  </span>
                  <p className="mt-3 text-sm font-semibold text-ink-900">{s.title}</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-ink-500">{s.desc}</p>
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------- Modul ----- */

function Modules() {
  const modules: { icon: typeof Receipt; name: string; desc: string }[] = [
    { icon: Receipt, name: 'Transaksi', desc: 'Pusat pencatatan transaksi dan statusnya.' },
    { icon: FileText, name: 'Invoice', desc: 'Penerbitan, jatuh tempo, dan dokumen invoice.' },
    { icon: Wallet, name: 'Pembayaran', desc: 'Pencatatan pembayaran dan sisa tagihan.' },
    { icon: Truck, name: 'Pengiriman', desc: 'Resi, ekspedisi, dan tanda terima.' },
    { icon: FileText, name: 'Dokumen', desc: 'Unggah, tinjau, dan unduh dokumen.' },
    { icon: Archive, name: 'Arsip', desc: 'Penyimpanan dokumen terstruktur.' },
    { icon: BadgeCheck, name: 'Verifikasi', desc: 'Pemeriksaan kesesuaian dokumen.' },
    { icon: ClipboardCheck, name: 'Pemeriksaan Ketelitian', desc: 'Pemeriksaan ketelitian input data.' },
    { icon: BadgeCheck, name: 'Pengeluaran', desc: 'Klaim bensin dan pengeluaran operasional.' },
    { icon: PackageSearch, name: 'Pengadaan', desc: 'Catatan pengadaan barang dan SPB.' },
  ]

  return (
    <section id="modul" className="border-b border-ink-200 bg-white">
      <div className="mx-auto max-w-6xl px-5 py-16 lg:px-8">
        <p className="df-section-label">Modul</p>
        <h2 className="df-display-2 mt-4 max-w-2xl">Fungsi yang tersedia.</h2>
        <p className="mt-3 max-w-2xl text-sm text-ink-600">
          Setiap modul berangkat dari pekerjaan administrasi Finance yang dijalankan sehari-hari.
        </p>

        <ul className="mt-10 grid grid-cols-1 gap-x-10 gap-y-0 sm:grid-cols-2">
          {modules.map((m, i) => {
            const Icon = m.icon
            return (
              <Reveal key={m.name} as="li" delay={(i % 2) * 70} from="left">
                <div className="group flex items-start gap-4 border-t border-ink-100 py-4 transition-colors duration-200 hover:border-accent-200">
                  <span className="mt-0.5 font-mono text-2xs text-ink-400 transition-colors group-hover:text-accent-500">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <Icon
                    className="mt-0.5 h-4 w-4 shrink-0 text-accent-600 transition-transform duration-200 group-hover:scale-110"
                    aria-hidden
                  />
                  <div>
                    <p className="text-sm font-medium text-ink-900">{m.name}</p>
                    <p className="mt-0.5 text-xs text-ink-500">{m.desc}</p>
                  </div>
                </div>
              </Reveal>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

/* --------------------------------------------------------- Arsip/Verif --- */

function ArchiveVerification() {
  return (
    <section id="arsip" className="border-b border-ink-200 bg-ink-50">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-x-16 gap-y-12 px-5 py-16 lg:grid-cols-2 lg:px-8">
        <div>
          <p className="df-section-label">Arsip</p>
          <h2 className="df-display-2 mt-4">Dokumen tersimpan dan mudah ditemukan kembali.</h2>
          <p className="mt-3 text-sm text-ink-600">
            Arsip disusun mengikuti struktur tahun, bulan, jenis dokumen, dan pelanggan — sehingga berkas dapat dicari
            kembali tanpa membuka banyak folder.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-ink-700">
            {['Pencarian & filter dokumen', 'Pratinjau dan unduh berkas', 'Lokasi arsip tercatat', 'Status dokumen terpantau'].map(
              (item, i) => (
                <Reveal as="li" key={item} delay={i * 70} from="left" className="flex items-center gap-2.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent-500" aria-hidden />
                  {item}
                </Reveal>
              ),
            )}
          </ul>
        </div>

        <Reveal from="right" delay={120}>
          <div className="df-card p-6 transition-shadow duration-300 hover:shadow-lift">
            <p className="text-sm font-semibold text-ink-900">Hasil verifikasi</p>
            <p className="mt-1 text-xs text-ink-500">
              Setiap pemeriksaan memberi alasan, bukan sekadar status.
            </p>
            <ul className="mt-5 space-y-3">
              {[
                ['Pelanggan sesuai', 'Sesuai', 'bg-ok-500'],
                ['Nominal invoice sesuai', 'Sesuai', 'bg-ok-500'],
                ['Nominal pembayaran', 'Perlu Diperiksa', 'bg-warn-500'],
                ['Kelengkapan dokumen', 'Tidak Sesuai', 'bg-bad-500'],
              ].map(([label, status, dot]) => (
                <li
                  key={label}
                  className="group flex items-center justify-between border-b border-ink-100 pb-3 transition-colors last:border-0 last:pb-0 hover:border-accent-200"
                >
                  <span className="text-sm text-ink-700">{label}</span>
                  <span className="flex items-center gap-2 text-xs font-medium text-ink-600">
                    <span className={`h-2 w-2 rounded-full ${dot} transition-transform group-hover:scale-125`} aria-hidden />
                    {status}
                  </span>
              </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ---------------------------------------------------------------- CTA ---- */

function ClosingCta() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-6xl px-5 py-16 lg:px-8">
        <div className="df-card flex flex-col items-start justify-between gap-6 p-8 sm:flex-row sm:items-center">
          <div>
            <h2 className="df-display-2">Mulai dari Beranda.</h2>
            <p className="mt-2 max-w-lg text-sm text-ink-600">
              Masuk untuk melihat ringkasan aktivitas Finance, daftar yang perlu ditindaklanjuti, serta status dokumen.
            </p>
          </div>
          <Link to="/login" className="df-btn-primary shrink-0 px-5 py-2.5 text-sm">
            Masuk ke Sistem
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------- Footer --- */

function Footer() {
  return <AppFooter variant="landing" />
}

/* --------------------------------------------------------------- Page ---- */

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <LandingNav />
      {/* The hero is above the fold, so it renders immediately rather than
          waiting for a scroll reveal; its headline animates on mount instead. */}
      <Hero />
      <Reveal>
        <Workflow />
      </Reveal>
      <Reveal>
        <Modules />
      </Reveal>
      <Reveal>
        <ArchiveVerification />
      </Reveal>
      <Reveal>
        <ClosingCta />
      </Reveal>
      <Footer />
    </div>
  )
}
