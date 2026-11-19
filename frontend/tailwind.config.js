/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#F7F8FA',
        surface: '#FFFFFF',
        main: '#333333',
        muted: '#5F6672',
        subtle: '#E3E7ED',
        brand: {
          DEFAULT: '#315FCE',
          hover: '#244DAE',
        },
        pass: {
          DEFAULT: '#247A48',
          bg: '#EBF6EE',
        },
        fail: {
          DEFAULT: '#B42318',
          bg: '#FEF3F2',
        },
        warn: {
          DEFAULT: '#946200',
          bg: '#FEF7EB',
        },
        inconclusive: {
          DEFAULT: '#245C9B',
          bg: '#EEF4FC',
        },
        terminal: {
          bg: '#1E222B',
          text: '#F2F4F7',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'SFMono-Regular', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}
