import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark alchemy lab background
        void: {
          950: "#05060a",
          900: "#0a0d16",
          850: "#0e1220",
        },
        // Bold light/dark blue (player / current glyph)
        azure: {
          300: "#7fd4ff",
          400: "#38b6ff",
          500: "#0d8fff",
          600: "#0568cc",
          700: "#0a3d7a",
        },
        // Gold / orange (target / win)
        aurum: {
          300: "#ffe3a3",
          400: "#ffc64d",
          500: "#f5a623",
          600: "#d97b0c",
          700: "#9a4b00",
        },
        // Danger (explosives)
        cinnabar: {
          400: "#ff6b5e",
          500: "#e63a25",
          600: "#b3180f",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      keyframes: {
        pulseglow: {
          "0%, 100%": { filter: "drop-shadow(0 0 6px rgba(56,182,255,0.8))" },
          "50%": { filter: "drop-shadow(0 0 18px rgba(56,182,255,1))" },
        },
        goldglow: {
          "0%, 100%": { filter: "drop-shadow(0 0 8px rgba(245,166,35,0.9))" },
          "50%": { filter: "drop-shadow(0 0 24px rgba(255,198,77,1))" },
        },
      },
      animation: {
        pulseglow: "pulseglow 2.2s ease-in-out infinite",
        goldglow: "goldglow 2.2s ease-in-out infinite",
      },
      backgroundImage: {
        "radial-void":
          "radial-gradient(ellipse at 50% 30%, rgba(13,15,32,0.9), #05060a 75%)",
      },
    },
  },
  plugins: [],
};
export default config;
