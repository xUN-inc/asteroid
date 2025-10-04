/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./src/**/*.{js,jsx,ts,tsx}"],
    theme: {
        extend: {
            colors: {
                "blue-yonder": "#2E96F5",
                "neon-blue": "#0960E1",
                "electric-blue": "#0042A6",
                "deep-blue": "#07173F",
                "rocket-red": "#E43700",
                "martian-red": "#8E1100",
                "neon-yellow": "#EAFE07",
            },
        },
    },
    plugins: [],
};
