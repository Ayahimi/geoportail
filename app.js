
console.log("app.js est chargé");

const map = L.map('carte').setView([33.98, -6.87], 14);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

console.log("Carte Leaflet initialisée");
