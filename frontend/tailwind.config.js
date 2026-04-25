/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Touch 'n Go brand palette
        tng: {
          blue: '#1652A1',
          'blue-dark': '#0F3F7E',
          'blue-light': '#2E78D2',
          yellow: '#FFD400',
          'yellow-dark': '#F2B900',
        },
      },
      fontFamily: {
        sans: ['"Inter"', '"Segoe UI"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 10px 30px -8px rgba(15, 63, 126, 0.25)',
        button: '0 6px 0 0 rgba(0,0,0,0.08)',
      },
      keyframes: {
        'pulse-ring': {
          '0%': { transform: 'scale(0.9)', opacity: '0.7' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
        'pipeline-glow': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(22, 82, 161, 0.0)' },
          '50%': { boxShadow: '0 0 0 14px rgba(22, 82, 161, 0.18)' },
        },
        'flow': {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '50%': { opacity: '1' },
          '100%': { transform: 'translateX(100%)', opacity: '0' },
        },
        'float-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'pulse-ring': 'pulse-ring 1.4s cubic-bezier(0.4,0,0.6,1) infinite',
        'pipeline-glow': 'pipeline-glow 1.6s ease-in-out infinite',
        'flow': 'flow 2.4s linear infinite',
        'float-in': 'float-in 0.4s ease-out',
      },
    },
  },
  plugins: [],
};
