<?php
/**
 * GoPharma — espace pharmacie.
 * Page servie en PHP : elle peut interroger directement la base locale
 * via config/app.php (bascule local / production).
 */
require_once __DIR__ . '/config/app.php';
?>
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Connexion — GoPharma Espace pharmacie</title>
  <meta name="description" content="Connectez-vous à votre espace gérant de pharmacie GoPharma." />
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
  <div class="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
    <aside class="relative hidden overflow-hidden bg-brand-800 px-12 py-10 lg:flex lg:flex-col">
      <div class="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-brand-600/60 blur-3xl"></div>
      <div class="pointer-events-none absolute -bottom-32 -right-16 h-96 w-96 rounded-full bg-accent-500/25 blur-3xl"></div>

      <a href="/" class="relative">
        <span class="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">
          <img src="assets/img/logo-icone.png" alt="" class="h-4 w-4" />
          Espace gérant
        </span>
      </a>

      <div class="relative mt-auto">
        <h1 class="text-4xl font-bold leading-tight text-white">
          Votre pharmacie,<br />pilotée en toute simplicité.
        </h1>
        <p class="mt-4 max-w-md text-brand-100">
          Retrouvez votre profil, vos horaires, vos assurances acceptées et vos abonnés
          depuis un tableau de bord unique.
        </p>

        <ul class="mt-10 space-y-4 text-sm text-brand-100">
          <li class="flex items-start gap-3">
            <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-white">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.2" stroke="currentColor" class="h-3.5 w-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
            </span>
            Statut de garde et horaires mis à jour en temps réel
          </li>
          <li class="flex items-start gap-3">
            <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-white">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.2" stroke="currentColor" class="h-3.5 w-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
            </span>
            Annonces et newsletters publiées en quelques secondes
          </li>
          <li class="flex items-start gap-3">
            <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-white">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.2" stroke="currentColor" class="h-3.5 w-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
            </span>
            Accès sécurisé par code PIN
          </li>
        </ul>
      </div>

      <p class="relative mt-12 text-xs text-brand-200">
        &copy; <span id="year-side"></span> GoPharma — La pharmacie idéale partout
      </p>
    </aside>

    <main class="flex items-center justify-center px-5 py-10 sm:px-10">
      <div class="w-full max-w-md">
        <div class="mb-8 flex items-center justify-between lg:hidden">
          <a href="/">
            <img src="assets/img/logo.png" alt="GoPharma" class="h-11 w-auto" />
          </a>
          <a href="/" class="text-sm font-medium text-slate-500 hover:text-brand-700">Accueil</a>
        </div>

        <a href="/" class="mb-8 hidden items-center gap-2 text-sm font-medium text-slate-500 hover:text-brand-700 lg:inline-flex">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/></svg>
          Retour à l'accueil
        </a>

        <h2 class="text-3xl font-bold tracking-tight text-slate-900">Connexion</h2>
        <p class="mt-2 text-slate-500">Ravi de vous revoir. Connectez-vous à votre espace pharmacie.</p>

        <div id="form-success" class="mt-6 hidden rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"></div>

        <div id="form-error" class="mt-6 hidden rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"></div>

        <form id="login-form" class="mt-6 space-y-5" novalidate>
          <div>
            <label class="label" for="numero">Numéro de téléphone</label>
            <div class="relative">
              <span class="pointer-events-none absolute inset-y-0 left-0 flex w-11 items-center justify-center text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.7" stroke="currentColor" class="h-5 w-5"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"/></svg>
              </span>
              <input id="numero" name="numero" type="tel" inputmode="tel" autocomplete="username"
                     class="input input-icon" placeholder="+225 07 00 00 00 00" />
            </div>
            <p class="mt-1.5 hidden text-xs font-medium text-red-600" data-error-for="numero"></p>
          </div>

          <div>
            <div class="mb-1.5 flex items-center justify-between">
              <label class="label mb-0" for="pin">Code PIN</label>
              <button id="toggle-pin" type="button" class="inline-flex min-h-[44px] min-w-[44px] items-center justify-center px-2 text-xs font-semibold text-brand-700 hover:text-brand-800">Afficher</button>
            </div>
            <div class="relative">
              <span class="pointer-events-none absolute inset-y-0 left-0 flex w-11 items-center justify-center text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.7" stroke="currentColor" class="h-5 w-5"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/></svg>
              </span>
              <input id="pin" name="pin" type="password" inputmode="numeric" autocomplete="current-password"
                     maxlength="32" class="input input-icon pr-11" placeholder="6 chiffres" />
              <span class="pointer-events-none absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.7" stroke="currentColor" class="h-5 w-5"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178zM15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              </span>
            </div>
            <p class="mt-1.5 hidden text-xs font-medium text-red-600" data-error-for="pin"></p>
          </div>

          <label class="flex cursor-pointer items-center gap-2.5 text-sm text-slate-600">
            <input id="remember" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
            Mémoriser mon numéro
          </label>

          <button id="submit-btn" type="submit" class="btn-primary btn-lg btn-block">
            <span data-label>Se connecter</span>
            <span data-spinner hidden class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"></span>
          </button>
        </form>

        <p class="mt-6 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs leading-relaxed text-slate-500">
          L'espace pharmacie est réservé aux comptes de type
          <span class="font-semibold text-slate-700">Gestionnaire de pharmacie</span>.
          Les comptes patients sont gérés depuis l'application mobile.
        </p>

        <p class="mt-6 text-center text-sm text-slate-500">
          Pas encore de compte ?
          <a href="inscription" class="font-semibold text-brand-700 hover:text-brand-800">Créer mon espace pharmacie</a>
        </p>

        <nav class="mt-8 flex flex-wrap items-center justify-center gap-2" aria-label="Navigation publique">
          <a href="pharmacies" class="btn-nav">Pharmacies</a>
          <a href="/" class="btn-nav">Accueil</a>
        </nav>
      </div>
    </main>
  </div>

  <script>
    window.GOPHARMA_CONFIG = { env: '<?= APP_ENV ?>', apiBase: '<?= api_base() ?>', debug: <?= APP_DEBUG ? 'true' : 'false' ?> };
  </script>
  <script src="assets/js/config.js"></script>
  <script src="assets/js/ui.js"></script>
  <script src="assets/js/api.js"></script>
  <script src="assets/js/connexion.js"></script>
  <script src="assets/js/pwa.js"></script>
</body>
</html>
