/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#080c10',
        surface: '#0f1520',
        surface2: '#16202e',
        border: '#1e2d42',
        text: '#c8d8e8',
        dim: '#5a7090',
        bright: '#e8f0f8',
        gold: '#ffd700',
        accent: '#3a8fff',
        'accent-hover': '#2070dd',
        warn: '#ff6b6b',
        'warn-bg': 'rgba(255,107,107,0.15)',
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "'Fira Code'", "'Courier New'", 'monospace'],
        sans: ["'Inter'", "'Segoe UI'", 'system-ui', 'sans-serif'],
      },
      spacing: {
        panel: '320px',
      },
      boxShadow: {
        panel: '0 4px 24px rgba(0,0,0,0.6)',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
      },
      animation: {
        blink: 'blink 1s infinite',
      },
    },
  },
  plugins: [],
}
