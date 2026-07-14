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
          muted: "#5c5c60",
          faint: "#6e6e73",
        },
        pearl: {
          DEFAULT: "#f5f3ee",
          soft: "#faf8f4",
          mist: "#ffffff",
        },
        gold: {
          DEFAULT: "#c9a227",
          deep: "#7a5608",
          soft: "#e8c96a",
          wash: "#fff6de",
        },
        silver: {
          DEFAULT: "#4b5c6e",
          deep: "#243040",
          soft: "#7d8fa3",
          wash: "#e8eef5",
        },
        platinum: {
          DEFAULT: "#1d6fb8",
          deep: "#0b3d6e",
          soft: "#4aa3e6",
          wash: "#e3f2ff",
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
          "0 1px 0 rgba(255,255,255,0.95) inset, 0 10px 28px rgba(29,29,31,0.06), 0 2px 8px rgba(29,29,31,0.04)",
        "glass-md":
          "0 1px 0 rgba(255,255,255,1) inset, 0 18px 44px rgba(29,29,31,0.08), 0 6px 16px rgba(29,29,31,0.05)",
        "glass-lg":
          "0 1px 0 rgba(255,255,255,1) inset, 0 28px 64px rgba(29,29,31,0.12), 0 12px 28px rgba(29,29,31,0.07)",
        "gold-glow": "0 16px 40px rgba(201, 162, 39, 0.32)",
        "silver-glow": "0 16px 40px rgba(75, 92, 110, 0.22)",
        "plat-glow": "0 16px 40px rgba(29, 111, 184, 0.24)",
      },
      backgroundImage: {
        mesh:
          "radial-gradient(ellipse 80% 50% at 50% -12%, rgba(232, 201, 106, 0.28), transparent 55%), radial-gradient(ellipse 50% 40% at 100% 8%, rgba(74, 163, 230, 0.22), transparent 52%), radial-gradient(ellipse 42% 36% at 0% 30%, rgba(125, 143, 163, 0.2), transparent 50%), radial-gradient(ellipse 35% 28% at 80% 85%, rgba(244, 114, 182, 0.08), transparent 50%), linear-gradient(180deg, #faf8f4 0%, #f0ebe3 100%)",
        "text-gold":
          "linear-gradient(120deg, #f5d76e 0%, #d4a017 28%, #a67c00 62%, #6b4a08 100%)",
        "text-silver":
          "linear-gradient(120deg, #94a3b8 0%, #64748b 22%, #334155 58%, #0f172a 100%)",
        "text-platinum":
          "linear-gradient(120deg, #38bdf8 0%, #0284c7 30%, #0369a1 62%, #0c4a6e 100%)",
        "text-brand":
          "linear-gradient(135deg, #3a3a3c 0%, #1d1d1f 50%, #334155 100%)",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(22px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        livePulse: {
          "0%, 100%": { opacity: "1", transform: "scale(1)", boxShadow: "0 0 0 0 rgba(16,185,129,0.45)" },
          "50%": { opacity: "0.7", transform: "scale(0.9)", boxShadow: "0 0 0 8px rgba(16,185,129,0)" },
        },
        floaty: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        shine: {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        aurora: {
          "0%, 100%": { opacity: "0.85", transform: "scale(1) translate(0,0)" },
          "50%": { opacity: "1", transform: "scale(1.05) translate(1%, -1%)" },
        },
        rowIn: {
          "0%": { opacity: "0", transform: "translateX(-10px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
      },
      animation: {
        "fade-up": "fadeUp 0.8s cubic-bezier(0.22, 1, 0.36, 1) both",
        live: "livePulse 2s ease-in-out infinite",
        floaty: "floaty 3.5s ease-in-out infinite",
        shine: "shine 4s ease-in-out infinite",
        aurora: "aurora 12s ease-in-out infinite",
        "row-in": "rowIn 0.55s cubic-bezier(0.22, 1, 0.36, 1) both",
      },
    },
  },
  plugins: [],
}
