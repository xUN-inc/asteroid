import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

const rootEl = document.getElementById("root");
const root = ReactDOM.createRoot(rootEl);

// Tailwind CDN'i programatik olarak yükle ve YÜKLENDİKTEN SONRA render et
function loadTailwindThenRender() {
    // Eğer daha önce eklenmişse tekrar ekleme
    if (document.querySelector('script[src*="cdn.tailwindcss.com"]')) {
        render();
        return;
    }

    const s = document.createElement("script");
    s.src = "https://cdn.tailwindcss.com";
    s.async = true;
    s.onload = () => {
        const fix = document.createElement("style");
        fix.innerHTML = `
  .leaflet-container img.leaflet-image-layer,
  .leaflet-container .leaflet-tile,
  .leaflet-pane > img,
  .leaflet-marker-icon,
  .leaflet-marker-shadow {
    max-width: none !important;
  }`;
        document.head.appendChild(fix);
        render();
    };
    s.onerror = () => {
        console.warn("Tailwind CDN yüklenemedi. Yine de uygulamayı başlatıyorum.");
        render();
    };
    document.head.appendChild(s);
}

function render() {
    root.render(<App />);
}

loadTailwindThenRender();
