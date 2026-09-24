/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
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
          50: '#faf9f7',
          100: '#f3f1ec',
          200: '#e7e4dd',
          300: '#d3cfc5',
          400: '#a8a29a',
          500: '#78736c',
          600: '#57534e',
          700: '#403d39',
          800: '#292623',
          900: '#181614',
        },
        // Single restrained accent (indigo). Kept as-is: it is used sparingly
        // for actions, and a hue change here would ripple through the whole app.
        accent: {
          50: '#eef1fb',
          100: '#dde3f7',
          200: '#bfc9ef',
          300: '#95a4e3',
          400: '#6b7dd4',
          500: '#4a5cc4',
          600: '#3a48a8',
          700: '#303a86',
          800: '#2a326d',
          900: '#272d5a',
        },
        // Meaningful status colors only.
        ok: { 50: '#ecfdf3', 100: '#d1fae0', 200: '#a6f4c5', 300: '#6ce9a6', 500: '#12b76a', 600: '#039855', 700: '#027a48' },
        warn: { 50: '#fffaeb', 100: '#fef0c7', 200: '#fedf89', 300: '#fec84b', 500: '#f79009', 600: '#dc6803', 700: '#b54708' },
        bad: { 50: '#fef3f2', 100: '#fee4e2', 200: '#fecdca', 300: '#fda29b', 500: '#f04438', 600: '#d92d20', 700: '#b42318' },
        info: { 50: '#eff8ff', 100: '#d1e9ff', 200: '#b2ddff', 300: '#84caff', 500: '#2e90fa', 600: '#1570ef', 700: '#175cd3' },
      },
      fontFamily: {
        // Body stays neutral; the display face carries the brand.
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        // Fraunces for headings only. A serif with real personality reads as
        // "official record" rather than "SaaS landing page", which is the
        // product's actual character. Applied via `font-display` on H1/H2, never
        // on body text: optical sizing and soft terminals hurt small-size
        // legibility.
        display: ['Fraunces', 'Georgia', 'Cambria', 'Times New Roman', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      borderRadius: {
        DEFAULT: '6px',
        md: '8px',
        lg: '10px',
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
