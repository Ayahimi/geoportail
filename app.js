
console.log("Chargement de app.js");

const conteneur = document.getElementById("carte");

if (!conteneur) {
    console.error("ERREUR : élément #carte introuvable dans index.html");
} else if (typeof L === "undefined") {
    console.error("ERREUR : Leaflet n'est pas chargé");
} else if (conteneur._leaflet_id) {
    console.warn("La carte Leaflet est déjà initialisée.");
} else {
    const map = L.map(conteneur).setView([33.98, -6.87], 14);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);

    console.log("Carte initialisée avec succès.");

    window.iavMap = map;
}
