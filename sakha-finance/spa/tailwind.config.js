/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  // Dark mode is opt-in via a `dark` class on <html>. A class strategy (rather
  // than media) lets the user choose, and lets the choice persist in
  // localStorage — see ThemeProvider.
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Neutral scale (the backbone of the calm, information-dense UI).
        //
        // Warm rather than blue-tinted. A pure grey next to white reads as cold
        // and slightly clinical, which suits a developer tool but not a system
        // people read documents in all day. The undersides carry a trace of
        // yellow, which is what gives printed paper its warmth.
        ink: {
          50: 'var(--ink-50, #faf9f7)',
          100: 'var(--ink-100, #f3f1ec)',
          200: 'var(--ink-200, #e7e4dd)',
          300: 'var(--ink-300, #d3cfc5)',
          400: 'var(--ink-400, #a8a29a)',
          500: 'var(--ink-500, #78736c)',
          600: 'var(--ink-600, #57534e)',
          700: 'var(--ink-700, #403d39)',
          800: 'var(--ink-800, #292623)',
          900: 'var(--ink-900, #181614)',
        },
        // Brand accent — a deep, professional Sakha red.
        //
        // Anchored on the company identity (red) but darkened and slightly
        // desaturated for interface use: a pure #e3000f is fine for a logo on
        // white, but as a button/link colour across a data-dense screen it is
        // loud and strains the eye. This scale keeps the brand recognisable
        // while staying readable next to the dark neutrals.
        //
        // It is deliberately DISTINCT from the `bad` (error) red below:
        // accent is a muted maroon-red (#8f1d24 range), error is a vivid red
        // (#d92d20 range), so a destructive action never looks like a brand
        // action. Check them side by side before changing either.
        accent: {
          50: 'var(--accent-50, #fbf3f3)',
          100: 'var(--accent-100, #f6e2e3)',
          200: 'var(--accent-200, #ecc5c7)',
          300: 'var(--accent-300, #dd9ba0)',
          400: 'var(--accent-400, #c5666d)',
          500: 'var(--accent-500, #a83a42)',
          600: 'var(--accent-600, #8f1d24)',
          700: 'var(--accent-700, #771a20)',
          800: 'var(--accent-800, #61181d)',
          900: 'var(--accent-900, #50161a)',
        },
        // Meaningful status colors only.
        ok: { 50: 'var(--ok-50, #ecfdf3)', 100: 'var(--ok-100, #d1fae0)', 200: 'var(--ok-200, #a6f4c5)', 300: '#6ce9a6', 500: '#12b76a', 600: '#039855', 700: '#027a48' },
        warn: { 50: 'var(--warn-50, #fffaeb)', 100: 'var(--warn-100, #fef0c7)', 200: 'var(--warn-200, #fedf89)', 300: '#fec84b', 500: '#f79009', 600: '#dc6803', 700: '#b54708' },
        bad: { 50: 'var(--bad-50, #fef3f2)', 100: 'var(--bad-100, #fee4e2)', 200: 'var(--bad-200, #fecdca)', 300: '#fda29b', 500: '#f04438', 600: '#d92d20', 700: '#b42318' },
        info: { 50: 'var(--info-50, #eff8ff)', 100: 'var(--info-100, #d1e9ff)', 200: 'var(--info-200, #b2ddff)', 300: '#84caff', 500: '#2e90fa', 600: '#1570ef', 700: '#175cd3' },
      },
      fontFamily: {
        // One neutral, highly legible sans throughout. An earlier iteration used
        // a display serif for headings; that read as editorial, which suits a
        // publication but not an internal Finance system. A single sans keeps the
        // interface uniform and reads as "working tool".
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      borderRadius: {
        // Flatter than before. Softer, larger radii read as consumer product;
        // a tighter radius on cards and controls reads as a corporate tool.
        DEFAULT: '4px',
        md: '6px',
        lg: '8px',
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(24 22 20 / 0.04), 0 1px 3px 0 rgb(24 22 20 / 0.06)',
        pop: '0 8px 24px -4px rgb(24 22 20 / 0.12), 0 2px 6px -1px rgb(24 22 20 / 0.08)',
        // One deeper tier, reserved for the hero artifact so it reads as the
        // page's focal object rather than another card.
        lift: '0 24px 48px -12px rgb(24 22 20 / 0.18), 0 8px 16px -8px rgb(24 22 20 / 0.10)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        // Slow diagonal drift for the hero background grid. One full cell per
        // cycle keeps the loop seamless; the layer is oversized so the pattern
        // never exposes an edge while it moves.
        'grid-drift': {
          from: { transform: 'translate3d(0, 0, 0)' },
          to: { transform: 'translate3d(48px, 48px, 0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 120ms ease-out',
        'slide-up': 'slide-up 140ms ease-out',
        shimmer: 'shimmer 1.4s infinite',
      },
    },
  },
  plugins: [],
}
