import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  Boxes,
  CheckCircle2,
  FileText,
  LayoutDashboard,
  Menu,
  Search,
  ShieldCheck,
  Truck,
  Wallet,
  X,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { StatusBadge } from '@/components/ui/StatusBadge'

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
    { href: '#problem', label: 'Problem' },
    { href: '#features', label: 'Features' },
    { href: '#verification', label: 'Verification' },
    { href: '#how', label: 'How it works' },
  ]

  return (
    <header
      className={
        'sticky top-0 z-40 border-b transition-colors ' +
        (scrolled ? 'border-ink-200 bg-white/90 backdrop-blur' : 'border-transparent bg-transparent')
      }
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5" aria-label="DOCFLOW home">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent-600 text-xs font-bold text-white">
            DF
          </span>
          <span className="text-sm font-semibold tracking-tight text-ink-900">DOCFLOW</span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex" aria-label="Sections">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-sm text-ink-600 transition-colors hover:text-ink-900">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <Link
              to="/app"
              className="df-btn-primary"
            >
              Open workspace
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <>
              <Link to="/login" className="df-btn-ghost text-sm">
                Sign in
              </Link>
              <Link to="/register" className="df-btn-primary">
                Create account
                <ArrowRight className="h-4 w-4" />
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="rounded-md p-2 text-ink-600 hover:bg-ink-100 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-ink-200 bg-white px-5 py-4 md:hidden">
          <nav className="flex flex-col gap-3" aria-label="Sections">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-sm text-ink-700"
                onClick={() => setOpen(false)}
              >
                {l.label}
              </a>
            ))}
          </nav>
          <div className="mt-4 flex flex-col gap-2">
            <Link to="/login" className="df-btn-secondary w-full">
              Sign in
            </Link>
            <Link to="/register" className="df-btn-primary w-full">
              Create account
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  )
}

/* --------------------------------------------------------------- Hero ---- */

function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Subtle grid backdrop, restrained — not a gradient soup. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #16191f 1px, transparent 1px), linear-gradient(to bottom, #16191f 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, #000 40%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, #000 40%, transparent 100%)',
        }}
      />

      <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-16 lg:px-8 lg:pb-24 lg:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white px-3 py-1 text-xs text-ink-600">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-500" />
            Independent prototype · inspired by an internship workflow
          </span>

          <h1 className="mt-6 text-4xl font-semibold leading-[1.1] tracking-tight text-ink-900 sm:text-5xl">
            One transaction, one source of operational context.
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-ink-500">
            DOCFLOW connects transactions, invoices, payments, deliveries, documents and
            verification into a single traceable workflow — so nothing gets lost between
            marketplace, spreadsheet, and chat.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/login" className="df-btn-primary px-5 py-2.5 text-sm">
              Open the live demo
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="#features" className="df-btn-secondary px-5 py-2.5 text-sm">
              See how it works
            </a>
          </div>

          <p className="mt-4 text-xs text-ink-400">
            No setup · seeded with fictional data · 3 roles included
          </p>
        </div>

        {/* Product preview */}
        <div className="mx-auto mt-14 max-w-5xl">
          <div className="rounded-xl border border-ink-200 bg-white p-1.5 shadow-pop">
            <div className="flex items-center gap-1.5 px-3 py-2">
              <span className="h-2.5 w-2.5 rounded-full bg-ink-200" />
              <span className="h-2.5 w-2.5 rounded-full bg-ink-200" />
              <span className="h-2.5 w-2.5 rounded-full bg-ink-200" />
              <span className="ml-3 rounded border border-ink-200 px-2 py-0.5 font-mono text-2xs text-ink-400">
                127.0.0.1:8650/app
              </span>
            </div>
            <div className="overflow-hidden rounded-lg border border-ink-100">
              <HeroDashboardMock />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/** A static, non-interactive glimpse of the real Overview screen. */
function HeroDashboardMock() {
  const metrics = [
    { label: 'Total Transactions', value: '59', sub: '12 this month' },
    { label: 'Needs Review', value: '7', sub: 'verification flagged' },
    { label: 'Outstanding Payment', value: 'Rp 110.608.275', sub: '3 overdue invoices' },
    { label: 'Documents Pending', value: '109', sub: 'awaiting review' },
  ]
  const attention = [
    { sev: 'High', tone: 'danger' as const, code: 'TRX-2026-00042', msg: 'Invoice is 25 day(s) overdue.' },
    { sev: 'High', tone: 'danger' as const, code: 'TRX-2026-00051', msg: 'Verification failed with 2 check(s).' },
    { sev: 'Medium', tone: 'warning' as const, code: 'TRX-2026-00067', msg: 'Missing required document: Payment Proof.' },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 bg-ink-50 p-4 sm:p-5 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {metrics.map((m) => (
            <div key={m.label} className="df-card p-3">
              <p className="text-2xs font-medium text-ink-500">{m.label}</p>
              <p className="mt-1 text-sm font-semibold tracking-tight text-ink-900">{m.value}</p>
              <p className="mt-0.5 text-2xs text-ink-400">{m.sub}</p>
            </div>
          ))}
        </div>

        <div className="df-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-ink-100 px-4 py-2.5">
            <p className="text-xs font-semibold text-ink-900">Attention Queue</p>
            <span className="text-2xs text-ink-400">3 items</span>
          </div>
          <ul className="divide-y divide-ink-100">
            {attention.map((a) => (
              <li key={a.code} className="flex items-start gap-3 px-4 py-2.5">
                <StatusBadge label={a.sev} tone={a.tone} dot={false} className="mt-0.5" />
                <div className="min-w-0">
                  <p className="font-mono text-2xs font-medium text-ink-800">{a.code}</p>
                  <p className="text-2xs text-ink-500">{a.msg}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="df-card p-4">
        <p className="text-xs font-semibold text-ink-900">Verification</p>
        <ul className="mt-3 space-y-2.5">
          {[
            ['Required Documents', 'Pass', 'success'],
            ['Invoice Amount', 'Pass', 'success'],
            ['Payment Balance', 'Warning', 'warning'],
            ['Delivery Tracking', 'Failed', 'danger'],
          ].map(([label, status, tone]) => (
            <li key={label} className="flex items-center justify-between">
              <span className="text-2xs text-ink-600">{label}</span>
              <StatusBadge label={status} tone={tone as 'success' | 'warning' | 'danger'} />
            </li>
          ))}
        </ul>
        <div className="mt-4 border-t border-ink-100 pt-3">
          <div className="flex items-center justify-between">
            <span className="text-2xs text-ink-500">Overall</span>
            <span className="text-sm font-semibold text-warn-700">Needs review</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------ Problem ---- */

function Problem() {
  const before = [
    'Documents scattered across marketplace, email, spreadsheets and folders',
    'Transactions hard to trace from invoice to delivery',
    'Verification done by hand, one field at a time',
    'Status unclear until someone asks',
    'History difficult to reconstruct',
  ]

  return (
    <section id="problem" className="border-t border-ink-200 bg-white py-20 lg:py-24">
      <div className="mx-auto max-w-6xl px-5 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent-600">The problem</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">
            Operational data lives in too many places at once.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-500">
            An order moves through a marketplace, a spreadsheet, a chat thread and a folder of
            scans. Every hand-off is a chance for the same transaction to be recorded twice,
            named differently, or lost entirely.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="df-card p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-400">Before</p>
            <ul className="mt-4 space-y-3">
              {before.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ink-300" />
                  <span className="text-sm text-ink-500">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="df-card border-accent-200 p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-accent-600">With DOCFLOW</p>
            <ul className="mt-4 space-y-3">
              {[
                'One transaction as the source of operational context',
                'Invoice, payment, delivery and documents linked together',
                'Deterministic verification with reasons, not guesses',
                'A clear status and an attention queue that flags what matters',
                'A complete, auditable history of every change',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent-600" />
                  <span className="text-sm text-ink-700">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ----------------------------------------------------------- Features ---- */

const FEATURES = [
  {
    icon: LayoutDashboard,
    title: 'Attention-first overview',
    body: 'The dashboard answers one question: what needs attention right now? Severity is derived from real conditions, never a decorative label.',
  },
  {
    icon: FileText,
    title: 'Documents as first-class records',
    body: 'Upload, preview and download. Safe generated filenames, per-transaction folders, and version history that never silently overwrites.',
  },
  {
    icon: Wallet,
    title: 'Payments that support reality',
    body: 'Partial payments accumulate against the invoice. Overpayment is rejected with a reason instead of quietly corrupting the balance.',
  },
  {
    icon: Truck,
    title: 'Delivery tracking end-to-end',
    body: 'Courier, tracking number and status transitions flow from preparing, to shipped, to delivered — with delays surfaced automatically.',
  },
  {
    icon: ShieldCheck,
    title: 'A workflow that cannot be skipped',
    body: 'Status transitions are validated server-side. Completion is blocked until payment, delivery, documents and verification all line up.',
  },
  {
    icon: Bell,
    title: 'Audit and notifications',
    body: 'Every meaningful action is logged with before/after values, and operational alerts point straight to the record that needs action.',
  },
]

function Features() {
  return (
    <section id="features" className="border-t border-ink-200 bg-ink-50 py-20 lg:py-24">
      <div className="mx-auto max-w-6xl px-5 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent-600">Features</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">
            Built around the operational workflow.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-500">
            Every screen serves the workflow. Depth over feature count.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = f.icon
            return (
              <div key={f.title} className="df-card p-5 transition-shadow hover:shadow-pop">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent-50 text-accent-600">
                  <Icon className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
                </div>
                <h3 className="mt-4 text-sm font-semibold text-ink-900">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-500">{f.body}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------- Verification ---- */

function VerificationSection() {
  const checks = [
    { label: 'Required Documents', status: 'Pass', tone: 'success' as const, detail: 'Invoice, Delivery Order, Payment Proof present.' },
    { label: 'Customer Consistency', status: 'Pass', tone: 'success' as const, detail: 'Customer and invoice linkage are consistent.' },
    { label: 'Invoice Amount', status: 'Pass', tone: 'success' as const, detail: 'Invoice total matches the transaction total.' },
    { label: 'Payment Balance', status: 'Warning', tone: 'warning' as const, detail: 'Partial payment received; balance outstanding.' },
    { label: 'Delivery Tracking', status: 'Failed', tone: 'danger' as const, detail: 'Delivery is missing a tracking number.' },
    { label: 'Duplicate Document', status: 'Pass', tone: 'success' as const, detail: 'No duplicate document numbers detected.' },
  ]

  return (
    <section id="verification" className="border-t border-ink-200 bg-white py-20 lg:py-24">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-5 lg:grid-cols-2 lg:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent-600">Verification engine</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">
            Deterministic checks. Explainable results.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-ink-500">
            No black boxes. Each rule compares concrete record values and returns
            <span className="font-medium text-ink-700"> pass</span>,
            <span className="font-medium text-ink-700"> warning</span> or
            <span className="font-medium text-ink-700"> failed</span> — always with a reason you can read
            and act on.
          </p>

          <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5">
            {[
              ['8', 'verification rules'],
              ['3', 'result states'],
              ['1', 'run persisted per execution'],
              ['0', 'AI guesswork'],
            ].map(([value, label]) => (
              <div key={label}>
                <dt className="text-2xl font-semibold tracking-tight text-ink-900">{value}</dt>
                <dd className="mt-1 text-xs text-ink-500">{label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="df-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <Search className="h-4 w-4 text-ink-400" />
              <span className="font-mono text-xs font-medium text-ink-800">TRX-DEMO-B-MISSING-DOC</span>
            </div>
            <StatusBadge label="Needs Review" tone="danger" />
          </div>
          <ul className="divide-y divide-ink-100">
            {checks.map((c) => (
              <li key={c.label} className="flex items-start gap-4 px-5 py-3.5">
                <StatusBadge label={c.status} tone={c.tone} className="mt-0.5 w-[68px] justify-center" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-ink-800">{c.label}</p>
                  <p className="mt-0.5 text-2xs text-ink-500">{c.detail}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-ink-100 bg-ink-50 px-5 py-3">
            <span className="text-xs text-ink-500">Overall</span>
            <span className="text-sm font-semibold text-bad-700">Failed</span>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------ How it ---- */

function HowItWorks() {
  const steps = [
    { n: '01', title: 'Create a transaction', body: 'Pick a customer, set the date and totals. The server recalculates and validates the amount.' },
    { n: '02', title: 'Attach the paperwork', body: 'Upload the invoice, delivery order and payment proof. Files are stored safely with version history.' },
    { n: '03', title: 'Record payment & delivery', body: 'Partial or full payments, courier and tracking number — all linked to the same transaction.' },
    { n: '04', title: 'Run verification', body: 'Eight rules check the record and explain every warning or failure before you complete it.' },
  ]

  return (
    <section id="how" className="border-t border-ink-200 bg-ink-50 py-20 lg:py-24">
      <div className="mx-auto max-w-6xl px-5 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent-600">How it works</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">
            From first record to a completed transaction.
          </h2>
        </div>

        <ol className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <li key={s.n} className="df-card p-5">
              <span className="font-mono text-xs font-semibold text-accent-600">{s.n}</span>
              <h3 className="mt-3 text-sm font-semibold text-ink-900">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-500">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------- Roles ---- */

function Roles() {
  const roles = [
    { name: 'Admin', tone: 'info' as const, body: 'Full access, user and master-data management, and explicit workflow overrides with a recorded reason.' },
    { name: 'Operator', tone: 'neutral' as const, body: 'Creates and updates transactions, uploads documents, records payments and deliveries, runs verification.' },
    { name: 'Reviewer', tone: 'warning' as const, body: 'Reviews verification results, approves or rejects documents, and audits the activity history.' },
  ]

  return (
    <section className="border-t border-ink-200 bg-white py-20 lg:py-24">
      <div className="mx-auto max-w-6xl px-5 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent-600">Access control</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">
            Roles enforced on the server.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-500">
            Permissions are checked in the API — not hidden in the interface.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
          {roles.map((r) => (
            <div key={r.name} className="df-card p-5">
              <StatusBadge label={r.name} tone={r.tone} dot={false} />
              <p className="mt-4 text-sm leading-relaxed text-ink-500">{r.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* --------------------------------------------------------------- CTA ---- */

function FinalCta() {
  return (
    <section className="border-t border-ink-200 bg-ink-900 py-20 lg:py-24">
      <div className="mx-auto max-w-3xl px-5 text-center lg:px-8">
        <Boxes className="mx-auto h-6 w-6 text-accent-400" aria-hidden />
        <h2 className="mt-5 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Explore the working prototype.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-ink-300">
          Sign in with a demo account and walk a transaction from creation to verified completion —
          with a real database behind every screen.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/login" className="df-btn-primary px-5 py-2.5 text-sm">
            Open the live demo
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="#features"
            className="df-btn border border-white/15 bg-white/5 px-5 py-2.5 text-sm text-white hover:bg-white/10"
          >
            Review the features
          </a>
        </div>
        <p className="mt-5 text-xs text-ink-500">
          Independent prototype · fictional data only · not a production company system
        </p>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------ Footer ---- */

function Footer() {
  return (
    <footer className="border-t border-ink-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-5 py-10 lg:flex-row lg:items-center lg:px-8">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent-600 text-xs font-bold text-white">
              DF
            </span>
            <span className="text-sm font-semibold tracking-tight text-ink-900">DOCFLOW</span>
          </div>
          <p className="mt-3 max-w-md text-xs leading-relaxed text-ink-500">
            Document &amp; Transaction Operations Management System. A full-stack prototype built as
            an internship case study — independent of, and not affiliated with, any company system.
          </p>
        </div>

        <div className="flex items-center gap-6 text-xs text-ink-500">
          <a href="#features" className="hover:text-ink-800">Features</a>
          <a href="#verification" className="hover:text-ink-800">Verification</a>
          <Link to="/login" className="hover:text-ink-800">Sign in</Link>
        </div>
      </div>
      <div className="border-t border-ink-100">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-5 py-4 text-2xs text-ink-400 lg:px-8">
          <BadgeCheck className="h-3.5 w-3.5" />
          Built with Laravel, PostgreSQL, React &amp; TypeScript · seeded with fictional data
        </div>
      </div>
    </footer>
  )
}

/* ------------------------------------------------------------- Page ---- */

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <LandingNav />
      <main>
        <Hero />
        <Problem />
        <Features />
        <VerificationSection />
        <HowItWorks />
        <Roles />
        <FinalCta />
      </main>
      <Footer />
    </div>
  )
}
