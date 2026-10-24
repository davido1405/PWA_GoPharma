<?php
require_once __DIR__ . '/config/app.php';
?>
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Pharmacies disponibles — GoPharma</title>
  <link rel="icon" type="image/png" href="assets/img/logo-icone.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="assets/css/app.css" />
  <link rel="manifest" href="manifest.webmanifest" />
  <meta name="theme-color" content="#1B8A5A" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <link rel="apple-touch-icon" href="assets/img/icon-192.png" />
</head>
<body class="min-h-screen bg-slate-50">
  <header class="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
    <div class="container-page flex min-h-[64px] flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2">
      <a href="/" class="flex items-center">
        <img src="assets/img/logo.png" alt="GoPharma" class="h-10 w-auto" />
      </a>
      <nav class="flex flex-wrap items-center gap-2 text-sm" aria-label="Navigation publique">
        <a href="pharmacies" class="btn-nav is-active" aria-current="page">Pharmacies</a>
        <a href="carte" class="btn-nav">Carte</a>
        <button type="button" class="btn-nav" data-share-site>Partager le site</button>
        <a href="/" class="btn-nav">Accueil</a>
        <a href="connexion" class="btn-primary">Espace pharmacie</a>
      </nav>
    </div>
  </header>

  <main class="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <section class="mb-8">
      <p class="eyebrow">Consultation</p>
      <h1 class="mt-2 text-3xl font-bold text-slate-900">Pharmacies disponibles</h1>
      <p class="mt-2 text-sm text-slate-500">
        Retrouvez les pharmacies inscrites : statut de garde, horaires, coordonnées et assurances acceptées.
      </p>
      <p class="mt-2 inline-block rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
        Version mobile bientôt disponible
      </p>
    </section>

    <section class="card p-4 sm:p-6">
      <div class="flex flex-col flex-wrap gap-3 sm:flex-row sm:items-center sm:gap-3">
        <input id="pharmacies-search" type="search" class="input w-[280px] sm:w-[320px] md:w-[400px]" placeholder="Rechercher par nom, assurance ou adresse…" aria-label="Rechercher une pharmacie" />
        <select id="filtre-ville" class="input sm:w-[200px]" aria-label="Filtrer par ville">
          <option value="">Toutes les villes</option>
        </select>
        <select id="filtre-assurance" class="input sm:w-[200px]" aria-label="Filtrer par assurance">
          <option value="">Toutes les assurances</option>
        </select>
        <button id="pharmacies-btn" type="button" class="btn-primary sm:px-6 py-2.5">Filtrer</button>
        <button id="pharmacies-reset" type="button" class="btn-ghost sm:px-6 py-2.5">Réinitialiser</button>
        <button id="pharmacies-geo" type="button" class="btn-ghost sm:px-6 py-2.5">Me localiser</button>
      </div>
      <label for="filtre-garde" class="mt-3 inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 transition hover:border-brand-300 hover:bg-brand-50 has-[:checked]:border-brand-300 has-[:checked]:bg-brand-50 has-[:checked]:text-brand-800">
        <input id="filtre-garde" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-500" />
        Uniquement les pharmacies de garde
      </label>
      <p id="pharmacies-active-filters" class="mt-2 text-xs text-brand-700"></p>
      <p id="pharmacies-status" class="mt-1 text-xs text-slate-500" aria-live="polite"></p>
    </section>

    <section id="pharmacies-list" class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div class="skeleton h-48"></div>
      <div class="skeleton h-48"></div>
      <div class="skeleton h-48"></div>
    </section>

    <div id="pharmacie-details-modal" class="fixed inset-0 z-50 hidden bg-slate-900/50 p-4 h-screen overflow-y-auto">
      <div class="card max-w-xl p-6 my-4 mx-auto" style="position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(768px, 90vw); max-height: 90vh; overflow-y: auto;">
        <div class="flex items-center justify-between gap-4">
          <h3 id="details-title" class="text-lg font-semibold text-slate-900">Détails</h3>
          <button id="details-close" type="button" class="btn-ghost">Fermer</button>
        </div>
        <div id="details-body" class="mt-4 space-y-2 text-sm text-slate-600"></div>
      </div>
    </div>
  </main>

  <script>
    window.GOPHARMA_CONFIG = { env: '<?= APP_ENV ?>', apiBase: '<?= api_base() ?>', debug: <?= APP_DEBUG ? 'true' : 'false' ?> };
  </script>
  <script src="assets/js/config.js"></script>
  <script src="assets/js/pharmacies.js"></script>
  <script src="assets/js/pwa.js"></script>
  <script src="assets/js/share.js"></script>
</body>
</html>
