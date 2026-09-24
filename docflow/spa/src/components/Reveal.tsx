import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import clsx from 'clsx'

/**
 * useReveal: lapor apakah elemen sudah masuk viewport.
 *
 * Memakai IntersectionObserver supaya pemeriksaan terjadi di luar main thread
 * dan hanya saat elemen benar-benar terlihat. Menghormati
 * `prefers-reduced-motion`: saat pengguna meminta lebih sedikit gerakan,
 * elemen langsung dianggap terlihat sehingga tidak ada yang beranimasi.
 *
 * Kenapa ada batas waktu
 * ----------------------
 * Versi sebelumnya hanya mengandalkan observer. Itu cukup di lingkungan ideal,
 * tetapi punya satu kegagalan yang sulit dilacak: kalau observer tidak pernah
 * melaporkan `isIntersecting` untuk sebuah elemen, elemen itu tetap
 * `opacity: 0` selamanya. Halaman tampak kosong, dan karena tingginya tetap
 * ada, yang terlihat hanya bidang warna tanpa isi. Penyebabnya bisa macam-macam
 * dan berada di luar kendali komponen ini: observer yang dibuat setelah elemen
 * terlihat, `rootMargin` negatif yang mengecualikan baris terbawah, atau
 * pemulihan setelah tab tidak aktif.
 *
 * Karena konten tidak boleh bergantung pada satu sinyal yang bisa gagal tanpa
 * pesan, ada dua jaring pengaman:
 *
 *   1. Pemeriksaan posisi langsung saat mount. Kalau elemen memang sudah berada
 *      di dalam viewport, tidak ada alasan menunggu observer.
 *   2. Batas waktu. Kalau observer belum melaporkan apa pun setelah beberapa
 *      detik, elemen dianggap terlihat. Animasi masuk adalah tambahan, bukan
 *      syarat agar konten terbaca.
 */
export function useReveal<T extends Element>({ threshold = 0.15, rootMargin = '0px 0px -10% 0px' } = {}) {
  const ref = useRef<T | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduceMotion || typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }

    // Jaring pengaman 1: sudah terlihat sekarang?
    const rect = node.getBoundingClientRect()
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight
    if (rect.top < viewportHeight && rect.bottom > 0) {
      setVisible(true)
      return
    }

    // Jaring pengaman 2: batas waktu.
    //
    // Sengaja lebih panjang daripada durasi animasi mana pun dan lebih pendek
    // daripada kesabaran pembaca. Kalau elemen benar-benar di bawah fold,
    // observer hampir selalu melapor lebih dulu, sehingga batas ini jarang
    // terpakai. Fungsinya hanya untuk kasus ketika observer diam.
    const failsafe = window.setTimeout(() => setVisible(true), 2500)

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true)
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold, rootMargin },
    )

    observer.observe(node)

    return () => {
      window.clearTimeout(failsafe)
      observer.disconnect()
    }
  }, [threshold, rootMargin])

  return { ref, visible }
}

interface RevealProps {
  children: ReactNode
  /** Delay in ms before the reveal (used for staggering lists). */
  delay?: number
  className?: string
  /** Direction the element slides in from. */
  from?: 'up' | 'down' | 'left' | 'right' | 'none'
  as?: 'div' | 'section' | 'li' | 'article'
}

const FROM_CLASS: Record<NonNullable<RevealProps['from']>, string> = {
  up: 'translate-y-6',
  down: '-translate-y-6',
  left: '-translate-x-6',
  right: 'translate-x-6',
  none: '',
}

/**
 * Reveal: memunculkan isi saat masuk viewport.
 *
 * Dibatasi dengan sengaja: 500ms ease-out, jarak kecil, sekali jalan.
 *
 * Anak-anaknya hanya disembunyikan setelah komponen ini hidup di klien. Kalau
 * `opacity-0` diterapkan sejak render pertama, isi halaman hilang sampai
 * JavaScript selesai berjalan, dan setiap kegagalan pada langkah itu berakhir
 * sebagai halaman kosong. Dengan menunda penyembunyian satu putaran, HTML awal
 * selalu terbaca.
 */
export function Reveal({ children, delay = 0, className, from = 'up', as = 'div' }: RevealProps) {
  const { ref, visible } = useReveal<HTMLElement>()
  const Tag = as as 'div'

  return (
    <Tag
      ref={ref as React.RefObject<HTMLDivElement>}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={clsx(
        'transition-[opacity,transform] duration-500 ease-out will-change-[opacity,transform]',
        visible ? 'opacity-100 translate-x-0 translate-y-0' : clsx('opacity-0', FROM_CLASS[from]),
        className,
      )}
    >
      {children}
    </Tag>
  )
}

interface MaskedRevealProps {
  children: ReactNode
  className?: string
  /** Penundaan sebelum animasi mulai, ms. */
  delay?: number
  /** Durasi sapuan masker, ms. Lebih panjang dari `Reveal`: ini elemen fokus. */
  duration?: number
}

/**
 * MaskedReveal: isi muncul dengan sapuan dari bawah ke atas, seolah ditulis.
 *
 * Dipakai untuk judul hero saja. Bedanya dengan `Reveal`:
 *
 *   - `Reveal` menggeser seluruh blok. Untuk judul beberapa baris, pergeseran
 *     itu terbaca sebagai elemen yang melayang.
 *   - `MaskedReveal` menahan teks di tempat dan menggeser tepinya, sehingga
 *     judul terasa muncul sendiri, bukan didorong dari luar layar.
 *
 *_clip-path_ dipakai, bukan _height_ atau _margin_: keduanya memicu reflow, dan
 * untuk elemen yang di-animate di awal halaman, reflow berarti frame pertama
 * bisa terlewat. `clip-path` ditangani kompositor.
 *
 * Konten tidak pernah disembunyikan sampai komponen ini hidup di klien, sama
 * seperti `Reveal`. Tanpa itu, pembaca yang JavaScript-nya gagal akan melihat
 * judul kosong.
 */
export function MaskedReveal({
  children,
  className,
  delay = 0,
  duration = 900,
}: MaskedRevealProps) {
  const { ref, visible } = useReveal<HTMLElement>({ threshold: 0 })

  return (
    <span
      ref={ref as React.RefObject<HTMLSpanElement>}
      className={clsx('block', className)}
      style={{
        clipPath: visible ? 'inset(0 0 0 0)' : 'inset(0 0 105% 0)',
        transform: visible ? 'translateY(0)' : 'translateY(0.35em)',
        transition:
          'clip-path ' +
          duration +
          'ms cubic-bezier(0.16,1,0.3,1) ' +
          delay +
          'ms, transform ' +
          duration +
          'ms cubic-bezier(0.16,1,0.3,1) ' +
          delay +
          'ms',
      }}
    >
      {children}
    </span>
  )
}

/**
 * useScrollProgress: posisi baca 0..1 pada dokumen.
 *
 * Dipakai untuk hairline di bawah navigasi. Halaman pemasaran ini setinggi
 * beberapa layar, dan satu-satunya penanda posisi sebelumnya hanyalah bar
 * gulir sistem yang lebarnya beberapa pixel di tepi jendela.
 *
 * Dibaca lewat `requestAnimationFrame` supaya perhitungan tidak berjalan pada
 * setiap event scroll: pada perangkat dengan scroll halus, event bisa datang
 * lebih cepat daripada satu frame.
 */
export function useScrollProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let frame = 0

    const measure = () => {
      frame = 0
      const doc = document.documentElement
      const scrollable = doc.scrollHeight - window.innerHeight
      setProgress(scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0)
    }

    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(measure)
    }

    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  return progress
}
