/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./src/**/*.{js,jsx,ts,tsx}"],
    theme: { extend: {
      animation: {
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        slideUp: {
          '0%': { 
            transform: 'translate(-50%, 100px)',
            opacity: '0',
          },
          '100%': { 
            transform: 'translate(-50%, 0)',
            opacity: '1',
          },
        },
      },
    }, },
    plugins: [],
};
