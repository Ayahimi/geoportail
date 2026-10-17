
<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(204);
    exit;
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    exit("Méthode non autorisée");
}

$geoserver_url = "http://localhost:8080/geoserver/ows";
$postData = file_get_contents("php://input");

if ($postData === false || trim($postData) === "") {
    http_response_code(400);
    exit("Requête XML vide");
}

$ch = curl_init($geoserver_url);

curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $postData,
    CURLOPT_HTTPHEADER => [
        "Content-Type: text/xml; charset=UTF-8"
    ],
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_TIMEOUT => 60
]);

$response = curl_exec($ch);

if ($response === false) {
    http_response_code(502);
    exit("Erreur de connexion à GeoServer : " . curl_error($ch));
}

$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

http_response_code($httpCode);
header("Content-Type: text/xml; charset=UTF-8");
echo $response;
?>
