// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        editorial: {
          primary: "#0A3A2A",   // Verde oscuro editorial
          secondary: "#1B4D3E", // Verde medio
          accent: "#C5A880",    // Dorado suave / marfil para detalles
          light: "#F4F6F4",     // Fondo claro
          dark: "#111827",      // Texto principal
          beige: "#efe9e3a7",
        }
      },
    },
  },
  plugins: [],
}