import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Truck Loads theme: green, silver and white
        brand: {
          50: "#EDF7F1", 100: "#D5EDDE", 200: "#A9DBBD", 300: "#74C396", 400: "#3FA56D",
          500: "#22894F", 600: "#1A7340", 700: "#145E34", 800: "#0F4A29", 900: "#0B3820",
        },
        silver: {
          50: "#F8F9FA", 100: "#F1F3F5", 200: "#E3E6EA", 300: "#C9CED4", 400: "#A3AAB2",
          500: "#7B838C", 600: "#5C636B", 700: "#454B52", 800: "#2F3439", 900: "#1D2125",
        },
      },
    },
  },
  plugins: [],
};
export default config;
