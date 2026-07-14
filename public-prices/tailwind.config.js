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
          soft: "#3a3a3c",
          muted: "#6e6e73",
          faint: "#86868b",
        },
        pearl: {
          DEFAULT: "#f7f6f3",
          soft: "#faf9f7",
          mist: "#ffffff",
        },
        gold: {
          DEFAULT: "#c9a227",
          deep: "#8b6914",
          soft: "#e8c96a",
          wash: "#fbf6e9",
        },
        silver: {
          DEFAULT: "#8e9aab",
          deep: "#5c6775",
          soft: "#c5ced9",
          wash: "#f4f6f8",
        },
        platinum: {
          DEFAULT: "#7a8fa6",
          deep: "#4a5d73",
          soft: "#b8c9da",
          wash: "#f2f6fa",
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
        "glass-sm":
          "0 1px 0 rgba(255,255,255,0.9) inset, 0 10px 30px rgba(29,29,31,0.05), 0 2px 8px rgba(29,29,31,0.04)",
        "glass-md":
          "0 1px 0 rgba(255,255,255,0.95) inset, 0 18px 40px rgba(29,29,31,0.07), 0 6px 16px rgba(29,29,31,0.05)",
        "glass-lg":
          "0 1px 0 rgba(255,255,255,1) inset, 0 28px 60px rgba(29,29,31,0.1), 0 10px 24px rgba(29,29,31,0.06)",
        "gold-glow": "0 16px 40px rgba(201, 162, 39, 0.28)",
      },
      backgroundImage: {
        mesh:
          "radial-gradient(ellipse 90% 55% at 50% -15%, rgba(232, 201, 106, 0.22), transparent 55%), radial-gradient(ellipse 45% 40% at 100% 5%, rgba(184, 201, 218, 0.2), transparent 50%), radial-gradient(ellipse 40% 35% at 0% 25%, rgba(201, 162, 39, 0.1), transparent 50%), linear-gradient(180deg, #faf9f7 0%, #f3f1ec 100%)",
        "text-gold": "linear-gradient(135deg, #f0d78c 0%, #c9a227 42%, #8b6914 100%)",
        "text-silver": "linear-gradient(135deg, #f4f6f8 0%, #a8b4c2 40%, #5c6775 100%)",
        "text-platinum": "linear-gradient(135deg, #eef4fa 0%, #9fb4c9 42%, #4a5d73 100%)",
        "text-brand": "linear-gradient(135deg, #3a3a3c 0%, #1d1d1f 55%, #5c6775 100%)",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(18px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        livePulse: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.45", transform: "scale(0.85)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "100% 50%" },
        },
      },
      animation: {
        "fade-up": "fadeUp 0.75s cubic-bezier(0.22, 1, 0.36, 1) both",
        live: "livePulse 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
}
