/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#1d1d1f",
          soft: "#424245",
          muted: "#6e6e73",
          faint: "#86868b",
        },
        snow: {
          DEFAULT: "#ffffff",
          soft: "#f5f5f7",
          mist: "#fbfbfd",
        },
        gold: {
          DEFAULT: "#b8942c",
          soft: "#c9a84a",
          wash: "#f7f1e3",
          ring: "#e8d5a3",
        },
        silver: {
          DEFAULT: "#6b7280",
          wash: "#f3f4f6",
          ring: "#d1d5db",
        },
        platinum: {
          DEFAULT: "#64748b",
          wash: "#f1f5f9",
          ring: "#cbd5e1",
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
        glass: "0 8px 30px rgba(0, 0, 0, 0.04), 0 2px 8px rgba(0, 0, 0, 0.03)",
        lift: "0 16px 40px rgba(0, 0, 0, 0.06), 0 4px 12px rgba(0, 0, 0, 0.04)",
        cta: "0 10px 28px rgba(184, 148, 44, 0.28)",
      },
      backgroundImage: {
        mesh:
          "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(184, 148, 44, 0.12), transparent 55%), radial-gradient(ellipse 40% 35% at 100% 0%, rgba(100, 116, 139, 0.08), transparent 50%), radial-gradient(ellipse 35% 30% at 0% 20%, rgba(148, 163, 184, 0.1), transparent 50%)",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fadeUp 0.65s cubic-bezier(0.22, 1, 0.36, 1) both",
      },
    },
  },
  plugins: [],
}
