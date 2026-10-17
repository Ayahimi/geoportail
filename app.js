
document.addEventListener('DOMContentLoaded', function () {

    // 1. Initialisation de la carte
    const conteneur = document.getElementById('carte');

    if (!conteneur || typeof L === 'undefined') {
        console.error('Carte ou Leaflet introuvable.');
        return;
    }

    if (conteneur._leaflet_id) {
        console.error('La carte est deja initialisee.');
        return;
    }

    const map = L.map(conteneur).setView([33.98, -6.87], 14);
    window.iavMap = map;

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
            attribution: '&copy; Esri'
        }
    );

    // 3. Controle des couches
    const controle = L.control.layers(
        {
            'OpenStreetMap': osm,
            'Satellite': satellite
        },
        {},
        { collapsed: false }
    ).addTo(map);

    // 4. Styles
    const styles = {
        batiments: {
            color: '#8b0000',
            weight: 1.5,
            fillColor: '#ff6666',
            fillOpacity: 0.6
        },
        routes: {
            color: '#337ab7',
            weight: 3,
            opacity: 0.9
        },
        arbres: {
            color: '#2e8b57',
            fillColor: '#2e8b57',
            fillOpacity: 0.9,
            weight: 1,
            radius: 5
        }
    };

    // 5. Popup des attributs
    function creerPopup(feature) {
        const proprietes = feature.properties || {};

        const contenu = Object.entries(proprietes)
            .map(([cle, valeur]) =>
                '<b>' + cle + '</b> : ' +
                String(valeur ?? 'Non renseigne')
            )
            .join('<br>');

        return contenu || 'Aucun attribut disponible';
    }

    // 6. Chargement GeoJSON
    const couches = [];
    const cases = {
        batiments: document.getElementById('chkBatiments'),
        routes: document.getElementById('chkRoutes'),
        arbres: document.getElementById('chkArbres')
    };

    function chargerCouche(fichier, nom, style, type, cle) {
        fetch('./' + fichier)
            .then(response => {
                if (!response.ok) {
                    throw new Error(
                        'HTTP ' + response.status +
                        ' - verifier le nom et le chemin de ' + fichier
                    );
                }

                return response.json();
            })
            .then(data => {
                const couche = L.geoJSON(data, {
                    style: () => ({ ...style }),

                    pointToLayer: (feature, latlng) => {
                        if (type === 'point') {
                            return L.circleMarker(latlng, {
                                ...style,
                                radius: style.radius || 5
                            });
                        }

                        return L.marker(latlng);
                    },

                    onEachFeature: (feature, layer) => {
                        layer.bindPopup(creerPopup(feature));
                    }
                });

                if (couche.getLayers().length === 0) {
                    throw new Error(
                        fichier + ' ne contient aucune entite affichable.'
                    );
                }

                couches.push(couche);
                controle.addOverlay(couche, nom);

                // Respecter la case a cocher
                if (!cases[cle] || cases[cle].checked) {
                    couche.addTo(map);
                }

                if (cases[cle]) {
                    cases[cle].addEventListener('change', function () {
                        if (this.checked) {
                            if (!map.hasLayer(couche)) {
                                couche.addTo(map);
                            }
                        } else {
                            map.removeLayer(couche);
                        }
                    });
                }

                console.log(
                    nom + ' charge : ' + couche.getLayers().length +
                    ' entites.'
                );

                // Ajuster la carte sur les couches visibles
                const couchesVisibles = couches.filter(c =>
                    map.hasLayer(c)
                );

                if (couchesVisibles.length > 0) {
                    const groupe = L.featureGroup(couchesVisibles);
                    const limites = groupe.getBounds();

                    if (limites.isValid()) {
                        map.fitBounds(limites, {
                            padding: [20, 20],
                            maxZoom: 17
                        });
                    }
                }
            })
            .catch(erreur => {
                console.error('Erreur pour ' + fichier + ' :', erreur);
            });
    }

    // 7. Fichiers du depot GitHub
    chargerCouche(
        'batiment.geojson',
        'Batiments',
        styles.batiments,
        'polygone',
        'batiments'
    );

    chargerCouche(
        'routes.geojson',
        'Routes',
        styles.routes,
        'ligne',
        'routes'
    );

    chargerCouche(
        'arbre.geojson',
        'Arbres',
        styles.arbres,
        'point',
        'arbres'
    );

});
