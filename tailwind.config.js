const plugin = require("tailwindcss/plugin");
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {},
  },
  plugins: [
    plugin(function({ addUtilities }) {
      const safeArea = {
        ".p-safe-top": {
          paddingTop: "env(safe-area-inset-top)"
        },
        ".p-safe-left": {
          paddingLeft: "env(safe-area-inset-left)"
        },
        ".p-safe-right": {
          paddingRight: "env(safe-area-inset-right)"
        },
        ".p-safe-bottom": {
          paddingBottom: "env(safe-area-inset-bottom)"
        },
      };

      addUtilities(safeArea);
    })
  ],
}
