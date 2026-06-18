/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        base: '#101318',
        surface: '#171B22',
        surface2: '#1D232C',
        line: 'rgba(255,255,255,0.08)',
        accent: '#4EA3FF',
        'accent-soft': '#1F6FEB',
        ok: '#3FB950',
        warn: '#D29922',
        danger: '#F85149',
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
