import type { Config } from "tailwindcss";

/**
 * ZEVORA design system.
 * Tokens live here and in app/globals.css (as CSS variables) so that both
 * Tailwind utilities and raw CSS/inline styles stay in sync.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./data/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Surfaces — deep blue-black, never pure grey
        void: "#05060C",
        abyss: "#080A14",
        surface: "#0D1020",
        elevated: "#121627",
        line: "#1E2338",
        // Brand
        zev: {
          50: "#EEF0FF",
          100: "#DCE0FF",
          200: "#BAC0FF",
          300: "#9299FF",
          400: "#6E71FF",
          500: "#5B4BFF",
          600: "#4B35F0",
          700: "#3C27C4",
          800: "#2E1E96",
          900: "#211670",
        },
        aqua: {
          300: "#5EEAD4",
          400: "#22D3EE",
          500: "#06B6D4",
        },
        gold: {
          300: "#FFD976",
          400: "#F5B841",
          500: "#DE9A18",
        },
        // Rarity scale
        rarity: {
          common: "#7C8AA6",
          rare: "#3E82F7",
          epic: "#A855F7",
          legendary: "#F5B841",
          mythic: "#FF3B6B",
        },
        success: "#2FD98A",
        danger: "#FF4D5E",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      borderRadius: {
        xl: "14px",
        "2xl": "20px",
        "3xl": "28px",
        "4xl": "36px",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(110,113,255,0.25), 0 18px 50px -12px rgba(91,75,255,0.45)",
        "glow-sm": "0 0 24px -6px rgba(91,75,255,0.55)",
        card: "0 24px 60px -30px rgba(0,0,0,0.9)",
        inner_top: "inset 0 1px 0 0 rgba(255,255,255,0.06)",
      },
      backgroundImage: {
        "grid-fade":
          "linear-gradient(to bottom, rgba(5,6,12,0) 0%, rgba(5,6,12,1) 90%)",
        "brand-gradient":
          "linear-gradient(120deg, #5B4BFF 0%, #7C5CFF 40%, #22D3EE 100%)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.45" },
          "50%": { opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "spin-slow": {
          to: { transform: "rotate(360deg)" },
        },
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
      },
      animation: {
        "fade-up": "fade-up .5s cubic-bezier(.22,1,.36,1) both",
        shimmer: "shimmer 1.8s infinite",
        "pulse-glow": "pulse-glow 3.2s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
        "spin-slow": "spin-slow 14s linear infinite",
        marquee: "marquee 40s linear infinite",
      },
      transitionTimingFunction: {
        premium: "cubic-bezier(.22,1,.36,1)",
      },
    },
  },
  plugins: [],
};

export default config;
