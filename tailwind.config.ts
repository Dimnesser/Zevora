import type { Config } from "tailwindcss";

/**
 * ZEVORA design system.
 *
 * Tokens live here and in app/globals.css (as CSS variables) so Tailwind
 * utilities and raw CSS/inline styles stay in sync.
 *
 * Three rules hold the look together:
 *
 * 1. Surfaces are a ladder, not one frosted panel repeated. `ink` is the
 *    page, and each step up (`slab`, `panel`, `raised`, `overlay`) is
 *    lighter and slightly less transparent, so depth reads without
 *    borders doing all the work.
 *
 * 2. Accent is scarce. Brand violet marks one primary action per view and
 *    the active nav item; `ice` carries focus and live state; `gold` is
 *    money and nothing else. A screen full of gradient buttons is the
 *    failure mode this avoids.
 *
 * 3. Radii stay small. Game UI reads as machined, not rounded — 2 to 14px,
 *    with anything larger reserved for full-bleed overlays.
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
        // ── surfaces: a graphite ladder, never pure grey, never pure black
        void: "#06070B",
        ink: "#0A0C12",
        slab: "#0F121A",
        panel: "#141824",
        raised: "#1A1F2E",
        overlay: "#1F2434",
        line: "#232937",
        "line-soft": "#1A1F2B",

        // ── brand: used sparingly, one primary action per view
        zev: {
          50: "#EFF0FF",
          100: "#DCDEFF",
          200: "#BBBEFF",
          300: "#9398FF",
          400: "#7075FF",
          500: "#5B4BFF",
          600: "#4A38E8",
          700: "#3A2AB8",
          800: "#2B1F8A",
          900: "#1E1663",
        },

        // ── ice: focus, live indicators, technical highlights
        ice: {
          300: "#8FF2FF",
          400: "#5AE4FF",
          500: "#22D3EE",
          600: "#0EA5C4",
        },

        // ── gold: money only
        gold: {
          300: "#FFDD8A",
          400: "#F5B841",
          500: "#D9971C",
        },

        // ── Valve's real grades, matching the `rarities` table
        rarity: {
          consumer: "#B0C3D9",
          industrial: "#5E98D9",
          milspec: "#4B69FF",
          restricted: "#8847FF",
          classified: "#D32CE6",
          covert: "#EB4B4B",
          extraordinary: "#CAAB05",
          contraband: "#E4AE39",
        },

        success: "#34D399",
        warn: "#FBBF24",
        danger: "#F65C6B",
      },

      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },

      // Machined, not pill-shaped.
      borderRadius: {
        none: "0",
        xs: "2px",
        sm: "4px",
        DEFAULT: "6px",
        md: "8px",
        lg: "10px",
        xl: "14px",
        "2xl": "18px",
        "3xl": "24px",
      },

      fontSize: {
        // Small-caps technical labels used all over the HUD
        label: ["10px", { lineHeight: "1.2", letterSpacing: "0.14em" }],
        micro: ["11px", { lineHeight: "1.35", letterSpacing: "0.04em" }],
      },

      boxShadow: {
        // Depth, in the same ladder as the surfaces
        e1: "0 1px 2px rgba(0,0,0,.4)",
        e2: "0 4px 14px -6px rgba(0,0,0,.65)",
        e3: "0 16px 40px -18px rgba(0,0,0,.85)",
        e4: "0 32px 80px -32px rgba(0,0,0,.95)",
        // The 1px top highlight that makes a dark surface look lit
        lip: "inset 0 1px 0 0 rgba(255,255,255,.055)",
        "lip-strong": "inset 0 1px 0 0 rgba(255,255,255,.09)",
        focus: "0 0 0 2px rgba(90,228,255,.55)",
      },

      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        shimmer: { to: { transform: "translateX(100%)" } },
        breathe: {
          "0%, 100%": { opacity: "0.35" },
          "50%": { opacity: "0.85" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "spin-slow": { to: { transform: "rotate(360deg)" } },
        marquee: { from: { transform: "translateX(0)" }, to: { transform: "translateX(-50%)" } },
        // A light sweeping across a surface on hover
        sheen: {
          from: { transform: "translateX(-120%) skewX(-18deg)" },
          to: { transform: "translateX(320%) skewX(-18deg)" },
        },
        "rise-in": {
          from: { opacity: "0", transform: "translateY(16px) scale(.985)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },

      animation: {
        "fade-up": "fade-up .45s cubic-bezier(.22,1,.36,1) both",
        "fade-in": "fade-in .3s ease-out both",
        "rise-in": "rise-in .5s cubic-bezier(.22,1,.36,1) both",
        shimmer: "shimmer 1.6s infinite",
        breathe: "breathe 3.4s ease-in-out infinite",
        float: "float 7s ease-in-out infinite",
        "spin-slow": "spin-slow 18s linear infinite",
        marquee: "marquee 44s linear infinite",
        sheen: "sheen .9s cubic-bezier(.4,0,.2,1)",
      },

      transitionTimingFunction: {
        premium: "cubic-bezier(.22,1,.36,1)",
        snap: "cubic-bezier(.34,1.4,.44,1)",
      },
    },
  },
  plugins: [],
};

export default config;
