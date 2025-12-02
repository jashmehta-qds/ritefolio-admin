import { heroui } from "@heroui/theme";

/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
    },
  },
  darkMode: "class",
  plugins: [
    heroui({
      themes: {
        light: {
          colors: {
            primary: {
              50: "#f6f2fa",
              100: "#ede5f5",
              200: "#d7c2eb",
              300: "#be99de",
              400: "#a06ad0",
              500: "#9353d3",
              600: "#7a3bb2",
              700: "#6a329a",
              800: "#55277a",
              900: "#3d1b57",
              foreground: "#FFFFFF",
              DEFAULT: "#9353d3",
            },
            secondary: "#006FEE",
          },
        },
        dark: {
          colors: {
            primary: {
              50: "#f6f2fa",
              100: "#ede5f5",
              200: "#d7c2eb",
              300: "#be99de",
              400: "#a06ad0",
              500: "#9353d3",
              600: "#7a3bb2",
              700: "#6a329a",
              800: "#55277a",
              900: "#3d1b57",
              DEFAULT: "#9353d3",
            },
            secondary: "#006FEE",
          },
        },
      },
    }),
  ],
};

module.exports = config;
