/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#ff9800',
        'primary-dark': '#874e00',
        accent: '#ff75a2',
        warm: {
          50: '#fbf6ef',
          100: '#f6f0e8',
          200: '#fff0e5',
          300: '#fed7aa',
        },
      },
    },
  },
  plugins: [],
}
