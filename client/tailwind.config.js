/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#1A56DB",
        "primary-hover": "#1E429F",
        "primary-light": "#EFF6FF",
        "primary-border": "#BFDBFE",
        "text-primary": "#1E3A5F",
        "text-secondary": "#6B7280",
        danger: "#DC2626",
        success: "#16A34A",
        warning: "#D97706",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
}