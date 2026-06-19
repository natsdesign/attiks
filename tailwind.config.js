/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#C8F135',
          dark: '#A8D010',
        },
        surface: {
          DEFAULT: '#161D0F',
          raised: '#1E2914',
          border: '#2A3A1A',
          bg: '#0D1108',
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#8A9A7A',
          muted: '#4A5A3A',
        },
      },
      fontFamily: {
        sans: ['System'],
      },
    },
  },
  plugins: [],
};
