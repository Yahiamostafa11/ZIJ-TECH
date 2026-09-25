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
          primary: "rgb(var(--bg-primary) / <alpha-value>)",
          secondary: "rgb(var(--bg-secondary) / <alpha-value>)",
          card: "rgb(var(--bg-card) / <alpha-value>)",
        },
        gold: {
          primary: "rgb(var(--gold-primary) / <alpha-value>)",
          light: "rgb(var(--gold-light) / <alpha-value>)",
          dark: "rgb(var(--gold-dark) / <alpha-value>)",
        },
        text: {
          primary: "rgb(var(--text-primary) / <alpha-value>)",
          secondary: "rgb(var(--text-secondary) / <alpha-value>)",
        },
        border: {
          // The subtle border is gold at 28%; a modifier scales that base alpha.
          subtle: "rgb(var(--gold-primary) / calc(0.28 * <alpha-value>))",
        },
        /** Text on gold (filled buttons). */
        "on-accent": "rgb(var(--on-accent) / <alpha-value>)",
        danger: "rgb(var(--danger) / <alpha-value>)",
        success: "rgb(var(--success) / <alpha-value>)",
        warning: "rgb(var(--warning) / <alpha-value>)",
        info: "rgb(var(--info) / <alpha-value>)",
        /** Form field background, row hover and modal backdrop; set per theme. */
        field: "var(--field)",
        hover: "var(--hover)",
        overlay: "var(--overlay)",
      },
      boxShadow: {
        card: "0 20px 60px rgb(var(--shadow) / calc(0.22 * var(--shadow-strength)))",
        float: "0 18px 70px rgb(var(--shadow) / calc(0.34 * var(--shadow-strength)))",
        "float-strong": "0 18px 80px rgb(var(--shadow) / calc(0.48 * var(--shadow-strength)))",
        button: "0 10px 28px rgb(var(--shadow) / calc(0.22 * var(--shadow-strength)))",
        focus: "0 0 0 3px rgb(var(--gold-primary) / 0.14)",
        "glow-sm": "0 0 24px rgb(var(--gold-light) / 0.14)",
      },
      opacity: {
        8: "0.08",
        12: "0.12",
        14: "0.14",
        16: "0.16",
        78: "0.78",
        82: "0.82",
        86: "0.86",
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
