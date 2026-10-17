
document.addEventListener('DOMContentLoaded', function () {
    const conteneur = document.getElementById('carte');

    if (!conteneur) {
        console.error('Élément #carte introuvable.');
        return;
    }

    if (typeof L === 'undefined') {
        console.error('Leaflet n’est pas chargé.');
        return;
    }

    if (conteneur._leaflet_id) {
        console.warn('Carte déjà initialisée.');
        return;
    }

    const map = L.map(conteneur).setView([33.98, -6.87], 14);

    const osm = L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors'
        }
    ).addTo(map);

    const satellite = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
            maxZoom: 19,
            attribution: '&copy; Esri'
        }
    );

    L.control.layers({
        'OpenStreetMap': osm,
        'Satellite': satellite
    }).addTo(map);

    window.iavMap = map;
    console.log('Carte initialisée correctement.');
});
