<?php
/**
 * Front controller pour le serveur PHP intégré :
 *
 *     php -S localhost:8080 router.php
 *
 * Gère les fichiers statiques et les pages PHP. Les routes /api/* ne sont pas
 * relayées : le front appelle directement l'API Node (voir config/app.php).
 */

declare(strict_types=1);

require_once __DIR__ . '/config/app.php';

/* Le serveur intégré est mono-requête : on ferme chaque connexion pour ne pas
   saturer les connexions simultanées du navigateur. */
header('Connection: close');

$requete = $_SERVER['REQUEST_URI'] ?? '/';
$chemin = parse_url($requete, PHP_URL_PATH) ?: '/';
$chemin = rawurldecode($chemin);

/* Routes API : le front appelle directement l'API Node (API_NODE_BASE en local,
   API_DISTANTE en production). Le relais PHP api/index.php a été retiré : on
   répond proprement au lieu de faire un require sur un fichier absent. */
if ($chemin === '/api' || str_starts_with($chemin, '/api/')) {
    http_response_code(404);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success' => false,
        'message' => "Cette application n'expose pas /api : elle appelle directement l'API Node (voir config/app.php).",
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    return true;
}

/* Racine du site */
if ($chemin === '/' || $chemin === '') {
    require __DIR__ . '/index.php';
    return true;
}

/* Tolérance : /connexion, /dashboard, /inscription sans extension */
if (!preg_match('/\.[a-z0-9]+$/i', $chemin)) {
    $alias = __DIR__ . '/' . trim($chemin, '/') . '.php';
    if (is_file($alias)) {
        require $alias;
        return true;
    }
}

$fichier = __DIR__ . $chemin;
$fichierReel = is_file($fichier) ? realpath($fichier) : false;
$racineReelle = realpath(__DIR__);

/* Fichier réel dans le projet : servi directement (statique) */
if ($fichierReel !== false && $racineReelle !== false && str_starts_with($fichierReel, $racineReelle)) {
    if (str_ends_with(strtolower($fichierReel), '.php')) {
        require $fichierReel;
        return true;
    }
    servir_statique($fichierReel, $chemin);
    return true;
}

http_response_code(404);
header('Content-Type: text/html; charset=utf-8');
$cheminAffiche = htmlspecialchars($chemin, ENT_QUOTES, 'UTF-8');
echo '<!doctype html><html lang="fr"><head><meta charset="utf-8">'
    . '<meta name="viewport" content="width=device-width, initial-scale=1">'
    . '<title>Page introuvable — GoPharma</title></head>'
    . '<body style="font-family:system-ui;margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center;background:#f8fafc;color:#0f172a">'
    . '<main style="max-width:32rem;padding:2rem;text-align:center">'
    . '<p style="font-size:3rem;font-weight:800;margin:0;color:#1B8A5A">404</p>'
    . '<h1 style="font-size:1.25rem;margin:.5rem 0">Page introuvable</h1>'
    . '<p style="color:#475569">La page <code>' . $cheminAffiche . '</code> n\'existe pas ou a été déplacée.</p>'
    . '<p style="margin-top:1.5rem"><a href="index.php" style="display:inline-block;padding:.7rem 1.4rem;border-radius:.75rem;background:#1B8A5A;color:#fff;text-decoration:none;font-weight:600">Retour à l\'accueil</a></p>'
    . '</main></body></html>';
return true;

function servir_statique(string $fichier, string $chemin): void
{
    static $mime = [
        'css' => 'text/css; charset=utf-8',
        'js' => 'application/javascript; charset=utf-8',
        'mjs' => 'application/javascript; charset=utf-8',
        'json' => 'application/json; charset=utf-8',
        'html' => 'text/html; charset=utf-8',
        'png' => 'image/png',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'gif' => 'image/gif',
        'webp' => 'image/webp',
        'svg' => 'image/svg+xml',
        'ico' => 'image/x-icon',
        'woff' => 'font/woff',
        'woff2' => 'font/woff2',
        'ttf' => 'font/ttf',
        'txt' => 'text/plain; charset=utf-8',
        'map' => 'application/json; charset=utf-8',
        'pdf' => 'application/pdf',
    ];

    $extension = strtolower(pathinfo($chemin, PATHINFO_EXTENSION));
    $type = $mime[$extension] ?? 'application/octet-stream';

    header('Content-Type: ' . $type);
    header('Content-Length: ' . filesize($fichier));
    if ($chemin === '/sw.js') {
        /* Le script du service worker doit être revalidé à chaque visite :
           sinon un navigateur peut continuer à servir l'ancienne version
           (cache HTTP) et ne jamais détecter la mise à jour. */
        header('Cache-Control: no-cache, must-revalidate');
    } else {
        header('Cache-Control: public, max-age=300');
    }
    readfile($fichier);
}
