/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'magic-gold': '#D4AF37',
        'magic-yellow': '#F4C430',
        'magic-black': '#0A0A0A',
      },
    },
  },
  plugins: [],
};
