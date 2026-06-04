/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: '#0a0a0a',
          surface: '#111111',
          panel: '#161616',
          border: '#222222',
          text: '#e8e8e8',
          muted: '#6b6b6b',
          accent: '#f5a623',
          green: '#00d084',
          red: '#ff4444',
          blue: '#4a9eff',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};