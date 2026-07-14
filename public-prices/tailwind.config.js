/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        midnight: {
          950: "#05070d",
          900: "#0a0e17",
          850: "#0f1420",
          800: "#151b2b",
        },
        gold: {
          soft: "#d4b56a",
          DEFAULT: "#c9a227",
          bright: "#e8c96a",
        },
        metal: {
          silver: "#c5cdd8",
          platinum: "#a8b4c4",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
      boxShadow: {
        glass: "0 8px 32px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.06)",
        glow: "0 0 40px rgba(201, 162, 39, 0.12)",
        cta: "0 12px 40px rgba(201, 162, 39, 0.25)",
      },
      backgroundImage: {
        "mesh-dark":
          "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(201, 162, 39, 0.18), transparent 55%), radial-gradient(ellipse 50% 40% at 100% 0%, rgba(59, 130, 246, 0.12), transparent 50%), radial-gradient(ellipse 45% 35% at 0% 30%, rgba(148, 163, 184, 0.08), transparent 50%)",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fadeUp 0.7s cubic-bezier(0.22, 1, 0.36, 1) both",
      },
    },
  },
  plugins: [],
}
