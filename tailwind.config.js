import typography from '@tailwindcss/typography'

export default {
  content: ["./src/**/*.{html,ts,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        main: {
          dark: '#222831',
          light: '#31363F'
        }
      },
      fontFamily: {
        sfpro: ['"SF Pro Display"', 'sans-serif'],
      }
    }
  },
  plugins: [typography] 
}
