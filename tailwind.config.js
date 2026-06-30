/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        hand: ['"Shantell Sans"', "cursive"],
        marker: ['"Permanent Marker"', "cursive"],
        mono: ['"Space Mono"', "ui-monospace", "monospace"],
        sans: ['"Inter"', "system-ui", "sans-serif"],
      },
      colors: {
        // Cuarto de noche iluminado por una lámpara cálida.
        // A dorm room at night lit by a warm desk lamp.
        night: {
          900: "#15110c", // pared en sombra / wall in shadow
          800: "#1c1710",
          700: "#241d14",
          600: "#2e251a",
        },
        lamp: {
          DEFAULT: "#ffb454", // luz de lámpara / lamp light
          soft: "#ffcf8f",
          deep: "#e8893a",
        },
        paper: {
          DEFAULT: "#f3e9d2", // papel crema / cream paper
          aged: "#e8d9b5",
          ink: "#2c2419", // tinta sobre papel / ink on paper
        },
        sticky: {
          yellow: "#ffe27a",
          pink: "#ffb3c8",
          green: "#bdec8a",
          blue: "#a9d8ff",
        },
        marker: {
          red: "#ff6f61",
          blue: "#5b8def",
          green: "#5fbf7d",
        },
        cork: "#b98b54",
        ink: "#efe4cf", // texto claro sobre fondo oscuro / light text on dark
        muted: "#b6a787",
      },
      boxShadow: {
        note: "0 8px 22px rgba(0,0,0,0.35)",
        lift: "0 16px 40px rgba(0,0,0,0.45)",
        lamp: "0 0 120px 40px rgba(255,180,84,0.22)",
      },
      keyframes: {
        "fade-rise": {
          from: { opacity: "0", transform: "translateY(22px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        flicker: {
          "0%,100%": { opacity: "1" },
          "47%": { opacity: "0.92" },
          "49%": { opacity: "0.7" },
          "51%": { opacity: "0.95" },
        },
        twinkle: {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
        sway: {
          "0%,100%": { transform: "rotate(-1.5deg)" },
          "50%": { transform: "rotate(1.5deg)" },
        },
        scan: {
          from: { transform: "translateY(-100%)" },
          to: { transform: "translateY(100%)" },
        },
        float: {
          "0%,100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        blink: {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        "grid-scroll": {
          from: { backgroundPosition: "0 0" },
          to: { backgroundPosition: "0 46px" },
        },
      },
      animation: {
        "fade-rise": "fade-rise 0.7s cubic-bezier(0.2,0.8,0.2,1) both",
        flicker: "flicker 6s infinite",
        twinkle: "twinkle 3s ease-in-out infinite",
        sway: "sway 6s ease-in-out infinite",
        scan: "scan 7s linear infinite",
        float: "float 4s ease-in-out infinite",
        blink: "blink 1.2s step-end infinite",
        "grid-scroll": "grid-scroll 1.6s linear infinite",
      },
    },
  },
  plugins: [],
};
