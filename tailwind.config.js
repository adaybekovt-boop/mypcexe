/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        // Deep graphite base
        base: '#0B0F14',
        surface: '#121821',
        surface2: '#0F141B',
        // Calm cyan/blue accent
        accent: '#38BDF8',
        'accent-deep': '#0EA5E9',
        ok: '#34D399',
        warn: '#FBBF24',
        danger: '#F87171',
      },
      borderColor: {
        hair: 'rgba(255,255,255,0.06)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 40px -8px rgba(56,189,248,0.45)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 rgba(52,211,153,0.55)' },
          '70%': { boxShadow: '0 0 0 7px rgba(52,211,153,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(52,211,153,0)' },
        },
        shake: {
          '0%,100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-8px)' },
          '40%': { transform: 'translateX(8px)' },
          '60%': { transform: 'translateX(-6px)' },
          '80%': { transform: 'translateX(4px)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.4s ease both',
        'pulse-ring': 'pulse-ring 2s ease-out infinite',
        shake: 'shake 0.5s ease',
      },
    },
  },
  plugins: [],
}
