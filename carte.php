<?php
require_once __DIR__ . '/config/app.php';
?>
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Carte des pharmacies — GoPharma</title>
  <link rel="icon" type="image/png" href="assets/img/logo-icone.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="assets/css/app.css" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="" />
  <link rel="manifest" href="manifest.webmanifest" />
  <meta name="theme-color" content="#1B8A5A" />
</head>
<body class="min-h-screen bg-slate-50">
  <header class="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
    <div class="container-page flex min-h-[64px] flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2">
      <a href="/" class="flex items-center"><img src="assets/img/logo.png" alt="GoPharma" class="h-10 w-auto" /></a>
      <nav class="flex flex-wrap items-center gap-2 text-sm" aria-label="Navigation publique">
        <a href="pharmacies" class="btn-nav">Pharmacies</a>
        <button type="button" class="btn-nav" data-share-site>Partager le site</button>
        <a href="/" class="btn-nav">Accueil</a>
        <a href="connexion" class="btn-primary">Espace pharmacie</a>
      </nav>
    </div>
  </header>
  <main class="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <section class="mb-6">
      <p class="eyebrow">Carte</p>
      <h1 class="mt-2 text-3xl font-bold text-slate-900">Carte des pharmacies</h1>
      <p class="mt-2 text-sm text-slate-500">Localisez les pharmacies et leurs itinéraires.</p>
      <div class="mt-3 flex flex-wrap gap-2">
        <button id="carte-geo" type="button" class="btn-primary">Me localiser</button>
        <a class="btn-ghost" href="pharmacies">Liste</a>
      </div>
      <p id="carte-status" class="mt-2 text-xs text-slate-500" aria-live="polite"></p>
    </section>
    <div id="carte-conteneur" class="card overflow-hidden" style="height: 70vh; min-height: 400px;"></div>
    <p class="mt-2 inline-block rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">Version mobile bientôt disponible</p>
  </main>
  <script>window.GOPHARMA_CONFIG = { env: '<?= APP_ENV ?>', apiBase: '<?= api_base() ?>', debug: <?= APP_DEBUG ? 'true' : 'false' ?> };</script>
  <script src="assets/js/config.js"></script>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>
  <script src="assets/js/carte.js"></script>
  <script src="assets/js/pwa.js"></script>
  <script src="assets/js/share.js"></script>
</body>
</html>
