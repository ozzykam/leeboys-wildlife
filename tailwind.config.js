/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#dc2626', // red-600
          dark: '#000000',    // black
          light: '#ffffff',   // white
          accent: '#991b1b'   // deeper red for hover states (red-800)
        }
      }
    }
  },
  plugins: []
};