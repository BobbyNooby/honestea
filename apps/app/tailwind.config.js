/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: "class",
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // HonesTea brand "tea" layer — opt-in accents for marketing,
        // logo, and savings/transparency callouts. In-product chrome
        // continues to use zinc + blue. See honestea-ai-design-system
        // /project/colors_and_type.css.
        matcha: {
          50: "#f3f7ec",
          100: "#e3edcf",
          200: "#cadda7",
          300: "#aac882",
          400: "#8eb56b",
          500: "#6e9b4e",
          600: "#5b8a3a", // brand default (light mode)
          700: "#466b2c",
          800: "#344f22",
          900: "#24371a",
        },
        oolong: {
          100: "#f4e7d2",
          200: "#e8cda3",
          300: "#d9a26a",
          400: "#c2884a",
          500: "#a76b30",
          600: "#8a541f",
        },
        chamomile: {
          50: "#fdfbf2",
          100: "#fbf6e9",
          200: "#f6ecd1",
          900: "#1a1812",
          950: "#0f0e09",
        },
      },
    },
  },
  plugins: [],
}
