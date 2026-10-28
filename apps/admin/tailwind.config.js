/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        "primary": "#c0c1ff",
        "primary-container": "#8083ff",
        "inverse-primary": "#494bd6",
        "secondary": "#4cd7f6",
        "secondary-container": "#03b5d3",
        "tertiary": "#4edea3",
        "tertiary-dim": "#00885d",
        "error": "#ffb4ab",
        "error-container": "#93000a",
        "surface-container-lowest": "#070a10",
        "surface-container-low": "#0b0f19",
        "surface-container": "#111624",
        "surface-container-high": "#181f31",
        "surface-container-highest": "#222a40",
        "on-surface": "#e2e7f5",
        "on-surface-variant": "#8e99b5",
        "outline": "#4b5570",
        "outline-variant": "#263047",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
        headline: ["Plus Jakarta Sans", "sans-serif"]
      }
    }
  },
  plugins: [],
}
