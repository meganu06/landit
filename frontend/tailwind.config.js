/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#344e41',
        secondary: '#a3b18a',
        background: '#dad7cd',
        'text-dark': '#2d3830',
        'text-gray': '#5c665e',
      },
      fontFamily: {
        heading: ['Atteron', 'serif'],
        body: ['DM Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
