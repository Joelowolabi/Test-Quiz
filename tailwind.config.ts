import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        navy: {
          950: "#060a14",
          900: "#0c1322",
          850: "#10192e",
          800: "#16233f",
          700: "#1e3056",
        },
        gold: {
          300: "#fde68a",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
        },
        pastel: {
          blue: "#eff6ff",
          amber: "#fffbeb",
          emerald: "#ecfdf5",
          purple: "#f5f3ff",
          slate: "#f8fafc",
        },
        young: {
          green: "#4ade80",
          orange: "#f97316",
          purple: "#6366f1",
          black: "#0b0b0b",
          white: "#ffffff",
        }
      },
      fontFamily: {
        sans: ['var(--font-manrope)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
