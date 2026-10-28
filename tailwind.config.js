/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Glass theme: surfaces are translucent white over a dark, glowing backdrop.
        bg: "#05070d",
        panel: 'rgba(255,255,255,0.055)',
        panel2: 'rgba(255,255,255,0.07)',
        line: 'rgba(255,255,255,0.12)',
        muted: '#8b95a7',
        soft: '#c3cad6',
        win: '#6ee7b7',
        loss: '#ff8a7a',
        warn: '#ffb35c',
        accent: '#5b8cff',
      },
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
        mono: ['Outfit', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
