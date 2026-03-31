/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: {
            DEFAULT: '#2563eb',
            light: '#3b82f6',
            dark: '#1d4ed8',
            muted: 'rgba(37, 99, 235, 0.15)',
          },
          yellow: {
            DEFAULT: '#eab308',
            light: '#facc15',
            dark: '#ca8a04',
            muted: 'rgba(234, 179, 8, 0.15)',
          },
        },
        surface: {
          950: '#0c1222',
          900: '#111827',
          800: '#1e293b',
          700: '#334155',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      boxShadow: {
        'brand-blue': '0 0 0 2px rgba(37, 99, 235, 0.4)',
        'brand-yellow': '0 0 0 2px rgba(234, 179, 8, 0.4)',
        'glow-blue': '0 0 20px -5px rgba(37, 99, 235, 0.35)',
        'glow-yellow': '0 0 20px -5px rgba(234, 179, 8, 0.25)',
      },
    },
  },
  plugins: [],
};
