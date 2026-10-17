
const carte = L.map("carte");

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
}).addTo(carte);

// -----------------------------
// 1. COUCHES GEOSERVER
// -----------------------------

const urlWMS = "http://localhost:8080/geoserver/opengeo/wms";

const optionsWMS = {
    format: "image/png",
    transparent: true,
    version: "1.1.1"
};

const batiments = L.tileLayer.wms(urlWMS, {
    ...optionsWMS,
    layers: "opengeo:batimav0"
});

const routes = L.tileLayer.wms(urlWMS, {
    ...optionsWMS,
    layers: "opengeo:roads_iav"
});

const arbres = L.tileLayer.wms(urlWMS, {
    ...optionsWMS,
    layers: "opengeo:iavarbre"
});

batiments.addTo(carte);
routes.addTo(carte);
arbres.addTo(carte);

carte.setView([33.98, -6.87], 14);

// Gestion des cases à cocher
function gererCouche(id, couche) {
    const controle = document.getElementById(id);

    if (!controle) return;

    controle.addEventListener("change", function () {
        if (this.checked) {
            couche.addTo(carte);
        } else {
            carte.removeLayer(couche);
        }
    });
}

gererCouche("chkBatiments", batiments);
gererCouche("chkRoutes", routes);
gererCouche("chkArbres", arbres);


// -----------------------------
// 2. CONFIGURATION WPS / WFS
// -----------------------------

const adresseWPS = "/geoportail/proxy.php";
const adresseWFS = "http://localhost:8080/geoserver/wfs";

async function executerWPS(processus, sortie, typeName = "opengeo:batimav0") {
    const resultat = document.getElementById("resultat");

    if (!resultat) {
        alert("Élément HTML resultat introuvable.");
        return;
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<wps:Execute
    service="WPS"
    version="1.0.0"
    xmlns:wps="http://www.opengis.net/wps/1.0.0"
    xmlns:ows="http://www.opengis.net/ows/1.1"
    xmlns:wfs="http://www.opengis.net/wfs"
    xmlns:xlink="http://www.w3.org/1999/xlink">

    <ows:Identifier>${processus}</ows:Identifier>

    <wps:DataInputs>
        <wps:Input>
            <ows:Identifier>features</ows:Identifier>

            <wps:Reference
                mimeType="text/xml"
                xlink:href="${adresseWFS}"
                method="POST">

                <wps:Body>
                    <![CDATA[
                    <wfs:GetFeature
                        service="WFS"
                        version="1.0.0"
                        outputFormat="GML2"
                        xmlns:wfs="http://www.opengis.net/wfs"
                        xmlns:opengeo="http://opengeo.org">
                        <wfs:Query typeName="${typeName}"/>
                    </wfs:GetFeature>
                    ]]>
                </wps:Body>

            </wps:Reference>
        </wps:Input>
    </wps:DataInputs>

    <wps:ResponseForm>
        <wps:RawDataOutput>
            <ows:Identifier>${sortie}</ows:Identifier>
        </wps:RawDataOutput>
    </wps:ResponseForm>

</wps:Execute>`;

    resultat.textContent = "Exécution de " + processus + "…";

    try {
        const reponse = await fetch(adresseWPS, {
            method: "POST",
            headers: {
                "Content-Type": "text/xml; charset=UTF-8"
            },
            body: xml
        });

        const texte = await reponse.text();

        if (!reponse.ok) {
            throw new Error(
                "HTTP " + reponse.status + "\n" + texte
            );
        }

        if (
            texte.includes("<ows:ExceptionReport") ||
            texte.includes("<wps:ProcessFailed")
        ) {
            resultat.textContent =
                "GeoServer a renvoyé une erreur :\n\n" + texte;
            return;
        }

        resultat.textContent = texte;

    } catch (erreur) {
        resultat.textContent =
            "Échec de la requête : " + erreur.message +
            "\nVérifie que XAMPP, Apache et GeoServer fonctionnent.";
    }
}


// -----------------------------
// 3. BOUTONS DES REQUÊTES WPS
// -----------------------------

function executerBounds() {
    executerWPS("gs:Bounds", "bounds", "opengeo:batimav0");
}

function executerCentroid() {
    executerWPS("gs:Centroid", "result", "opengeo:batimav0");
}

function executerCompterArbres() {
    executerWPS("gs:Count", "result", "opengeo:iavarbre");
}

function executerCompterBatiments() {
    executerWPS("gs:Count", "result", "opengeo:batimav0");
}

let coucheAnalyseLayer = null;

function reprojeterCoordonnees(coords) {
    if (typeof coords[0] === 'number') {
        const lonLat = proj4("EPSG:26191", "EPSG:4326", coords);
        return lonLat;
    } else {
        return coords.map(reprojeterCoordonnees);
    }
}

async function executerBuffer() {
    const resultat = document.getElementById("resultat");

    if (!resultat) {
        alert("Élément HTML resultat introuvable.");
        return;
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<wps:Execute version="1.0.0" service="WPS" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://www.opengis.net/wps/1.0.0" xmlns:wfs="http://www.opengis.net/wfs" xmlns:wps="http://www.opengis.net/wps/1.0.0" xmlns:ows="http://www.opengis.net/ows/1.1" xmlns:gml="http://www.opengis.net/gml" xmlns:ogc="http://www.opengis.net/ogc" xmlns:wcs="http://www.opengis.net/wcs/1.1.1" xmlns:xlink="http://www.w3.org/1999/xlink" xsi:schemaLocation="http://www.opengis.net/wps/1.0.0 http://schemas.opengis.net/wps/1.0.0/wpsAll.xsd">
  <ows:Identifier>gs:BufferFeatureCollection</ows:Identifier>
  <wps:DataInputs>
    <wps:Input>
      <ows:Identifier>features</ows:Identifier>
      <wps:Reference mimeType="text/xml" xlink:href="${adresseWFS}" method="POST">
        <wps:Body>
          <![CDATA[
          <wfs:GetFeature service="WFS" version="1.0.0" outputFormat="GML2" xmlns:wfs="http://www.opengis.net/wfs" xmlns:opengeo="http://opengeo.org">
            <wfs:Query typeName="opengeo:roads_iav"/>
          </wfs:GetFeature>
          ]]>
        </wps:Body>
      </wps:Reference>
    </wps:Input>
    <wps:Input>
      <ows:Identifier>distance</ows:Identifier>
      <wps:Data>
        <wps:LiteralData>10</wps:LiteralData>
      </wps:Data>
    </wps:Input>
  </wps:DataInputs>
  <wps:ResponseForm>
    <wps:RawDataOutput mimeType="application/json">
      <ows:Identifier>result</ows:Identifier>
    </wps:RawDataOutput>
  </wps:ResponseForm>
</wps:Execute>`;

    resultat.textContent = "Calcul du buffer des routes (10m)…";

    try {
        const reponse = await fetch(adresseWPS, {
            method: "POST",
            headers: {
                "Content-Type": "text/xml; charset=UTF-8"
            },
            body: xml
        });

        const texte = await reponse.text();

        if (!reponse.ok) {
            throw new Error("HTTP " + reponse.status + "\n" + texte);
        }

        if (
            texte.includes("<ows:ExceptionReport") ||
            texte.includes("<wps:ProcessFailed") ||
            texte.includes("ExceptionText")
        ) {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(texte, "text/xml");
            const exceptionText = xmlDoc.getElementsByTagName("ows:ExceptionText")[0];

            if (exceptionText) {
                resultat.textContent = "Erreur GeoServer (WPS) :\n\n" + exceptionText.textContent;
            } else {
                resultat.textContent = "GeoServer a renvoyé une erreur :\n\n" + texte;
            }
            return;
        }

        const geojsonFeatureCollection = JSON.parse(texte);

        if (!geojsonFeatureCollection.features || geojsonFeatureCollection.features.length === 0) {
            resultat.textContent = "La requête a réussi, mais aucune entité n'a été retournée.";
            return;
        }

        geojsonFeatureCollection.features.forEach(feature => {
            if (feature.geometry && feature.geometry.coordinates) {
                feature.geometry.coordinates = reprojeterCoordonnees(feature.geometry.coordinates);
            }
        });

        if (coucheAnalyseLayer) {
            carte.removeLayer(coucheAnalyseLayer);
        }

        coucheAnalyseLayer = L.geoJSON(geojsonFeatureCollection, {
            style: {
                color: "#ff7800",
                weight: 2,
                fillColor: "#ff7800",
                fillOpacity: 0.4
            }
        }).addTo(carte);

        carte.fitBounds(coucheAnalyseLayer.getBounds());

        resultat.textContent = "Buffer des routes affiché avec succès !";

    } catch (erreur) {
        resultat.textContent =
            "Échec de la requête : " + erreur.message +
            "\nVérifie que XAMPP, Apache et GeoServer fonctionnent.";
    }
}

// Buffer des Arbres (5m)
async function executerBufferArbres() {
    const resultat = document.getElementById("resultat");

    if (!resultat) {
        alert("Élément HTML resultat introuvable.");
        return;
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<wps:Execute version="1.0.0" service="WPS" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://www.opengis.net/wps/1.0.0" xmlns:wfs="http://www.opengis.net/wfs" xmlns:wps="http://www.opengis.net/wps/1.0.0" xmlns:ows="http://www.opengis.net/ows/1.1" xmlns:gml="http://www.opengis.net/gml" xmlns:ogc="http://www.opengis.net/ogc" xmlns:wcs="http://www.opengis.net/wcs/1.1.1" xmlns:xlink="http://www.w3.org/1999/xlink" xsi:schemaLocation="http://www.opengis.net/wps/1.0.0 http://schemas.opengis.net/wps/1.0.0/wpsAll.xsd">
  <ows:Identifier>gs:BufferFeatureCollection</ows:Identifier>
  <wps:DataInputs>
    <wps:Input>
      <ows:Identifier>features</ows:Identifier>
      <wps:Reference mimeType="text/xml" xlink:href="${adresseWFS}" method="POST">
        <wps:Body>
          <![CDATA[
          <wfs:GetFeature service="WFS" version="1.0.0" outputFormat="GML2" xmlns:wfs="http://www.opengis.net/wfs" xmlns:opengeo="http://opengeo.org">
            <wfs:Query typeName="opengeo:iavarbre"/>
          </wfs:GetFeature>
          ]]>
        </wps:Body>
      </wps:Reference>
    </wps:Input>
    <wps:Input>
      <ows:Identifier>distance</ows:Identifier>
      <wps:Data>
        <wps:LiteralData>5</wps:LiteralData>
      </wps:Data>
    </wps:Input>
  </wps:DataInputs>
  <wps:ResponseForm>
    <wps:RawDataOutput mimeType="application/json">
      <ows:Identifier>result</ows:Identifier>
    </wps:RawDataOutput>
  </wps:ResponseForm>
</wps:Execute>`;

    resultat.textContent = "Calcul du buffer des arbres (5m)…";

    try {
        const reponse = await fetch(adresseWPS, {
            method: "POST",
            headers: {
                "Content-Type": "text/xml; charset=UTF-8"
            },
            body: xml
        });

        const texte = await reponse.text();

        if (!reponse.ok) {
            throw new Error("HTTP " + reponse.status + "\n" + texte);
        }

        if (
            texte.includes("<ows:ExceptionReport") ||
            texte.includes("<wps:ProcessFailed") ||
            texte.includes("ExceptionText")
        ) {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(texte, "text/xml");
            const exceptionText = xmlDoc.getElementsByTagName("ows:ExceptionText")[0];

            if (exceptionText) {
                resultat.textContent = "Erreur GeoServer (WPS) :\n\n" + exceptionText.textContent;
            } else {
                resultat.textContent = "GeoServer a renvoyé une erreur :\n\n" + texte;
            }
            return;
        }

        const geojsonFeatureCollection = JSON.parse(texte);

        if (!geojsonFeatureCollection.features || geojsonFeatureCollection.features.length === 0) {
            resultat.textContent = "La requête a réussi, mais aucune entité n'a été retournée.";
            return;
        }

        geojsonFeatureCollection.features.forEach(feature => {
            if (feature.geometry && feature.geometry.coordinates) {
                feature.geometry.coordinates = reprojeterCoordonnees(feature.geometry.coordinates);
            }
        });

        if (coucheAnalyseLayer) {
            carte.removeLayer(coucheAnalyseLayer);
        }

        coucheAnalyseLayer = L.geoJSON(geojsonFeatureCollection, {
            style: {
                color: "#28a745",
                weight: 2,
                fillColor: "#28a745",
                fillOpacity: 0.4
            }
        }).addTo(carte);

        carte.fitBounds(coucheAnalyseLayer.getBounds());

        resultat.textContent = "Buffer des arbres (5m) affiché avec succès !";

    } catch (erreur) {
        resultat.textContent =
            "Échec de la requête : " + erreur.message +
            "\nVérifie que XAMPP, Apache et GeoServer fonctionnent.";
    }
}

async function executerInclusion() {
    const resultat = document.getElementById("resultat");

    if (!resultat) {
        alert("Élément HTML resultat introuvable.");
        return;
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<wps:Execute version="1.0.0" service="WPS" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://www.opengis.net/wps/1.0.0" xmlns:wfs="http://www.opengis.net/wfs" xmlns:wps="http://www.opengis.net/wps/1.0.0" xmlns:ows="http://www.opengis.net/ows/1.1" xmlns:gml="http://www.opengis.net/gml" xmlns:ogc="http://www.opengis.net/ogc" xmlns:wcs="http://www.opengis.net/wcs/1.1.1" xmlns:xlink="http://www.w3.org/1999/xlink" xsi:schemaLocation="http://www.opengis.net/wps/1.0.0 http://schemas.opengis.net/wps/1.0.0/wpsAll.xsd">
  <ows:Identifier>gs:InclusionFeatureCollection</ows:Identifier>
  <wps:DataInputs>
    <wps:Input>
      <ows:Identifier>first</ows:Identifier>
      <wps:Reference mimeType="text/xml" xlink:href="${adresseWFS}" method="POST">
        <wps:Body>
          <![CDATA[
          <wfs:GetFeature service="WFS" version="1.0.0" outputFormat="GML2" xmlns:wfs="http://www.opengis.net/wfs" xmlns:opengeo="http://opengeo.org">
            <wfs:Query typeName="opengeo:roads_iav"/>
          </wfs:GetFeature>
          ]]>
        </wps:Body>
      </wps:Reference>
    </wps:Input>
    <wps:Input>
      <ows:Identifier>second</ows:Identifier>
      <wps:Reference mimeType="text/xml" xlink:href="${adresseWFS}" method="POST">
        <wps:Body>
          <![CDATA[
          <wfs:GetFeature service="WFS" version="1.0.0" outputFormat="GML2" xmlns:wfs="http://www.opengis.net/wfs" xmlns:opengeo="http://opengeo.org">
            <wfs:Query typeName="opengeo:batimav0"/>
          </wfs:GetFeature>
          ]]>
        </wps:Body>
      </wps:Reference>
    </wps:Input>
  </wps:DataInputs>
  <wps:ResponseForm>
    <wps:RawDataOutput mimeType="application/json">
      <ows:Identifier>result</ows:Identifier>
    </wps:RawDataOutput>
  </wps:ResponseForm>
</wps:Execute>`;

    resultat.textContent = "Calcul de l'inclusion (Routes / Bâtiments)…";

    try {
        const reponse = await fetch(adresseWPS, {
            method: "POST",
            headers: {
                "Content-Type": "text/xml; charset=UTF-8"
            },
            body: xml
        });

        const texte = await reponse.text();

        if (!reponse.ok) {
            throw new Error("HTTP " + reponse.status + "\n" + texte);
        }

        if (
            texte.includes("<ows:ExceptionReport") ||
            texte.includes("<wps:ProcessFailed") ||
            texte.includes("ExceptionText")
        ) {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(texte, "text/xml");
            const exceptionText = xmlDoc.getElementsByTagName("ows:ExceptionText")[0];

            if (exceptionText) {
                resultat.textContent = "Erreur GeoServer (WPS) :\n\n" + exceptionText.textContent;
            } else {
                resultat.textContent = "GeoServer a renvoyé une erreur :\n\n" + texte;
            }
            return;
        }

        const geojsonFeatureCollection = JSON.parse(texte);

        if (!geojsonFeatureCollection.features || geojsonFeatureCollection.features.length === 0) {
            resultat.textContent = "La requête d'inclusion a réussi, mais aucune entité ne correspond (0 résultat).";
            if (coucheAnalyseLayer) {
                carte.removeLayer(coucheAnalyseLayer);
            }
            return;
        }

        geojsonFeatureCollection.features.forEach(feature => {
            if (feature.geometry && feature.geometry.coordinates) {
                feature.geometry.coordinates = reprojeterCoordonnees(feature.geometry.coordinates);
            }
        });

        if (coucheAnalyseLayer) {
            carte.removeLayer(coucheAnalyseLayer);
        }

        coucheAnalyseLayer = L.geoJSON(geojsonFeatureCollection, {
            style: {
                color: "#3388ff",
                weight: 3,
                fillColor: "#3388ff",
                fillOpacity: 0.5
            }
        }).addTo(carte);

        carte.fitBounds(coucheAnalyseLayer.getBounds());

        resultat.textContent = "Inclusion calculée et affichée avec succès ! (Nombre d'entités : " + geojsonFeatureCollection.features.length + ")";

    } catch (erreur) {
        resultat.textContent =
            "Échec de la requête : " + erreur.message +
            "\nVérifie que XAMPP, Apache et GeoServer fonctionnent.";
    }
}

async function executerAggregateHauteur() {
    const resultat = document.getElementById("resultat");

    if (!resultat) {
        alert("Élément HTML resultat introuvable.");
        return;
    }

    resultat.textContent = "Récupération des données pour calcul de la hauteur moyenne…";

    const xmlWFS = `<?xml version="1.0" encoding="UTF-8"?>
<wfs:GetFeature
    service="WFS"
    version="1.0.0"
    outputFormat="application/json"
    xmlns:wfs="http://www.opengis.net/wfs"
    xmlns:opengeo="http://opengeo.org">
    <wfs:Query typeName="opengeo:batimav0"/>
</wfs:GetFeature>`;

    try {
        const reponse = await fetch(adresseWPS, {
            method: "POST",
            headers: {
                "Content-Type": "text/xml; charset=UTF-8"
            },
            body: xmlWFS
        });

        const texte = await reponse.text();

        if (!reponse.ok) {
            throw new Error("HTTP " + reponse.status + "\n" + texte);
        }

        if (texte.includes("<ows:ExceptionReport") || texte.includes("ExceptionText")) {
            resultat.textContent = "Erreur GeoServer (WFS) :\n\n" + texte;
            return;
        }

        const data = JSON.parse(texte);

        if (!data.features || data.features.length === 0) {
            resultat.textContent = "Aucune entité trouvée dans la couche des bâtiments.";
            return;
        }

        let somme = 0;
        let compteur = 0;

        data.features.forEach(feature => {
            const props = feature.properties;
            if (props && props.height !== null && props.height !== undefined && props.height !== "") {
                const val = parseFloat(props.height);
                if (!isNaN(val)) {
                    somme += val;
                    compteur++;
                }
            }
        });

        if (compteur === 0) {
            resultat.textContent = "Aucune valeur numérique valide trouvée pour l'attribut 'height'.";
            return;
        }

        const moyenne = somme / compteur;

        resultat.textContent = 
            `Hauteur moyenne des bâtiments : ${moyenne.toFixed(2)} m` +
            `\n(Calculé sur ${compteur} bâtiments valides / ${data.features.length} au total)`;

    } catch (erreur) {
        resultat.textContent =
            "Échec de la requête : " + erreur.message +
            "\nVérifie que XAMPP, Apache et GeoServer fonctionnent.";
    }
}

// -----------------------------
// NOUVELLE FONCTION : HEATMAP (TIFF)
// -----------------------------
async function executerHeatmap() {
    const resultat = document.getElementById("resultat");

    if (!resultat) {
        alert("Élément HTML resultat introuvable.");
        return;
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<wps:Execute version="1.0.0" service="WPS" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://www.opengis.net/wps/1.0.0" xmlns:wfs="http://www.opengis.net/wfs" xmlns:wps="http://www.opengis.net/wps/1.0.0" xmlns:ows="http://www.opengis.net/ows/1.1" xmlns:gml="http://www.opengis.net/gml" xmlns:ogc="http://www.opengis.net/ogc" xmlns:wcs="http://www.opengis.net/wcs/1.1.1" xmlns:xlink="http://www.w3.org/1999/xlink" xsi:schemaLocation="http://www.opengis.net/wps/1.0.0 http://schemas.opengis.net/wps/1.0.0/wpsAll.xsd">
  <ows:Identifier>gs:Heatmap</ows:Identifier>
  <wps:DataInputs>
    <wps:Input>
      <ows:Identifier>data</ows:Identifier>
      <wps:Reference mimeType="text/xml" xlink:href="${adresseWFS}" method="POST">
        <wps:Body>
          <![CDATA[
          <wfs:GetFeature service="WFS" version="1.0.0" outputFormat="GML2" xmlns:wfs="http://www.opengis.net/wfs" xmlns:opengeo="http://opengeo.org">
            <wfs:Query typeName="opengeo:iavarbre"/>
          </wfs:GetFeature>
          ]]>
        </wps:Body>
      </wps:Reference>
    </wps:Input>
    <wps:Input>
      <ows:Identifier>radiusPixels</ows:Identifier>
      <wps:Data>
        <wps:LiteralData>40</wps:LiteralData>
      </wps:Data>
    </wps:Input>
    <wps:Input>
      <ows:Identifier>pixelsPerCell</ows:Identifier>
      <wps:Data>
        <wps:LiteralData>1</wps:LiteralData>
      </wps:Data>
    </wps:Input>
    <wps:Input>
      <ows:Identifier>outputBBOX</ows:Identifier>
      <wps:Data>
        <wps:BoundingBoxData crs="EPSG:26191" dimensions="2">
          <ows:LowerCorner>364010.0 375625.0</ows:LowerCorner>
          <ows:UpperCorner>364882.0 376792.0</ows:UpperCorner>
        </wps:BoundingBoxData>
      </wps:Data>
    </wps:Input>
    <wps:Input>
      <ows:Identifier>outputWidth</ows:Identifier>
      <wps:Data>
        <wps:LiteralData>800</wps:LiteralData>
      </wps:Data>
    </wps:Input>
    <wps:Input>
      <ows:Identifier>outputHeight</ows:Identifier>
      <wps:Data>
        <wps:LiteralData>1070</wps:LiteralData>
      </wps:Data>
    </wps:Input>
  </wps:DataInputs>
  <wps:ResponseForm>
    <wps:RawDataOutput mimeType="image/tiff">
      <ows:Identifier>result</ows:Identifier>
    </wps:RawDataOutput>
  </wps:ResponseForm>
</wps:Execute>`;

    resultat.textContent = "Calcul de la Heatmap des arbres (TIFF) en cours…";

    try {
        const reponse = await fetch(adresseWPS, {
            method: "POST",
            headers: {
                "Content-Type": "text/xml; charset=UTF-8"
            },
            body: xml
        });

        if (!reponse.ok) {
            const texteErr = await reponse.text();
            throw new Error("HTTP " + reponse.status + "\n" + texteErr);
        }

        const blob = await reponse.blob();
        const urlBlob = URL.createObjectURL(blob);

        resultat.innerHTML = `Heatmap générée avec succès !<br><a href="${urlBlob}" download="heatmap_arbres.tiff" target="_blank" style="color: blue; text-decoration: underline;">Télécharger le fichier TIFF de la Heatmap</a>`;

    } catch (erreur) {
        resultat.textContent =
            "Échec de la requête : " + erreur.message +
            "\nVérifie que XAMPP, Apache et GeoServer fonctionnent.";
    }
}
window.executerHeatmap = executerHeatmap;
// -----------------------------
// CORRECTION DÉFINITIVE : CONVEX HULL (Extraction par Regex)
// -----------------------------
async function executerConvexHull() {
    const resultat = document.getElementById("resultat");

    if (!resultat) {
        alert("Élément HTML resultat introuvable.");
        return;
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<wps:Execute version="1.0.0" service="WPS" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://www.opengis.net/wps/1.0.0" xmlns:wfs="http://www.opengis.net/wfs" xmlns:wps="http://www.opengis.net/wps/1.0.0" xmlns:ows="http://www.opengis.net/ows/1.1" xmlns:gml="http://www.opengis.net/gml" xmlns:ogc="http://www.opengis.net/ogc" xmlns:wcs="http://www.opengis.net/wcs/1.1.1" xmlns:xlink="http://www.w3.org/1999/xlink" xsi:schemaLocation="http://www.opengis.net/wps/1.0.0 http://schemas.opengis.net/wps/1.0.0/wpsAll.xsd">
  <ows:Identifier>JTS:convexHull</ows:Identifier>
  <wps:DataInputs>
    <wps:Input>
      <ows:Identifier>geom</ows:Identifier>
      <wps:Data>
        <wps:ComplexData mimeType="text/xml; subtype=gml/3.1.1"><![CDATA[MULTIPOLYGON(((364100 375700,364120 375700,364120 375720,364100 375720,364100 375700)),((364150 375750,364170 375750,364170 375770,364150 375770,364150 375750)))]]></wps:ComplexData>
      </wps:Data>
    </wps:Input>
  </wps:DataInputs>
  <wps:ResponseForm>
    <wps:RawDataOutput mimeType="text/xml; subtype=gml/3.1.1">
      <ows:Identifier>result</ows:Identifier>
    </wps:RawDataOutput>
  </wps:ResponseForm>
</wps:Execute>`;

    resultat.textContent = "Calcul de l'enveloppe convexe en cours…";

    try {
        const reponse = await fetch(adresseWPS, {
            method: "POST",
            headers: {
                "Content-Type": "text/xml; charset=UTF-8"
            },
            body: xml
        });

        const texte = await reponse.text();

        if (!reponse.ok) {
            throw new Error("HTTP " + reponse.status + "\n" + texte);
        }

        if (
            texte.includes("<ows:ExceptionReport") ||
            texte.includes("<wps:ProcessFailed") ||
            texte.includes("ExceptionText")
        ) {
            resultat.textContent = "Erreur GeoServer (WPS) :\n\n" + texte;
            return;
        }

        let latLngs = [];

        // Extraction directe du contenu de posList ou coordinates via Regex (indépendant des namespaces)
        const matchPosList = texte.match(/<(?:[\w]+:)?posList[^>]*>([\s\S]*?)<\/(?:[\w]+:)?posList>/);
        const matchCoordinates = texte.match(/<(?:[\w]+:)?coordinates[^>]*>([\s\S]*?)<\/(?:[\w]+:)?coordinates>/);

        if (matchPosList && matchPosList[1]) {
            const coordsText = matchPosList[1].trim().split(/\s+/);
            for (let i = 0; i < coordsText.length; i += 2) {
                const x = parseFloat(coordsText[i]);
                const y = parseFloat(coordsText[i+1]);
                if (!isNaN(x) && !isNaN(y)) {
                    // Reprojection EPSG:26191 -> EPSG:4326
                    const lonLat = proj4("EPSG:26191", "EPSG:4326", [x, y]);
                    latLngs.push([lonLat[1], lonLat[0]]); // Leaflet attend [lat, lng]
                }
            }
        } else if (matchCoordinates && matchCoordinates[1]) {
            const tuples = matchCoordinates[1].trim().split(/\s+/);
            tuples.forEach(tuple => {
                const parts = tuple.split(",");
                if (parts.length >= 2) {
                    const x = parseFloat(parts[0]);
                    const y = parseFloat(parts[1]);
                    if (!isNaN(x) && !isNaN(y)) {
                        const lonLat = proj4("EPSG:26191", "EPSG:4326", [x, y]);
                        latLngs.push([lonLat[1], lonLat[0]]);
                    }
                }
            });
        }

        if (latLngs.length === 0) {
            resultat.textContent = "Erreur : Impossible d'extraire les coordonnées du flux de réponse :\n\n" + texte;
            return;
        }

        // Supprimer l'ancienne couche d'analyse si elle existe
        if (typeof coucheAnalyseLayer !== 'undefined' && coucheAnalyseLayer) {
            carte.removeLayer(coucheAnalyseLayer);
        }

        // Création et affichage du polygone Leaflet
        coucheAnalyseLayer = L.polygon(latLngs, {
            color: "#800080",      // Violet
            weight: 3,
            fillColor: "#800080",
            fillOpacity: 0.4
        }).addTo(carte);

        carte.fitBounds(coucheAnalyseLayer.getBounds());

        resultat.textContent = "Enveloppe convexe calculée et affichée avec succès sur la carte !";

    } catch (erreur) {
        resultat.textContent =
            "Échec de la requête : " + erreur.message +
            "\nVérifie que XAMPP, Apache et GeoServer fonctionnent.";
    }
}
window.executerConvexHull = executerConvexHull;
async function executerConvexHull() {
    const resultat = document.getElementById("resultat");

    if (!resultat) {
        alert("Élément HTML resultat introuvable.");
        return;
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<wps:Execute version="1.0.0"
    service="WPS"
    xmlns:wps="http://www.opengis.net/wps/1.0.0"
    xmlns:ows="http://www.opengis.net/ows/1.1"
    xmlns:xlink="http://www.w3.org/1999/xlink">
  <ows:Identifier>JTS:convexHull</ows:Identifier>
  <wps:DataInputs>
    <wps:Input>
      <ows:Identifier>geom</ows:Identifier>
      <wps:Data>
        <wps:ComplexData mimeType="text/xml; subtype=gml/3.1.1"><![CDATA[
POLYGON((
364048.08805159 376043.20363311,
364051.82010985 376020.42335632,
364127.23380006 375815.69142535,
364238.29380508 375706.03931723,
364283.10298572 375668.31266613,
364443.14265770 375832.47430048,
364507.77987453 375910.04006979,
364511.29560402 375915.70909350,
364900.04173562 376691.24139183,
364890.53198820 376699.01287342,
364619.96579691 376792.02898031,
364605.33366856 376782.24738932,
364602.45208203 376779.63653138,
364597.50355586 376773.61045253,
364597.36397561 376773.44040500,
364161.04467258 376239.10680552,
364130.23636518 376201.12820374,
364048.08805159 376043.20363311
))
]]></wps:ComplexData>
      </wps:Data>
    </wps:Input>
  </wps:DataInputs>
  <wps:ResponseForm>
    <wps:RawDataOutput mimeType="text/xml; subtype=gml/3.1.1">
      <ows:Identifier>result</ows:Identifier>
    </wps:RawDataOutput>
  </wps:ResponseForm>
</wps:Execute>`;

    resultat.textContent = "Calcul de l'enveloppe convexe en cours...";

    try {
        const reponse = await fetch(adresseWPS, {
            method: "POST",
            headers: {
                "Content-Type": "text/xml; charset=UTF-8"
            },
            body: xml
        });

        const texte = await reponse.text();

        if (!reponse.ok ||
            texte.includes("ExceptionReport") ||
            texte.includes("ProcessFailed")) {
            throw new Error(texte);
        }

        const posList = texte.match(
            /<(?:[\w]+:)?posList[^>]*>([\s\S]*?)<\/(?:[\w]+:)?posList>/
        );

        const coordinates = texte.match(
            /<(?:[\w]+:)?coordinates[^>]*>([\s\S]*?)<\/(?:[\w]+:)?coordinates>/
        );

        let latLngs = [];

        if (posList) {
            const valeurs = posList[1].trim().split(/\s+/);

            for (let i = 0; i + 1 < valeurs.length; i += 2) {
                const x = Number(valeurs[i]);
                const y = Number(valeurs[i + 1]);

                if (Number.isFinite(x) && Number.isFinite(y)) {
                    const coord = proj4(
                        "EPSG:26191",
                        "EPSG:4326",
                        [x, y]
                    );
                    latLngs.push([coord[1], coord[0]]);
                }
            }
        } else if (coordinates) {
            const tuples = coordinates[1].trim().split(/\s+/);

            for (const tuple of tuples) {
                const valeurs = tuple.split(",");
                const x = Number(valeurs[0]);
                const y = Number(valeurs[1]);

                if (Number.isFinite(x) && Number.isFinite(y)) {
                    const coord = proj4(
                        "EPSG:26191",
                        "EPSG:4326",
                        [x, y]
                    );
                    latLngs.push([coord[1], coord[0]]);
                }
            }
        }

        if (latLngs.length < 4) {
            throw new Error(
                "Géométrie GML non reconnue. Réponse reçue :\n" + texte
            );
        }

        if (typeof coucheAnalyseLayer !== "undefined" &&
            coucheAnalyseLayer) {
            carte.removeLayer(coucheAnalyseLayer);
        }

        coucheAnalyseLayer = L.polygon(latLngs, {
            color: "#800080",
            weight: 3,
            fillColor: "#800080",
            fillOpacity: 0.25
        }).addTo(carte);

        carte.fitBounds(coucheAnalyseLayer.getBounds());

        resultat.textContent =
            "Enveloppe convexe affichée sur la carte.";

    } catch (erreur) {
        console.error("Erreur Convex Hull :", erreur);
        resultat.textContent =
            "Erreur : " + erreur.message;
    }
}

window.executerConvexHull = executerConvexHull;
