
/* =====================================================
   GEOPORTAIL IAV - VERSION GITHUB PAGES
   Couches GeoJSON : arbre, batiment et routes
   ===================================================== */

// 1. Initialisation de la carte
const map = L.map('map').setView([33.98, -6.87], 14);

// 2. Fonds de carte
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
    attribution: 'Tiles &copy; Esri'
  }
);

// 3. Controle des fonds et des couches
const controleCouches = L.control.layers(
  {
    'OpenStreetMap': osm,
    'Satellite': satellite
  },
  {},
  {
    collapsed: false
  }
).addTo(map);

// 4. Styles des couches
const styleBatiments = {
  color: '#8b0000',
  weight: 1.5,
  fillColor: '#ff6666',
  fillOpacity: 0.6
};

const styleRoutes = {
  color: '#337ab7',
  weight: 2,
  opacity: 0.9
};

const styleArbres = {
  color: '#2e8b57',
  weight: 1,
  fillColor: '#2e8b57',
  fillOpacity: 0.8
};

// 5. Creation des popups
function creerPopup(feature) {
  const proprietes = feature.properties || {};

  const contenu = Object.entries(proprietes)
    .map(([cle, valeur]) => {
      const valeurAffichee =
        valeur === null || valeur === undefined
          ? 'Non renseigne'
          : String(valeur);

      return `<b>${cle}</b> : ${valeurAffichee}`;
    })
    .join('<br>');

  return contenu || 'Aucun attribut disponible';
}

// 6. Chargement des couches GeoJSON
const couchesChargees = [];
let nombreCouchesTraitees = 0;

function chargerCouche(fichier, nom, style, type) {
  fetch('./' + fichier)
    .then(response => {
      if (!response.ok) {
        throw new Error(
          'Erreur HTTP ' + response.status +
          ' pour le fichier ' + fichier
        );
      }

      return response.json();
    })
    .then(data => {
      if (
        data.type !== 'FeatureCollection' &&
        data.type !== 'Feature'
      ) {
        throw new Error('Format GeoJSON invalide : ' + fichier);
      }

      const couche = L.geoJSON(data, {
        style: () => ({ ...style }),

        pointToLayer: (feature, latlng) => {
          if (type === 'arbre') {
            return L.circleMarker(latlng, {
              ...style,
              radius: 5
            });
          }

          return L.marker(latlng);
        },

        onEachFeature: (feature, layer) => {
          layer.bindPopup(creerPopup(feature));
        }
      });

      if (couche.getLayers().length === 0) {
        console.warn('Aucune entite dans ' + fichier);
      } else {
        couche.addTo(map);
        controleCouches.addOverlay(couche, nom);
        couchesChargees.push(couche);

        console.log(
          nom + ' : ' + couche.getLayers().length +
          ' entites chargees'
        );
      }
    })
    .catch(erreur => {
      console.error('Erreur de chargement :', erreur);
    })
    .finally(() => {
      nombreCouchesTraitees++;

      // Cadrer la carte sur l'ensemble des couches chargees
      if (
        nombreCouchesTraitees === 3 &&
        couchesChargees.length > 0
      ) {
        const groupe = L.featureGroup(couchesChargees);
        const emprise = groupe.getBounds();

        if (emprise.isValid()) {
          map.fitBounds(emprise, {
            padding: [20, 20],
            maxZoom: 17
          });
        }
      }
    });
}

// 7. Chargement des trois fichiers
chargerCouche(
  'batiment.geojson',
  'Batiments',
  styleBatiments,
  'batiment'
);

chargerCouche(
  'routes.geojson',
  'Routes',
  styleRoutes,
  'routes'
);

chargerCouche(
  'arbre.geojson',
  'Arbres',
  styleArbres,
  'arbre'
);
