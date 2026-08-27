/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{js,jsx,ts,tsx}',
    './src/features/**/*.{js,jsx,ts,tsx}',
    './src/shared/**/*.{js,jsx,ts,tsx}',
    './src/providers/**/*.{js,jsx,ts,tsx}',
  ],

  presets: [require('nativewind/preset')],

  theme: {
    extend: {
      colors: {
        lumen: {
          500: '#85BCE3',
          400: '#99D5FF',
          300: '#BFE5FF',
        },

        warm: {
          500: '#FFDF9A',
          300: '#FFEBC0',
        },

        coal: {
          900: '#242A2F',
          700: '#353E45',
          500: '#505A61',
        },

        bone: {
          500: '#F6F3ED',
          300: '#FFFCF6',
          100: '#FFFDFA',
        },
      },
    },
  },

  plugins: [],
};