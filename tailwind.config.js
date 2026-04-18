/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        hospital: {
          50: '#f0fdf4',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          900: '#065f46',
        },
        slate: {
          900: '#0f0f23',
          800: '#18181b',
          700: '#27272a',
          600: '#52525b',
          500: '#71717a',
          400: '#a1a1aa',
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        glow: 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)' },
          '100%': { boxShadow: '0 0 40px rgba(16, 185, 129, 0.6)' },
        }
      }
    },
  },
  plugins: [],
}

