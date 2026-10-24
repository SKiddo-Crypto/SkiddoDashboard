/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#08090a',
        panel: '#0f1112',
        panel2: '#15181a',
        line: '#1f2427',
        muted: '#6b7479',
        soft: '#9aa3a8',
        win: '#7ee2a8',
        loss: '#f2766b',
        warn: '#e8c56b',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}
