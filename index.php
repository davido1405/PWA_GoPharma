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
  <title>GoPharma — Espace pharmacie</title>
  <meta name="description" content="GoPharma accompagne les gérants de pharmacie : profil, horaires, assurances acceptées, annonces, newsletters et abonnements depuis une seule interface." />
  <link rel="icon" type="image/png" href="assets/img/logo-icone.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="assets/css/app.css" />
  <link rel="manifest" href="manifest.webmanifest" />
  <meta name="theme-color" content="#1B8A5A" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <link rel="apple-touch-icon" href="assets/img/icon-192.png" />
</head>
<body class="bg-white">
  <header class="sticky top-0 z-50 border-b border-slate-200/70 bg-white/85 backdrop-blur">
    <div class="container-page flex h-20 items-center justify-between gap-6">
      <a href="index.php" id="header-logo" class="flex items-center">
        <img src="assets/img/logo.png" alt="GoPharma" class="h-11 w-auto" />
      </a>

      <nav class="hidden items-center gap-1 xl:flex" aria-label="Navigation principale">
        <a href="#fonctionnalites" class="btn-nav px-3">Fonctionnalités</a>
        <a href="#fonctionnement" class="btn-nav px-3">Fonctionnement</a>
        <a href="#forfaits" class="btn-nav px-3">Forfaits</a>
        <a href="pharmacies.php" class="btn-nav px-3">Pharmacies</a>
      </nav>

      <div class="flex items-center gap-2">
        <button type="button" class="btn-nav hidden px-3 xl:inline-flex" data-share-site>Partager le site</button>
        <a href="inscription.php" class="btn-nav hidden px-3 xl:inline-flex">Créer un compte</a>
        <a href="connexion.php" class="btn-primary hidden sm:inline-flex">Espace pharmacie</a>
        <button id="nav-toggle" type="button" class="min-h-[44px] min-w-[44px] rounded-xl border border-slate-200 p-2.5 text-slate-600 xl:hidden" aria-label="Ouvrir le menu">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" class="h-5 w-5"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"/></svg>
        </button>
      </div>
    </div>

    <div id="nav-mobile" class="hidden border-t border-slate-100 bg-white xl:hidden">
      <div class="container-page flex flex-col gap-2 py-4">
        <a href="#fonctionnalites" class="btn-nav w-full justify-start">Fonctionnalités</a>
        <a href="#fonctionnement" class="btn-nav w-full justify-start">Fonctionnement</a>
        <a href="#forfaits" class="btn-nav w-full justify-start">Forfaits</a>
        <a href="pharmacies.php" class="btn-nav w-full justify-start">Pharmacies</a>
        <a href="inscription.php" class="btn-nav w-full justify-start">Créer un compte</a>
        <a href="connexion.php" class="btn-primary mt-1 w-full">Espace pharmacie</a>
      </div>
    </div>
  </header>

  <main>
    <section class="relative overflow-hidden bg-gradient-to-b from-brand-50 via-white to-white">
      <div class="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-accent-100/70 blur-3xl"></div>
      <div class="pointer-events-none absolute -left-40 top-40 h-96 w-96 rounded-full bg-brand-100 blur-3xl"></div>

      <div class="container-page grid items-center gap-14 py-16 lg:grid-cols-2 lg:py-24">
        <div class="animate-fadeUp">
          <span class="eyebrow">Espace gérant de pharmacie</span>
          <h1 class="mt-4 text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl lg:text-[3.4rem]">
            Gérez votre pharmacie<br class="hidden sm:block" />
            <span class="text-brand-800">depuis un seul écran.</span>
          </h1>
          <p class="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
            Horaires, assurances acceptées, annonces, newsletters et abonnements : GoPharma
            rassemble le pilotage de votre officine dans une interface claire, rapide et
            accessible sur ordinateur comme sur mobile.
          </p>

          <div class="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href="connexion.php" class="btn-primary btn-lg">
              Accéder à l'espace pharmacie
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/></svg>
            </a>
            <a href="#fonctionnalites" class="btn-ghost btn-lg">Voir les fonctionnalités</a>
          </div>

          <ul class="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-600">
            <li class="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="h-4 w-4 text-brand-500"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              Aucune installation
            </li>
            <li class="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="h-4 w-4 text-brand-500"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              Données synchronisées en temps réel
            </li>
            <li class="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="h-4 w-4 text-brand-500"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              Interface responsive
            </li>
          </ul>
        </div>

        <div class="relative animate-fadeUp">
          <div class="card overflow-hidden">
            <div class="flex items-center justify-between gap-4 bg-brand-800 px-6 py-4">
              <div class="flex items-center gap-3">
                <span class="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.6" stroke="currentColor" class="h-5 w-5"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"/></svg>
                </span>
                <div>
                  <p class="text-sm font-semibold text-white">Pharmacie de la Paix</p>
                  <p class="text-xs text-brand-200">Plateau, Abidjan</p>
                </div>
              </div>
              <span class="chip bg-white/15 text-white">De garde</span>
            </div>

            <div class="grid gap-4 p-6 sm:grid-cols-2">
              <div class="rounded-xl border border-slate-200 p-4">
                <p class="stat-label">Forfait actuel</p>
                <p class="mt-1 text-lg font-bold text-slate-900">Standard</p>
                <p class="text-xs text-slate-500">18 jours restants</p>
              </div>
              <div class="rounded-xl border border-slate-200 p-4">
                <p class="stat-label">Abonnés newsletter</p>
                <p class="mt-1 text-lg font-bold text-slate-900">248</p>
                <p class="text-xs text-brand-600">+12 cette semaine</p>
              </div>
              <div class="rounded-xl border border-slate-200 p-4">
                <p class="stat-label">Annonces publiées</p>
                <p class="mt-1 text-lg font-bold text-slate-900">5</p>
                <p class="text-xs text-slate-500">sur 5 disponibles</p>
              </div>
              <div class="rounded-xl border border-slate-200 p-4">
                <p class="stat-label">Vues du profil</p>
                <p class="mt-1 text-lg font-bold text-slate-900">1 234</p>
                <p class="text-xs text-slate-500">30 derniers jours</p>
              </div>
            </div>

            <div class="border-t border-slate-100 bg-slate-50/70 px-6 py-4 text-sm text-slate-600">
              <div class="flex items-center justify-between">
                <span>Lundi – Vendredi</span>
                <span class="font-semibold text-slate-900">08:30 – 21:30</span>
              </div>
              <div class="mt-2 flex items-center justify-between">
                <span>Samedi</span>
                <span class="font-semibold text-slate-900">08:30 – 15:30</span>
              </div>
            </div>
          </div>

          <div class="card absolute -bottom-8 -left-4 hidden w-56 p-4 sm:block">
            <div class="flex items-center gap-3">
              <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-50 text-accent-500">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.7" stroke="currentColor" class="h-5 w-5"><path stroke-linecap="round" stroke-linejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m2.413 7.206V5.277a1.913 1.913 0 00-1.912-1.913H5.277a1.913 1.913 0 00-1.913 1.913v10.426a1.913 1.913 0 001.913 1.913h1.912m6.822-1.852V7.927a1.913 1.913 0 00-1.913-1.913H8.088a1.913 1.913 0 00-1.913 1.913v9.587"/></svg>
              </span>
              <div>
                <p class="text-xs text-slate-500">Nouvelle annonce</p>
                <p class="text-sm font-semibold text-slate-900">Publiée en 10 s</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="border-y border-slate-100 bg-slate-50/60">
      <div class="container-page grid grid-cols-2 gap-6 py-8 text-center sm:grid-cols-4">
        <div class="min-w-0">
          <p class="break-words text-xl font-bold text-brand-800 sm:text-2xl">Abidjan</p>
          <p class="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">Bouaké</p>
        </div>
        <div class="min-w-0">
          <p class="break-words text-xl font-bold text-brand-800 sm:text-2xl">Yamoussoukro</p>
          <p class="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">San-Pédro</p>
        </div>
        <div class="min-w-0">
          <p class="break-words text-xl font-bold text-brand-800 sm:text-2xl">24/7</p>
          <p class="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">Suivi des gardes</p>
        </div>
        <div class="min-w-0">
          <p class="break-words text-xl font-bold text-brand-800 sm:text-2xl">3 forfaits</p>
          <p class="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">Adaptés à votre activité</p>
        </div>
      </div>
    </section>

    <section id="fonctionnalites" class="py-20 lg:py-28">
      <div class="container-page">
        <div class="mx-auto max-w-2xl text-center">
          <span class="eyebrow">Fonctionnalités</span>
          <h2 class="section-title mt-3">Tout ce dont votre officine a besoin</h2>
          <p class="mt-4 text-lg text-slate-600">
            Six modules pensés pour le quotidien du gérant, du maintien du profil à la
            fidélisation de vos patients.
          </p>
        </div>

        <div class="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <article class="card p-6 transition hover:-translate-y-1 hover:border-brand-200">
            <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.7" stroke="currentColor" class="h-6 w-6"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"/></svg>
            </span>
            <h3 class="mt-5 text-lg font-semibold text-slate-900">Profil à jour</h3>
            <p class="mt-2 text-sm leading-relaxed text-slate-600">
              Photo, nom, adresse, contacts et horaires d'ouverture : vos patients trouvent
              toujours une information exacte.
            </p>
          </article>

          <article class="card p-6 transition hover:-translate-y-1 hover:border-brand-200">
            <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-50 text-accent-500">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.7" stroke="currentColor" class="h-6 w-6"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"/></svg>
            </span>
            <h3 class="mt-5 text-lg font-semibold text-slate-900">Mode garde</h3>
            <p class="mt-2 text-sm leading-relaxed text-slate-600">
              Activez ou désactivez le statut « pharmacie de garde » en un geste pour être
              visible en priorité.
            </p>
          </article>

          <article class="card p-6 transition hover:-translate-y-1 hover:border-brand-200">
            <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.7" stroke="currentColor" class="h-6 w-6"><path stroke-linecap="round" stroke-linejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m2.413 7.206V5.277a1.913 1.913 0 00-1.912-1.913H5.277a1.913 1.913 0 00-1.913 1.913v10.426a1.913 1.913 0 001.913 1.913h1.912m6.822-1.852V7.927a1.913 1.913 0 00-1.913-1.913H8.088a1.913 1.913 0 00-1.913 1.913v9.587"/></svg>
            </span>
            <h3 class="mt-5 text-lg font-semibold text-slate-900">Annonces</h3>
            <p class="mt-2 text-sm leading-relaxed text-slate-600">
              Publiez promotions, informations et urgences qui apparaissent instantanément
              dans l'application.
            </p>
          </article>

          <article class="card p-6 transition hover:-translate-y-1 hover:border-brand-200">
            <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-50 text-accent-500">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.7" stroke="currentColor" class="h-6 w-6"><path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"/></svg>
            </span>
            <h3 class="mt-5 text-lg font-semibold text-slate-900">Newsletters</h3>
            <p class="mt-2 text-sm leading-relaxed text-slate-600">
              Suivez le nombre d'abonnés à votre pharmacie et gardez-les informés
              régulièrement.
            </p>
          </article>

          <article class="card p-6 transition hover:-translate-y-1 hover:border-brand-200">
            <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.7" stroke="currentColor" class="h-6 w-6"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/></svg>
            </span>
            <h3 class="mt-5 text-lg font-semibold text-slate-900">Assurances acceptées</h3>
            <p class="mt-2 text-sm leading-relaxed text-slate-600">
              Sélectionnez les compagnies prises en charge pour informer vos patients avant
              leur venue.
            </p>
          </article>

          <article class="card p-6 transition hover:-translate-y-1 hover:border-brand-200">
            <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-50 text-accent-500">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.7" stroke="currentColor" class="h-6 w-6"><path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/></svg>
            </span>
            <h3 class="mt-5 text-lg font-semibold text-slate-900">Abonnements</h3>
            <p class="mt-2 text-sm leading-relaxed text-slate-600">
              Choisissez le forfait adapté, suivez vos consommations et débloquez les
              fonctionnalités avancées.
            </p>
          </article>
        </div>
      </div>
    </section>

    <section id="fonctionnement" class="bg-brand-800 py-20 lg:py-28">
      <div class="container-page">
        <div class="mx-auto max-w-2xl text-center">
          <span class="eyebrow text-accent-300">Fonctionnement</span>
          <h2 class="mt-3 text-3xl font-bold leading-tight text-white sm:text-4xl">
            Opérationnel en trois étapes
          </h2>
          <p class="mt-4 text-lg text-brand-100">
            De la création du compte à la première annonce publiée, comptez quelques minutes.
          </p>
        </div>

        <div class="mt-14 grid gap-8 md:grid-cols-3">
          <div class="rounded-2xl bg-white/5 p-7 ring-1 ring-white/10">
            <span class="flex h-10 w-10 items-center justify-center rounded-full bg-accent-500 text-sm font-bold text-white">1</span>
            <h3 class="mt-5 text-lg font-semibold text-white">Créez votre compte gérant</h3>
            <p class="mt-2 text-sm leading-relaxed text-brand-100">
              Inscrivez-vous depuis l'application mobile avec votre numéro et un code PIN à
              six chiffres.
            </p>
          </div>
          <div class="rounded-2xl bg-white/5 p-7 ring-1 ring-white/10">
            <span class="flex h-10 w-10 items-center justify-center rounded-full bg-accent-500 text-sm font-bold text-white">2</span>
            <h3 class="mt-5 text-lg font-semibold text-white">Complétez le profil</h3>
            <p class="mt-2 text-sm leading-relaxed text-brand-100">
              Photo, adresse, horaires et assurances acceptées : renseignez les informations
              visibles par vos patients.
            </p>
          </div>
          <div class="rounded-2xl bg-white/5 p-7 ring-1 ring-white/10">
            <span class="flex h-10 w-10 items-center justify-center rounded-full bg-accent-500 text-sm font-bold text-white">3</span>
            <h3 class="mt-5 text-lg font-semibold text-white">Publiez et suivez</h3>
            <p class="mt-2 text-sm leading-relaxed text-brand-100">
              Annonces, newsletters et statistiques depuis le tableau de bord, où que vous soyez.
            </p>
          </div>
        </div>
      </div>
    </section>

    <section id="forfaits" class="py-20 lg:py-28">
      <div class="container-page">
        <div class="mx-auto max-w-2xl text-center">
          <span class="eyebrow">Forfaits</span>
          <h2 class="section-title mt-3">Une formule pour chaque officine</h2>
          <p class="mt-4 text-lg text-slate-600">
            Commencez gratuitement, évoluez lorsque votre activité grandit.
          </p>
        </div>

        <div class="mt-14 grid gap-6 lg:grid-cols-3">
          <div class="card flex flex-col p-7">
            <h3 class="text-lg font-semibold text-slate-900">Gratuit</h3>
            <p class="mt-4 text-4xl font-extrabold text-slate-900">0 FCFA</p>
            <p class="mt-1 text-sm text-slate-500">pour 365 jours</p>
            <ul class="mt-6 space-y-3 text-sm text-slate-600">
              <li class="flex gap-3"><span class="text-brand-500">&#10003;</span> Profil de base</li>
              <li class="flex gap-3"><span class="text-brand-500">&#10003;</span> Horaires d'ouverture</li>
              <li class="flex gap-3"><span class="text-brand-500">&#10003;</span> Localisation sur la carte</li>
            </ul>
            <a href="inscription.php" class="btn-ghost btn-block mt-8">Commencer</a>
          </div>

          <div class="card relative flex flex-col border-2 border-brand-800 p-7 lg:-mt-4 lg:mb-4">
            <span class="chip absolute -top-3 left-7 bg-brand-800 text-white">Recommandé</span>
            <h3 class="text-lg font-semibold text-slate-900">Standard</h3>
            <p class="mt-4 text-4xl font-extrabold text-slate-900">15 000 FCFA</p>
            <p class="mt-1 text-sm text-slate-500">pour 30 jours</p>
            <ul class="mt-6 space-y-3 text-sm text-slate-600">
              <li class="flex gap-3"><span class="text-brand-500">&#10003;</span> Tout le forfait Gratuit</li>
              <li class="flex gap-3"><span class="text-brand-500">&#10003;</span> Photo et assurances acceptées</li>
              <li class="flex gap-3"><span class="text-brand-500">&#10003;</span> Statistiques de base</li>
              <li class="flex gap-3"><span class="text-brand-500">&#10003;</span> 10 newsletters par mois</li>
              <li class="flex gap-3"><span class="text-brand-500">&#10003;</span> 5 annonces par mois</li>
            </ul>
            <a href="inscription.php" class="btn-primary btn-block mt-8">Choisir Standard</a>
          </div>

          <div class="card flex flex-col p-7">
            <h3 class="text-lg font-semibold text-slate-900">Premium</h3>
            <p class="mt-4 text-4xl font-extrabold text-slate-900">30 000 FCFA</p>
            <p class="mt-1 text-sm text-slate-500">pour 30 jours</p>
            <ul class="mt-6 space-y-3 text-sm text-slate-600">
              <li class="flex gap-3"><span class="text-brand-500">&#10003;</span> Tout le forfait Standard</li>
              <li class="flex gap-3"><span class="text-brand-500">&#10003;</span> Statistiques avancées</li>
              <li class="flex gap-3"><span class="text-brand-500">&#10003;</span> Newsletters et annonces illimitées</li>
              <li class="flex gap-3"><span class="text-brand-500">&#10003;</span> Badge vérifié</li>
              <li class="flex gap-3"><span class="text-brand-500">&#10003;</span> Priorité dans les recherches</li>
            </ul>
            <a href="inscription.php" class="btn-ghost btn-block mt-8">Choisir Premium</a>
          </div>
        </div>
      </div>
    </section>

    <section class="pb-20 lg:pb-28">
      <div class="container-page">
        <div class="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-800 to-brand-600 px-8 py-14 text-center shadow-pop sm:px-16">
          <div class="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10"></div>
          <div class="pointer-events-none absolute -bottom-24 -left-10 h-64 w-64 rounded-full bg-accent-500/20"></div>
          <h2 class="relative text-3xl font-bold text-white sm:text-4xl">
            Prêt à piloter votre pharmacie ?
          </h2>
          <p class="relative mx-auto mt-4 max-w-xl text-brand-100">
            Connectez-vous à votre espace gérant et retrouvez votre tableau de bord en un clic.
          </p>
          <div class="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <a href="inscription.php" class="btn btn-lg bg-white text-brand-800 hover:bg-brand-50">
              Créer mon espace
            </a>
            <a href="connexion.php" class="btn btn-lg border border-white/40 text-white hover:bg-white/10">
              Se connecter
            </a>
          </div>
        </div>
      </div>
    </section>
    <section id="installation" class="pb-20 lg:pb-28">
      <div class="container-page">
        <div class="rounded-3xl border border-slate-200 bg-slate-50 px-6 py-10 sm:px-10">
          <p class="eyebrow">Application</p>
          <h2 class="mt-2 text-2xl font-bold text-slate-900">Installer l'application</h2>
          <p class="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
            Ajoutez GoPharma à l'écran d'accueil de votre téléphone : l'application s'ouvre en
            plein écran et les dernières données consultées restent disponibles hors ligne.
          </p>
          <div class="mt-5 flex flex-wrap items-center gap-3">
            <button id="install-btn" data-install type="button" class="btn-primary" hidden>Installer l'application</button>
            <p id="install-hint" class="text-xs text-slate-500">
              Sur iPhone : bouton Partager puis « Sur l'écran d'accueil ».
            </p>
          </div>
        </div>
      </div>
    </section>
  </main>

  <footer class="border-t border-slate-200 bg-slate-50">
    <div class="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
      <div class="lg:col-span-2">
        <img src="assets/img/logo.png" alt="GoPharma" class="h-12 w-auto" />
        <p class="mt-4 max-w-md text-sm leading-relaxed text-slate-600">
          GoPharma accompagne les gérants de pharmacie et les patients en Côte d'Ivoire :
          localisation, garde, annonces et abonnements réunis dans une seule plateforme.
        </p>
        <p class="mt-3 inline-block rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
          Version mobile bientôt disponible
        </p>
      </div>
      <div>
        <h4 class="text-sm font-semibold text-slate-900">Navigation</h4>
        <ul class="mt-4 space-y-2.5 text-sm text-slate-600">
          <li><a href="#fonctionnalites" class="hover:text-brand-700">Fonctionnalités</a></li>
          <li><a href="#fonctionnement" class="hover:text-brand-700">Fonctionnement</a></li>
          <li><a href="#forfaits" class="hover:text-brand-700">Forfaits</a></li>
          <li><a href="pharmacies.php" class="hover:text-brand-700">Pharmacies</a></li>
        </ul>
      </div>
      <div>
        <h4 class="text-sm font-semibold text-slate-900">Espace gérant</h4>
        <ul class="mt-4 space-y-2.5 text-sm text-slate-600">
          <li><a href="inscription.php" class="hover:text-brand-700">Créer un compte</a></li>
          <li><a href="connexion.php" class="hover:text-brand-700">Connexion</a></li>
          <li><a href="dashboard.php" class="hover:text-brand-700">Tableau de bord</a></li>
        </ul>
      </div>
    </div>
    <div class="border-t border-slate-200">
      <div class="container-page flex flex-col items-center justify-between gap-3 py-6 text-sm text-slate-500 sm:flex-row">
        <p>&copy; <span id="year"></span> GoPharma. Tous droits réservés.</p>
        <p>La pharmacie idéale partout</p>
      </div>
    </div>
  </footer>

  <script>
    window.GOPHARMA_CONFIG = { env: '<?= APP_ENV ?>', apiBase: '<?= api_base() ?>', debug: <?= APP_DEBUG ? 'true' : 'false' ?> };
  </script>
  <script src="assets/js/landing.js"></script>
  <script src="assets/js/pwa.js"></script>
  <script src="assets/js/share.js"></script>
</body>
</html>
