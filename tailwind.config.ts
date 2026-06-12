import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-barlow)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      colors: {
        ink: {
          950: '#080808',
          900: '#0f0f0f',
          800: '#181818',
          700: '#222222',
          600: '#333333',
          400: '#555555',
          200: '#888888',
          100: '#aaaaaa',
        },
      },
      keyframes: {
        flash: {
          '0%':   { opacity: '0' },
          '30%':  { opacity: '1' },
          '100%': { opacity: '0' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        checkPop: {
          '0%':   { transform: 'scale(1)' },
          '40%':  { transform: 'scale(1.04)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        flash:    'flash 0.35s ease forwards',
        slideUp:  'slideUp 0.4s ease forwards',
        fadeIn:   'fadeIn 0.3s ease forwards',
        checkPop: 'checkPop 0.25s ease forwards',
      },
    },
  },
  plugins: [],
}

export default config
