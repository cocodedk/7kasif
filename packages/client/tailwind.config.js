/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        felt: '#1a1a2e',
        'felt-light': '#16213e',
      },
    },
  },
  plugins: [],
};
