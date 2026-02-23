import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef8f2',
          500: '#2f855a',
          700: '#256947'
        },
        accent: '#d97706'
      }
    }
  },
  plugins: []
} satisfies Config;
