/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Neutral scale — the backbone of the calm, information-dense UI.
        ink: {
          50: '#f7f8f9',
          100: '#eef0f2',
          200: '#dfe3e7',
          300: '#c7cdd4',
          400: '#9aa3ae',
          500: '#6b7480',
          600: '#4d5561',
          700: '#3a414b',
          800: '#262b33',
          900: '#16191f',
        },
        // Single restrained accent (indigo-slate).
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
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
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
        card: '0 1px 2px 0 rgb(16 24 40 / 0.04), 0 1px 3px 0 rgb(16 24 40 / 0.06)',
        pop: '0 8px 24px -4px rgb(16 24 40 / 0.12), 0 2px 6px -1px rgb(16 24 40 / 0.08)',
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
