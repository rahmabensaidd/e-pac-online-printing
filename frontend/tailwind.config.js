/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        'brand-orange': '#FF6B35',
        'brand-teal': '#00D9C0',
        'brand-pink': '#FF006E',
        'brand-navy': '#1A1A2E',
        'brand-cream': '#F7F5F0',
        'brand-lime': '#CCFF00',
      },
      fontFamily: {
        sans: ['Space Grotesk', 'ui-sans-serif', 'system-ui'],
        display: ['Syne', 'ui-sans-serif', 'system-ui'],
      },
    },
  },
  plugins: [],
};
