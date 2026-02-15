/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        felt: '#1b5e3b',
        'felt-light': '#1e6e45',
      },
    },
  },
  plugins: [],
};
