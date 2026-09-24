import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Menu,
  Search,
  X,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { MaskedReveal, Reveal, useScrollProgress } from '@/components/Reveal'
import { Logo } from '@/components/Logo'

/*
 * Landing page.
 *
 * Design direction: the product is a system of record for operational
 * documents, so the page is styled like a well-set official document rather
 * than a SaaS landing page. Warm paper neutrals, a serif display face for
 * headings, hairline rules to divide content, and numbers in place of icons.
 *
 * What this deliberately avoids, and why:
 *
 *   - An eyebrow label above every section heading. It repeated what the
 *     heading already said. `.df-section-label` keeps a small marker with a
 *     rule instead of capitalised, wide-tracked text.
 *   - A grid or dot backdrop behind the hero. It is a stock way to make a flat
 *     page look technical without saying anything about this product.
 *   - A fake browser window around the product preview. The traffic-light dots
 *     and address bar are costume; the preview is the real artifact, so it gets
 *     a document masthead rule instead.
 *   - A row of six identical icon-in-a-box cards. The features are shown as a
 *     numbered register with hairlines, which is both denser and closer to how
 *     the product itself reads.
 */

/* ---------------------------------------------------------------- Nav ---- */

function LandingNav() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { user } = useAuth()
  const progress = useScrollProgress()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const links = [
    { href: '#problem', label: 'Problem' },
    { href: '#features', label: 'What it does' },
    { href: '#verification', label: 'Verification' },
    { href: '#how', label: 'Workflow' },
  ]

  return (
    <header
      className={
        'sticky top-0 z-40 transition-colors ' +
        (scrolled
          ? 'border-b border-ink-200 bg-ink-50/95 backdrop-blur-sm'
          : 'border-b border-transparent bg-transparent')
      }
    >
      {/*
        * Reading position. The page runs to several screens, and until now the
        * only cue for "how far along am I" was the system scrollbar, which sits
        * at the window edge and is a few pixels wide. One hairline under the nav
        * carries the same information where the eye already is.
        */}
      <div
        className="absolute bottom-0 left-0 h-px bg-accent-600 transition-[width] duration-150 ease-out"
        style={{ width: `${progress * 100}%` }}
        aria-hidden
      />

      <div className="mx-auto flex h-[4.5rem] max-w-6xl items-center justify-between px-5 lg:px-8">
        <Logo to="/" size="md" />

        <nav className="hidden items-center gap-8 md:flex" aria-label="Sections">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-ink-600 transition-colors hover:text-ink-900"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <Link to="/app" className="df-btn-primary">
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
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="rounded-md p-2 text-ink-600 hover:bg-ink-100 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-ink-200 bg-ink-50 px-5 py-4 md:hidden">
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
    <section className="relative">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-start gap-x-16 gap-y-14 px-5 pb-16 pt-12 lg:grid-cols-12 lg:px-8 lg:pb-20 lg:pt-16">

        <div className="lg:col-span-6 lg:pt-4">
          {/*
            * Each line is masked separately and staggered, so the headline
            * assembles in reading order rather than arriving as one block. The
            * delay is small enough to read as a single gesture.
            *
            * The two lines are explicit rather than left to wrap. In a
            * six-of-twelve column the natural wrap broke this headline into five
            * ragged lines, with "operational" and "context." each stranded on
            * their own. Deciding the break keeps it to three deliberate lines at
            * every width above the mobile breakpoint.
            *
            * `text-balance` handles the mobile case, where the column is narrow
            * enough that the browser has to wrap regardless; it distributes the
            * words evenly instead of leaving one orphan.
            */}
          <h1 className="df-display-1 text-balance">
            <MaskedReveal delay={60}>One transaction,</MaskedReveal>
            <MaskedReveal delay={220}>one source of</MaskedReveal>
            <MaskedReveal delay={380}>operational context.</MaskedReveal>
          </h1>

          <Reveal delay={340}>
            <p className="mt-6 max-w-md text-base leading-relaxed text-ink-600">
              DOCFLOW connects transactions, invoices, payments, deliveries,
              documents and verification into a single traceable workflow, so
              nothing gets lost between marketplace, spreadsheet, and chat.
            </p>
          </Reveal>

          <Reveal delay={420}>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link to="/login" className="df-btn-primary px-5 py-2.5">
                Open the live demo
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#how" className="df-btn-secondary px-5 py-2.5">
                See the workflow
              </a>
            </div>
          </Reveal>

          {/*
            * Facts instead of an adjective. "No setup" describes nothing a
            * reader can check; these say what is actually behind the login.
            */}
          <Reveal delay={500}>
            <dl className="mt-10 grid grid-cols-3 gap-px overflow-hidden rounded-md border border-ink-200 bg-ink-200">
              {[
                ['59', 'transactions'],
                ['8', 'check rules'],
                ['3', 'roles'],
              ].map(([value, label]) => (
                <div key={label} className="bg-ink-50 px-3 py-3 text-center">
                  <dt className="sr-only">{label}</dt>
                  <dd className="font-display text-lg text-ink-900">{value}</dd>
                  <dd className="mt-0.5 text-2xs text-ink-500">{label}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>

        {/* Product artifact. A masthead rule replaces the fake browser chrome:
            the preview is the point, and a costume window frame only claims
            the screenshot is a browser rather than the product. */}
        <Reveal delay={140} className="lg:col-span-6">
          <div className="overflow-hidden rounded-lg border border-ink-200 bg-white shadow-lift">
            <div className="border-b-2 border-ink-900 px-5 py-3">
              <div className="flex items-end justify-between gap-4">
                <p className="font-display text-sm text-ink-900">Overview</p>
                <p className="font-mono text-2xs text-ink-400">
                  fiscal year 2026
                </p>
              </div>
              {/* Double hairline, the usual rule under a document masthead. */}
              <div className="mt-2.5 border-t border-ink-200 pt-1.5">
                <p className="text-2xs text-ink-500">
                  Attention queue and verification summary, derived from stored
                  records.
                </p>
              </div>
            </div>
            <HeroDashboardMock />
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/** A static, non-interactive glimpse of the real Overview screen. */
function HeroDashboardMock() {
  const metrics = [
    { label: 'Transactions', value: '59', sub: '12 this month' },
    { label: 'Needs review', value: '7', sub: 'flagged by checks' },
    { label: 'Outstanding', value: 'Rp 110.608.275', sub: '3 overdue' },
    { label: 'Documents', value: '109', sub: 'awaiting review' },
  ]
  const attention = [
    { sev: 'High', tone: 'danger' as const, code: 'TRX-2026-00042', msg: 'Invoice is 25 days overdue.' },
    { sev: 'High', tone: 'danger' as const, code: 'TRX-2026-00051', msg: 'Verification failed, 2 checks.' },
    { sev: 'Medium', tone: 'warning' as const, code: 'TRX-2026-00067', msg: 'Missing document: Payment Proof.' },
  ]

  return (
    <div className="divide-y divide-ink-200 bg-ink-50">
      <div className="grid grid-cols-2 gap-px bg-ink-200 sm:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.label} className="bg-white px-4 py-3.5">
            <p className="text-2xs font-medium uppercase tracking-wider text-ink-500">
              {m.label}
            </p>
            {/* tabular-nums keeps the currency column from ragged-right. */}
            <p className="mt-1 text-sm font-semibold tabular-nums tracking-tight text-ink-900">
              {m.value}
            </p>
            <p className="mt-0.5 text-2xs text-ink-400">{m.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-px bg-ink-200 lg:grid-cols-5">
        <div className="bg-white px-5 py-4 lg:col-span-3">
          <div className="flex items-baseline justify-between">
            <p className="font-display text-sm text-ink-900">Attention queue</p>
            <span className="text-2xs text-ink-400">3 open</span>
          </div>
          <ul className="mt-3 divide-y divide-ink-100">
            {attention.map((a) => (
              <li key={a.code} className="flex items-start gap-3 py-2.5">
                <StatusBadge label={a.sev} tone={a.tone} dot={false} className="mt-0.5" />
                <div className="min-w-0">
                  <p className="font-mono text-2xs font-medium text-ink-800">{a.code}</p>
                  <p className="text-2xs text-ink-500">{a.msg}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white px-5 py-4 lg:col-span-2">
          <p className="font-display text-sm text-ink-900">Verification</p>
          <ul className="mt-3 divide-y divide-ink-100">
            {[
              ['Required documents', 'Pass', 'success'],
              ['Invoice amount', 'Pass', 'success'],
              ['Payment balance', 'Warning', 'warning'],
              ['Delivery tracking', 'Failed', 'danger'],
            ].map(([label, status, tone]) => (
              <li key={label} className="flex items-center justify-between py-2">
                <span className="text-2xs text-ink-600">{label}</span>
                <StatusBadge label={status} tone={tone as 'success' | 'warning' | 'danger'} />
              </li>
            ))}
          </ul>
          <div className="mt-3 border-t border-ink-200 pt-2.5">
            <div className="flex items-baseline justify-between">
              <span className="text-2xs text-ink-500">Overall</span>
              <span className="text-xs font-semibold text-warn-700">Needs review</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------ Problem ---- */

function Problem() {
  // One row per claim, before against after. Two side-by-side cards let the eye
  // skip between them; a single register with the pair on one line makes each
  // contrast read at once, and the column headers carry the meaning that the
  // old "Before" / "With DOCFLOW" labels were doing.
  const pairs = [
    [
      'Documents split across marketplace, email, spreadsheets and folders',
      'Every document attached to the transaction it belongs to',
    ],
    [
      'Tracing an invoice back to its delivery takes a search per system',
      'One record links invoice, payment, delivery and documents',
    ],
    [
      'Verification done by hand, one field at a time',
      'Eight rules evaluated together, each with a written reason',
    ],
    [
      'Status unclear until someone asks in chat',
      'A live attention queue flags what needs action, and why',
    ],
    [
      'History reconstructed from memory and stale exports',
      'Every change logged with before and after values',
    ],
  ]

  return (
    <section id="problem" className="df-rule bg-white py-16 lg:py-20">
      <div className="mx-auto max-w-6xl px-5 lg:px-8">
        <div className="grid grid-cols-1 gap-x-16 gap-y-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Reveal>
              <p className="df-section-label">The problem</p>
              <h2 className="df-display-2 mt-4">
                Operational data lives in too many places at once.
              </h2>
              <p className="mt-5 text-sm leading-relaxed text-ink-600">
                An order moves through a marketplace, a spreadsheet, a chat
                thread and a folder of scans. Every hand-off is a chance for the
                same transaction to be recorded twice, named differently, or
                lost entirely.
              </p>
            </Reveal>
          </div>

          <div className="lg:col-span-8">
            <Reveal delay={120}>
              <div className="overflow-hidden rounded-lg border border-ink-200">
                {/*
                  * Two columns only where there is room for them. At 390px a
                  * side-by-side grid leaves each cell about 160px wide, which is
                  * too narrow for a sentence and produced one- or two-word lines.
                  * Below `sm` each pair stacks, and the label is repeated on the
                  * "after" row so the contrast still reads without the header.
                  */}
                <div className="grid border-b-2 border-ink-900 bg-ink-50 sm:grid-cols-2">
                  <p className="hidden px-5 py-3 text-2xs font-semibold uppercase tracking-wider text-ink-500 sm:block">
                    Today
                  </p>
                  <p className="hidden border-l border-ink-200 px-5 py-3 text-2xs font-semibold uppercase tracking-wider text-accent-700 sm:block">
                    In DOCFLOW
                  </p>
                  <p className="px-5 py-2.5 text-2xs font-semibold uppercase tracking-wider text-ink-500 sm:hidden">
                    The difference
                  </p>
                </div>
                <ul className="divide-y divide-ink-200">
                  {pairs.map(([before, after]) => (
                    <li key={before} className="grid sm:grid-cols-2">
                      <p className="px-5 pt-4 text-sm leading-relaxed text-ink-500 sm:py-4">
                        {before}
                      </p>
                      <p className="flex items-start gap-2.5 px-5 pb-4 text-sm leading-relaxed text-ink-800 sm:border-l sm:border-ink-200 sm:bg-accent-50/40 sm:py-4">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent-600" />
                        <span>{after}</span>
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ----------------------------------------------------------- Features ---- */

const FEATURES = [
  {
    title: 'Attention-first overview',
    body: 'The dashboard answers one question: what needs attention right now? Severity comes from stored conditions, not from a label someone typed.',
  },
  {
    title: 'Documents as records',
    body: 'Upload, preview, download. Generated filenames, per-transaction folders, and a version history that never overwrites silently.',
  },
  {
    title: 'Payments against reality',
    body: 'Partial payments accumulate against the invoice. An overpayment is rejected with a reason instead of quietly corrupting the balance.',
  },
  {
    title: 'Delivery end to end',
    body: 'Courier, tracking number and status flow from preparing to shipped to delivered, with delays surfaced once a promise date passes.',
  },
  {
    title: 'A workflow that cannot be skipped',
    body: 'Transitions are validated on the server. Completion is blocked until payment, delivery, documents and verification agree.',
  },
  {
    title: 'Audit and notification',
    body: 'Every meaningful action is logged with before and after values. Alerts link straight to the record that needs action.',
  },
]

function Features() {
  return (
    <section id="features" className="df-rule bg-ink-50 py-16 lg:py-20">
      <div className="mx-auto max-w-6xl px-5 lg:px-8">
        <div className="max-w-2xl">
          <Reveal>
            <p className="df-section-label">What it does</p>
            <h2 className="df-display-2 mt-4">
              Six behaviours, all in service of one workflow.
            </h2>
          </Reveal>
        </div>

        {/*
          * A numbered register rather than a card grid. The numbering carries
          * the same information a row of icons would, and matches how the
          * product refers to its own rules ("8 checks"), so the section reads
          * as part of the same document instead of a separate marketing block.
          */}
        {/*
          * A numbered register set in three columns, not a card grid and not a
          * bento mosaic. The rows are separated by hairlines and carry equal
          * weight, so the numbering reads as a list of behaviours rather than six
          * decorative boxes. Numbers match how the product names its own rules
          * ("8 checks"), keeping the section in the same document voice.
          */}
        <ol className="mt-10 grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal
              as="li"
              key={f.title}
              className="group border-t border-ink-200 pt-5 transition-colors hover:border-ink-900"
              delay={(i % 3) * 80}
              from="none"
            >
              <div className="flex items-baseline gap-3">
                <span
                  className="font-display text-xl tabular-nums text-accent-600 transition-transform duration-300 ease-out group-hover:-translate-y-0.5"
                  aria-hidden
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="text-base font-semibold text-ink-900">{f.title}</h3>
              </div>
              <p className="mt-2.5 text-sm leading-relaxed text-ink-600">{f.body}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  )
}

/* ------------------------------------------------------- Verification ---- */

function VerificationSection() {
  const checks = [
    { label: 'Required documents', status: 'Pass', tone: 'success' as const, detail: 'Invoice, delivery order and payment proof present.' },
    { label: 'Customer consistency', status: 'Pass', tone: 'success' as const, detail: 'Customer and invoice linkage agree.' },
    { label: 'Invoice amount', status: 'Pass', tone: 'success' as const, detail: 'Invoice total matches the transaction total.' },
    { label: 'Payment balance', status: 'Warning', tone: 'warning' as const, detail: 'Partial payment received, balance outstanding.' },
    { label: 'Delivery tracking', status: 'Failed', tone: 'danger' as const, detail: 'Delivery has no tracking number.' },
    { label: 'Duplicate document', status: 'Pass', tone: 'success' as const, detail: 'No duplicate document numbers found.' },
  ]

  return (
    <section id="verification" className="df-rule bg-white py-16 lg:py-20">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-start gap-x-16 gap-y-12 px-5 lg:grid-cols-2 lg:px-8">
        <Reveal>
          <p className="df-section-label">Verification engine</p>
          <h2 className="df-display-2 mt-4">
            Deterministic checks, explainable results.
          </h2>
          <p className="mt-5 text-sm leading-relaxed text-ink-600">
            No black box. Each rule compares concrete field values and returns
            pass, warning or failed, always with a reason you can read and act
            on. Nothing is inferred, and nothing is guessed.
          </p>

          {/* A definition list set like a schedule, not four floating numbers. */}
          <dl className="mt-9 divide-y divide-ink-200 border-y border-ink-200">
            {[
              ['8', 'rules evaluated per run'],
              ['3', 'possible outcomes per rule'],
              ['1', 'persisted result per execution'],
              ['0', 'inferred or generated values'],
            ].map(([value, label]) => (
              <div key={label} className="flex items-baseline gap-5 py-3">
                <dt className="w-8 shrink-0 font-display text-2xl tabular-nums text-ink-900">
                  {value}
                </dt>
                <dd className="text-sm text-ink-600">{label}</dd>
              </div>
            ))}
          </dl>
        </Reveal>

        <Reveal delay={120}>
          <div className="overflow-hidden rounded-lg border border-ink-200 shadow-card">
            <div className="flex items-center justify-between gap-3 border-b-2 border-ink-900 bg-ink-50 px-5 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <Search className="h-3.5 w-3.5 shrink-0 text-ink-400" />
                <span className="truncate font-mono text-xs text-ink-800">
                  TRX-DEMO-B-MISSING-DOC
                </span>
              </div>
              <StatusBadge label="Needs review" tone="danger" />
            </div>
            <ul className="divide-y divide-ink-100 bg-white">
              {checks.map((c) => (
                <li key={c.label} className="flex items-start gap-4 px-5 py-3">
                  <StatusBadge
                    label={c.status}
                    tone={c.tone}
                    className="w-[70px] shrink-0 justify-center"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-ink-800">{c.label}</p>
                    <p className="mt-0.5 text-2xs leading-relaxed text-ink-500">
                      {c.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between border-t border-ink-200 bg-ink-50 px-5 py-3">
              <span className="text-2xs uppercase tracking-wider text-ink-500">
                Overall
              </span>
              <span className="text-sm font-semibold text-bad-700">Failed</span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------- Workflow ---- */

function HowItWorks() {
  const steps = [
    { n: '01', title: 'Open a transaction', body: 'Pick a customer, set the date and totals. The server recalculates and validates the amount.' },
    { n: '02', title: 'Attach the paperwork', body: 'Upload invoice, delivery order and payment proof. Files keep a version history.' },
    { n: '03', title: 'Record payment and delivery', body: 'Partial or full payments, courier and tracking number, all linked to the same record.' },
    { n: '04', title: 'Run verification', body: 'Eight rules check the record and explain every warning before it can be completed.' },
  ]

  return (
    <section id="how" className="df-rule bg-ink-50 py-16 lg:py-20">
      <div className="mx-auto max-w-6xl px-5 lg:px-8">
        <div className="max-w-2xl">
          <Reveal>
            <p className="df-section-label">Workflow</p>
            <h2 className="df-display-2 mt-4">
              From first record to completed transaction.
            </h2>
          </Reveal>
        </div>

        {/*
          * Four steps shown as a connected sequence rather than four boxes: the
          * line along the top says these happen in order, which four equal cards
          * would not (they would read as "four features", the wrong claim for a
          * process).
          *
          * The connector lives on this container, not inside the items. Each
          * item is wrapped in `Reveal`, and an element with a transform becomes
          * the containing block for `position: absolute` descendants. A line
          * placed inside an item would therefore stop at that item's edge, which
          * is what made the previous version look broken.
          */}
        <ol className="relative mt-12 grid grid-cols-1 gap-y-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-y-0">
          {/* The rule itself, drawn once across the full row. */}
          <span
            aria-hidden
            className="pointer-events-none absolute left-0 right-0 top-[5px] hidden h-px bg-ink-300 lg:block"
          />
          {steps.map((s, i) => (
            <Reveal
              as="li"
              key={s.n}
              className="relative lg:pr-8"
              delay={i * 90}
              from="none"
            >
              {/* Node marker, sitting on the rule. */}
              <span
                aria-hidden
                className="absolute left-0 top-0 hidden h-[11px] w-[11px] rounded-full border border-ink-400 bg-ink-50 lg:block"
              >
                <span className="absolute inset-[3px] rounded-full bg-accent-600" />
              </span>
              <div className="lg:pt-9">
                <p className="font-mono text-2xs text-ink-500 lg:hidden">{s.n}</p>
                <h3 className="font-display text-lg text-ink-900">{s.title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-ink-600">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  )
}

/* --------------------------------------------------------------- Roles ---- */

function Roles() {
  // Set out as a comparison sheet. Three cards would say "three things exist";
  // this says what each role may and may not do, which is the question an
  // administrator actually asks.
  const roles = [
    {
      name: 'Admin',
      tone: 'info' as const,
      scope: 'Everything, including overrides',
      body: 'Manages users and master data, and may override a blocked transition with a recorded reason.',
      can: ['Manage users', 'Edit master data', 'Override with reason'],
    },
    {
      name: 'Operator',
      tone: 'neutral' as const,
      scope: 'Creates and maintains records',
      body: 'Raises transactions, uploads documents, records payments and deliveries, runs verification.',
      can: ['Create and edit', 'Upload documents', 'Run verification'],
    },
    {
      name: 'Reviewer',
      tone: 'warning' as const,
      scope: 'Decides, does not enter',
      body: 'Reads verification results, approves or rejects documents, and audits the activity history.',
      can: ['Approve or reject', 'Audit history', 'Cannot edit records'],
    },
  ]

  return (
    <section className="df-rule bg-white py-16 lg:py-20">
      <div className="mx-auto max-w-6xl px-5 lg:px-8">
        <div className="grid grid-cols-1 gap-x-16 gap-y-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Reveal>
              <p className="df-section-label">Access control</p>
              <h2 className="df-display-2 mt-4">
                Roles enforced on the server.
              </h2>
              <p className="mt-5 text-sm leading-relaxed text-ink-600">
                Permissions are checked in the API, not hidden in the interface.
                Removing a button is not access control, so the request fails
                whether or not the screen offered it.
              </p>
            </Reveal>
          </div>

          <div className="lg:col-span-8">
            <Reveal delay={120}>
              <ul className="divide-y divide-ink-200 border-y border-ink-200">
                {roles.map((r) => (
                  <li key={r.name} className="grid grid-cols-1 gap-x-6 gap-y-3 py-5 sm:grid-cols-[9rem_1fr]">
                    <div>
                      <StatusBadge label={r.name} tone={r.tone} dot={false} />
                      <p className="mt-2 text-2xs text-ink-500">{r.scope}</p>
                    </div>
                    <div>
                      <p className="text-sm leading-relaxed text-ink-600">{r.body}</p>
                      <ul className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1">
                        {r.can.map((c) => (
                          <li key={c} className="flex items-center gap-1.5 text-2xs text-ink-700">
                            <CheckCircle2 className="h-3 w-3 text-accent-600" />
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  )
}

/* --------------------------------------------------------------- CTA ---- */

function FinalCta() {
  return (
    <section className="border-t border-ink-900 bg-ink-900">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-x-16 gap-y-8 px-5 py-14 lg:grid-cols-2 lg:px-8 lg:py-16">
        <Reveal>
          <h2 className="df-display-2 text-white">
            Walk a transaction from creation to verified completion.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-400">
            Every screen sits on a real PostgreSQL database with seeded,
            fictional records. Nothing is mocked.
          </p>
        </Reveal>

        <Reveal delay={120}>
          {/* Demo credentials on the landing page: the fastest path from
              "interesting" to "I have used it" is a link that needs no typing. */}
          <div className="rounded-lg border border-white/10 bg-white/5 p-5">
            <p className="text-2xs uppercase tracking-wider text-ink-400">
              Demo account
            </p>
            <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 font-mono text-xs text-ink-200">
              <span className="text-ink-500">email</span>
              <span>admin@docflow.test</span>
              <span className="text-ink-500">password</span>
              <span>password</span>
            </div>
            <Link
              to="/login"
              className="df-btn-primary mt-5 w-full bg-white text-ink-900 hover:bg-ink-100 active:bg-ink-200"
            >
              Open the live demo
              <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="mt-3 text-center text-2xs text-ink-500">
              Independent prototype · fictional data · not a company system
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------ Footer ---- */

function Footer() {
  return (
    <footer className="border-t border-ink-200 bg-ink-50">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-x-12 gap-y-10 px-5 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div className="sm:col-span-2 lg:col-span-2">
          <Logo to="/" size="md" />
          <p className="mt-4 max-w-sm text-xs leading-relaxed text-ink-500">
            Document &amp; Transaction Operations Management System. A
            full-stack prototype built as an internship case study, independent
            of and not affiliated with any company system.
          </p>
          <p className="mt-5 flex items-center gap-2 text-2xs text-ink-400">
            <BadgeCheck className="h-3.5 w-3.5 shrink-0" />
            Laravel · PostgreSQL · React · TypeScript
          </p>
        </div>

        <div>
          <p className="text-2xs font-semibold uppercase tracking-wider text-ink-700">
            Sections
          </p>
          <ul className="mt-3.5 space-y-2 text-xs text-ink-500">
            <li><a href="#problem" className="hover:text-ink-900">The problem</a></li>
            <li><a href="#features" className="hover:text-ink-900">What it does</a></li>
            <li><a href="#verification" className="hover:text-ink-900">Verification</a></li>
            <li><a href="#how" className="hover:text-ink-900">Workflow</a></li>
          </ul>
        </div>

        <div>
          <p className="text-2xs font-semibold uppercase tracking-wider text-ink-700">
            Start
          </p>
          <ul className="mt-3.5 space-y-2 text-xs text-ink-500">
            <li><Link to="/login" className="hover:text-ink-900">Sign in</Link></li>
            <li><Link to="/register" className="hover:text-ink-900">Create account</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-ink-200">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-2 px-5 py-5 text-2xs text-ink-400 sm:flex-row sm:items-center lg:px-8">
          <p>Seeded with fictional data. No real customers, invoices or amounts.</p>
          <p>Author: Raliq Hidayat BM3</p>
        </div>
      </div>
    </footer>
  )
}

/* ------------------------------------------------------------- Page ---- */

export function LandingPage() {
  return (
    <div className="min-h-screen bg-ink-50">
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
