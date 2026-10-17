// Géoportail IAV : version statique (GitHub Pages), couches chargées depuis des fichiers GeoJSON

// 1. Carte (l'élément HTML doit être <div id="map"></div> dans index.html)
const map = L.map('map').setView([33.88, -6.87], 15);

// 2. Fonds de carte
const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap'
}).addTo(map);

const satellite = L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  { maxZoom: 19, attribution: 'Esri World Imagery' }
);

// 3. Contrôle des couches
const controleCouches = L.control.layers(
  { 'OpenStreetMap': osm, 'Satellite': satellite },
  {},
  { collapsed: false }
).addTo(map);

// 4. Chargement d'une couche GeoJSON
function chargerCouche(fichier, nom, style, options = {}) {
  fetch(fichier)
    .then(r => {
      if (!r.ok) throw new Error('HTTP ' + r.status + ' pour ' + fichier);
      return r.json();
    })
    .then(data => {
      const couche = L.geoJSON(data, {
        style: style,
        pointToLayer: (f, latlng) =>
          L.circleMarker(latlng, { radius: 4, ...style }),
        onEachFeature: (f, l) => {
          const p = f.properties || {};
          const html = Object.entries(p)
            .map(([k, v]) => `<b>${k}</b> : ${v}`)
            .join('<br>');
          if (html) l.bindPopup(html);
        }
      });
      if (options.visible !== false) couche.addTo(map);
      controleCouches.addOverlay(couche, nom);
    })
    .catch(e => console.error('Erreur de chargement :', e));
}

// 5. Couches (les noms de fichiers doivent correspondre exactement à ceux du dépôt)
chargerCouche('batimav0.geojson', 'Bâtiments',
  { color: '#8b0000', weight: 1.5, fillColor: '#ff6666', fillOpacity: 0.6 });

chargerCouche('roads_iav.geojson', 'Routes',
  { color: '#337ab7', weight: 2 });

chargerCouche('iavarbre.geojson', 'Arbres',
  { color: '#2e8b57', weight: 1, fillColor: '#2e8b57', fillOpacity: 0.8 });
