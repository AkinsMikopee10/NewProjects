import scrollbarHide from "tailwind-scrollbar-hide";

export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Syne", "sans-serif"],
        body: ["Plus Jakarta Sans", "sans-serif"],
      },
      colors: {
        bg: "#0a0f1e",
        primary: "#6c63ff",
        accent: "#00d4aa",
        blue: "#3b82f6",
      },
    },
  },
  plugins: [scrollbarHide],
};
