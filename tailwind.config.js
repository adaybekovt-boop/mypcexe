/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        base: '#050505',
        surface: '#0D0D0E',
        surface2: '#151515',
        line: 'rgba(255,255,255,0.10)',
        accent: '#F5F5F5',
        'accent-soft': '#D8D8D8',
        ok: '#F2F2F2',
        warn: '#B8B8B8',
        danger: '#E6E6E6',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      keyframes: {
        shake: {
          '0%,100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-7px)' },
          '40%': { transform: 'translateX(7px)' },
          '60%': { transform: 'translateX(-5px)' },
          '80%': { transform: 'translateX(3px)' },
        },
      },
      animation: {
        shake: 'shake 0.45s ease',
      },
    },
  },
  plugins: [],
}
