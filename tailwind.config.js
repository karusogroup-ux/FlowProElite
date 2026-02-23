/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Enables the Sun/Moon toggle logic
  theme: {
    extend: {
      colors: {
        // FLOWPRO Brand Palette
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#2563eb', // Your signature Blue
          600: '#1d4ed8',
          900: '#1e3a8a',
          black: '#050505', // Richer than default black
        },
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '3rem',
      },
      animation: {
        'slide-up': 'slideUp 0.4s ease-out forwards',
        'subtle-zoom': 'subtleZoom 10s infinite alternate',
      },
      keyframes: {
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        subtleZoom: {
          '0%': { transform: 'scale(1)' },
          '100%': { transform: 'scale(1.05)' },
        }
      },
    },
  },
  plugins: [],
}