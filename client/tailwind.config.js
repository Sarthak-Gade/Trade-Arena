/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: '#0b0f19',      // Sleek deep dark navy-slate
        cardBg: '#111827',      // Zinc/Gray-900 card background
        cardBorder: '#1f2937',  // Gray-800 card border
        accentBlue: '#2563eb',  // Premium Blue
        accentGreen: '#10b981', // Emerald Green for profits
        accentRed: '#ef4444',   // Rose Red for losses
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
