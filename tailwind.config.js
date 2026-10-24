/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./*.php', './assets/js/*.js'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F0FDF6',
          100: '#DCF5E8',
          200: '#B8EAD1',
          300: '#7ED9B0',
          400: '#45BE8B',
          500: '#1B8A5A',
          600: '#14734C',
          700: '#0F5D3E',
          800: '#0B5D3B',
          900: '#07422A',
        },
        accent: {
          50: '#FFF6EC',
          100: '#FFE9D2',
          200: '#FFD2A6',
          300: '#FFB56E',
          400: '#FC9738',
          500: '#F57C00',
          600: '#DB6A00',
          700: '#B45400',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(16, 24, 40, .04), 0 8px 24px -12px rgba(16, 24, 40, .12)',
        pop: '0 12px 40px -12px rgba(16, 24, 40, .28)',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        fadeUp: 'fadeUp .45s ease-out both',
      },
    },
  },
  plugins: [],
};
