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
        bg: {
          primary: "var(--bg-primary)",
          secondary: "var(--bg-secondary)",
          card: "var(--bg-card)",
        },
        gold: {
          primary: "var(--gold-primary)",
          light: "var(--gold-light)",
          dark: "var(--gold-dark)",
        },
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
        },
        border: {
          subtle: "var(--border-subtle)",
        },
      },
      fontFamily: {
        cinzel: ["var(--font-cinzel)", "serif"],
        dmsans: ["var(--font-dm-sans)", "sans-serif"],
        cairo: ["var(--font-cairo)", "sans-serif"],
      },
      backgroundImage: {
        "gold-gradient": "var(--gold-gradient)",
      },
      animation: {
        "spin-slow": "spin 60s linear infinite",
        "pulse-glow": "pulse-glow 3s infinite",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 10px rgba(201, 168, 76, 0.1)" },
          "50%": { boxShadow: "var(--glow-gold)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
