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
  <title>Tableau de bord — GoPharma Espace pharmacie</title>
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
  <div id="sidebar-overlay" class="fixed inset-0 z-40 hidden bg-slate-900/40 backdrop-blur-sm lg:hidden"></div>

  <aside id="sidebar"
         class="fixed inset-y-0 left-0 z-50 flex w-72 -translate-x-full flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:translate-x-0">
    <div class="flex h-20 items-center justify-between px-6">
      <a href="index.php">
        <img src="assets/img/logo.png" alt="GoPharma" class="h-11 w-auto" />
      </a>
      <button id="sidebar-close" type="button" class="rounded-lg p-2 text-slate-400 hover:bg-slate-100 lg:hidden" aria-label="Fermer le menu">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" class="h-5 w-5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
    </div>

    <div class="px-4">
      <div class="rounded-2xl bg-slate-50 p-4">
        <div class="flex items-center gap-3">
          <span id="user-avatar" class="flex h-11 w-11 items-center justify-center rounded-full bg-brand-800 text-sm font-bold text-white">GP</span>
          <div class="min-w-0">
            <p id="user-name" class="truncate text-sm font-semibold text-slate-900">Chargement</p>
            <p class="text-xs text-slate-500">Gérant de pharmacie</p>
          </div>
        </div>
        <div class="mt-3 flex items-center justify-between rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
          <span class="text-xs font-medium text-slate-500">Forfait</span>
          <span id="user-plan" class="chip bg-brand-50 text-brand-700">—</span>
        </div>
      </div>
    </div>

    <nav class="mt-6 flex-1 space-y-1 overflow-y-auto px-4 pb-6">
      <p class="px-3 pb-2 text-[11px] font-bold uppercase tracking-[.14em] text-slate-400">Pilotage</p>
      <a href="#/accueil" data-nav="accueil" class="sidebar-link">
        <span data-icon="home"></span> Accueil
      </a>
      <a href="#/profil" data-nav="profil" class="sidebar-link">
        <span data-icon="building"></span> Profil pharmacie
      </a>
      <a href="#/annonces" data-nav="annonces" class="sidebar-link">
        <span data-icon="megaphone"></span> Annonces
        <span data-badge="annonces" class="ml-auto hidden rounded-full bg-accent-50 px-2 py-0.5 text-[11px] font-semibold text-accent-600"></span>
      </a>
      <a href="#/newsletter" data-nav="newsletter" class="sidebar-link">
        <span data-icon="mail"></span> Newsletter
      </a>
      <a href="#/statistiques" data-nav="statistiques" class="sidebar-link">
        <span data-icon="chart"></span> Statistiques
      </a>
      <a href="#/abonnement" data-nav="abonnement" class="sidebar-link">
        <span data-icon="star"></span> Abonnement
      </a>

      <p class="px-3 pb-2 pt-6 text-[11px] font-bold uppercase tracking-[.14em] text-slate-400">Compte</p>
      <button id="logout-btn" type="button" class="sidebar-link w-full text-red-600 hover:bg-red-50 hover:text-red-700">
        <span data-icon="logout"></span> Déconnexion
      </button>
    </nav>
  </aside>

  <div class="lg:pl-72">
    <header class="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div class="flex h-16 items-center gap-4 px-4 sm:px-6 lg:h-20 lg:px-8">
        <button id="sidebar-open" type="button" class="rounded-xl border border-slate-200 p-2 text-slate-600 lg:hidden" aria-label="Ouvrir le menu">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" class="h-5 w-5"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"/></svg>
        </button>

        <img src="assets/img/logo.png" alt="GoPharma" class="h-9 w-auto lg:hidden" />

        <div class="hidden lg:block">
          <h1 id="page-title" class="text-lg font-semibold text-slate-900">Accueil</h1>
          <p id="page-subtitle" class="text-xs text-slate-500">Vue d'ensemble de votre pharmacie</p>
        </div>

        <div class="ml-auto flex items-center gap-3">
          <span id="topbar-plan" class="chip hidden bg-brand-50 text-brand-700 sm:inline-flex">
            <span data-icon="star" class="h-3.5 w-3.5"></span>
            <span data-plan-name>—</span>
          </span>
          <button id="topbar-logout" type="button" class="hidden rounded-xl border border-slate-200 p-2.5 text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 sm:block" aria-label="Se déconnecter">
            <span data-icon="logout"></span>
          </button>
        </div>
      </div>
    </header>

    <main class="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <section data-view="accueil" class="hidden space-y-6">
        <div>
          <p class="eyebrow">Espace pharmacie</p>
          <h2 class="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
            Bienvenue, <span data-field="prenom-gerant">Gérant</span>
          </h2>
          <p class="mt-1 text-sm text-slate-500" data-field="aujourdhui"></p>
        </div>

        <div class="grid gap-6 lg:grid-cols-3">
          <div class="card overflow-hidden lg:col-span-2">
            <div class="flex flex-col gap-5 bg-gradient-to-r from-brand-800 to-brand-600 p-6 sm:flex-row sm:items-center">
              <img data-field="pharmacie-photo" src="" alt=""
                   class="hidden h-20 w-20 rounded-2xl object-cover ring-2 ring-white/40" />
              <span data-field="pharmacie-photo-placeholder"
                    class="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white ring-2 ring-white/20">
                <span data-icon="building" class="h-9 w-9"></span>
              </span>
              <div class="min-w-0 flex-1">
                <p class="text-sm text-brand-100">Votre établissement</p>
                <p class="truncate text-xl font-bold text-white" data-field="pharmacie-nom">Chargement…</p>
                <p class="mt-1 truncate text-sm text-brand-100" data-field="pharmacie-adresse">—</p>
              </div>
              <span data-field="garde-chip" class="chip self-start bg-white/15 text-white sm:self-auto">Hors garde</span>
            </div>
            <div class="grid gap-px bg-slate-100 sm:grid-cols-3">
              <div class="bg-white p-5">
                <p class="stat-label">Téléphone</p>
                <p class="mt-1 truncate text-sm font-semibold text-slate-900" data-field="pharmacie-tel">—</p>
              </div>
              <div class="bg-white p-5">
                <p class="stat-label">E-mail</p>
                <p class="mt-1 truncate text-sm font-semibold text-slate-900" data-field="pharmacie-email">—</p>
              </div>
              <div class="bg-white p-5">
                <p class="stat-label">Statut</p>
                <p class="mt-1 truncate text-sm font-semibold text-slate-900" data-field="pharmacie-statut">—</p>
              </div>
            </div>
          </div>

          <div class="rounded-2xl bg-gradient-to-br from-brand-800 to-brand-600 p-6 text-white shadow-card">
            <div class="flex items-center justify-between">
              <p class="text-sm text-brand-100">Forfait actuel</p>
              <span class="chip bg-white/15 text-white">Actif</span>
            </div>
            <p class="mt-3 text-3xl font-bold" data-field="plan-nom">Gratuit</p>
            <p class="mt-1 text-sm text-brand-100" data-field="plan-prix">0 FCFA</p>
            <div class="mt-4 h-1.5 w-full rounded-full bg-white/20">
              <div class="h-1.5 rounded-full bg-accent-400 transition-all" data-field="plan-progress" style="width:0%"></div>
            </div>
            <p class="mt-2 text-xs text-brand-100" data-field="plan-jours">—</p>
            <a href="#/abonnement" class="btn mt-5 w-full bg-white text-brand-800 hover:bg-brand-50">Gérer l'abonnement</a>
          </div>
        </div>

        <div id="accueil-creation" class="hidden flex-col gap-4 rounded-2xl border border-accent-200 bg-accent-50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex items-start gap-3">
            <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-accent-600">
              <span data-icon="plus" class="h-5 w-5"></span>
            </span>
            <div>
              <p class="text-base font-semibold text-slate-900">Créez le profil de votre pharmacie</p>
              <p class="mt-1 text-sm text-slate-600">
                Nom, adresse, horaires et assurances : complétez votre fiche pour être trouvé par les patients.
              </p>
            </div>
          </div>
          <a href="#/profil" class="btn-accent shrink-0">Créer ma pharmacie</a>
        </div>

        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div class="card p-5">
            <div class="flex items-center justify-between">
              <p class="stat-label">Annonces</p>
              <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-50 text-accent-500"><span data-icon="megaphone" class="h-5 w-5"></span></span>
            </div>
            <p class="stat-value mt-3" data-stat="annonces">—</p>
            <p class="mt-1 text-xs text-slate-500">publiées</p>
          </div>
          <div class="card p-5">
            <div class="flex items-center justify-between">
              <p class="stat-label">Abonnés</p>
              <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><span data-icon="users" class="h-5 w-5"></span></span>
            </div>
            <p class="stat-value mt-3" data-stat="abonnes">—</p>
            <p class="mt-1 text-xs text-slate-500">newsletter</p>
          </div>
          <div class="card p-5">
            <div class="flex items-center justify-between">
              <p class="stat-label">Vues annonces</p>
              <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><span data-icon="eye" class="h-5 w-5"></span></span>
            </div>
            <p class="stat-value mt-3" data-stat="vues">—</p>
            <p class="mt-1 text-xs text-slate-500">cumulées</p>
          </div>
          <div class="card p-5">
            <div class="flex items-center justify-between">
              <p class="stat-label">Assurances</p>
              <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><span data-icon="shield" class="h-5 w-5"></span></span>
            </div>
            <p class="stat-value mt-3" data-stat="assurances">—</p>
            <p class="mt-1 text-xs text-slate-500">acceptées</p>
          </div>
        </div>

        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <button type="button" data-action="go" data-target="#/annonces" class="card group flex items-center gap-3 p-4 text-left transition hover:border-brand-200">
            <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-50 text-accent-500"><span data-icon="plus" class="h-5 w-5"></span></span>
            <span>
              <span class="block text-sm font-semibold text-slate-900">Nouvelle annonce</span>
              <span class="block text-xs text-slate-500">Informer vos patients</span>
            </span>
          </button>
          <button type="button" data-action="go" data-target="#/newsletter" class="card group flex items-center gap-3 p-4 text-left transition hover:border-brand-200">
            <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><span data-icon="send" class="h-5 w-5"></span></span>
            <span>
              <span class="block text-sm font-semibold text-slate-900">Newsletter</span>
              <span class="block text-xs text-slate-500">Contacter vos abonnés</span>
            </span>
          </button>
          <button type="button" data-action="go" data-target="#/profil" class="card group flex items-center gap-3 p-4 text-left transition hover:border-brand-200">
            <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><span data-icon="cog" class="h-5 w-5"></span></span>
            <span>
              <span class="block text-sm font-semibold text-slate-900">Modifier le profil</span>
              <span class="block text-xs text-slate-500">Horaires et assurances</span>
            </span>
          </button>
          <button type="button" data-action="go" data-target="#/abonnement" class="card group flex items-center gap-3 p-4 text-left transition hover:border-brand-200">
            <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><span data-icon="star" class="h-5 w-5"></span></span>
            <span>
              <span class="block text-sm font-semibold text-slate-900">Changer de forfait</span>
              <span class="block text-xs text-slate-500">Débloquer les modules</span>
            </span>
          </button>
        </div>

        <p id="accueil-modules-indisponibles" class="hidden text-xs leading-relaxed text-slate-500">
          Votre forfait actuel n'ouvre pas encore les modules Annonces, Newsletter et Statistiques :
          ils arriveront prochainement, avec les forfaits Standard et Premium.
          <a href="#/abonnement" class="font-semibold text-brand-700 hover:text-brand-800">Voir les forfaits</a>.
        </p>
      </section>

      <section data-view="profil" class="hidden space-y-6">
        <div>
          <p class="eyebrow">Espace profil</p>
          <h2 class="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">Profil de votre pharmacie</h2>
          <p class="mt-1 text-sm text-slate-500">
            Gardez vos informations à jour pour que vos patients trouvent toujours des données exactes.
          </p>
        </div>

        <div id="profil-creation" class="hidden rounded-2xl border border-accent-200 bg-accent-50 p-5">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div class="flex items-start gap-3">
              <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-accent-600">
                <span data-icon="plus" class="h-5 w-5"></span>
              </span>
              <div>
                <h3 class="text-base font-semibold text-slate-900">Vous n'avez pas encore de pharmacie</h3>
                <p class="mt-1 text-sm text-slate-600">
                  Renseignez les informations ci-dessous pour créer le profil de votre
                  pharmacie et apparaître dans les recherches des patients.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div class="grid gap-6 lg:grid-cols-3">
          <div id="garde-carte" class="card flex flex-col gap-4 p-6 lg:col-span-1">
            <div class="flex items-start justify-between gap-4">
              <div>
                <h3 class="text-base font-semibold text-slate-900">Pharmacie de garde</h3>
                <p class="mt-1 text-sm text-slate-500" data-field="garde-libelle">
                  Activez le mode garde pour être visible en priorité.
                </p>
              </div>
              <span data-icon="moon" class="h-6 w-6 shrink-0 text-brand-700"></span>
            </div>
            <div class="flex rounded-xl bg-slate-100 p-1">
              <button type="button" data-garde="1" class="flex-1 rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 transition">Activé</button>
              <button type="button" data-garde="0" class="flex-1 rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 transition">Désactivé</button>
            </div>
            <p class="text-xs text-slate-400" data-field="garde-maj">Dernière mise à jour : —</p>
          </div>

          <div class="card p-6 lg:col-span-2">
            <h3 class="flex items-center gap-2 text-base font-semibold text-slate-900">
              <span data-icon="photo" class="h-5 w-5 text-brand-700"></span>
              Photo de la pharmacie
            </h3>
            <div class="mt-4 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
              <div class="flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-slate-50">
                <img id="photo-preview" src="" alt="" class="hidden h-full w-full object-cover" />
                <span id="photo-placeholder" data-icon="photo" class="h-8 w-8 text-slate-400"></span>
              </div>
              <div class="flex flex-wrap gap-3">
                <label class="btn-accent cursor-pointer">
                  Choisir une photo
                  <input id="photo-input" type="file" accept="image/*" class="hidden" />
                </label>
                <button id="photo-upload" type="button" class="btn-ghost" hidden>Publier la photo</button>
              </div>
            </div>
            <p class="mt-3 text-xs text-slate-400">Formats acceptés : JPG, PNG. Taille maximale recommandée : 2 Mo.</p>
          </div>
        </div>

        <div class="grid gap-6 lg:grid-cols-2">
          <div class="card p-6">
            <h3 class="flex items-center gap-2 text-base font-semibold text-slate-900">
              <span data-icon="info" class="h-5 w-5 text-brand-700"></span>
              Informations de base
            </h3>
            <form id="profil-form" class="mt-5 space-y-4">
              <div>
                <label class="label" for="nom-pharmacie">Nom de la pharmacie</label>
                <input id="nom-pharmacie" class="input" type="text" placeholder="Nom pharmacie" />
              </div>
              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <label class="label" for="ville">Ville</label>
                  <input id="ville" class="input" type="text" placeholder="Ville pharmacie" />
                </div>
                <div>
                  <label class="label" for="telephone">Téléphone</label>
                  <input id="telephone" class="input" type="tel" placeholder="Contact pharmacie" />
                </div>
              </div>
              <div>
                <label class="label" for="adresse">Adresse</label>
                <input id="adresse" class="input" type="text" placeholder="Adresse pharmacie" />
              </div>
              <div>
                <label class="label" for="email">E-mail</label>
                <input id="email" class="input" type="email" placeholder="E-mail pharmacie" />
              </div>
            </form>
          </div>

          <div class="card p-6">
            <h3 class="flex items-center gap-2 text-base font-semibold text-slate-900">
              <span data-icon="clock" class="h-5 w-5 text-brand-700"></span>
              Horaires d'ouverture
            </h3>

            <div class="mt-5 space-y-4">
              <div class="rounded-xl bg-slate-50 p-4">
                <p class="text-sm font-semibold text-slate-700">Lundi – Vendredi</p>
                <div class="mt-2 flex items-center gap-3">
                  <input id="h-sem-ouverture" type="time" class="input" />
                  <span class="text-sm text-slate-400">à</span>
                  <input id="h-sem-fermeture" type="time" class="input" />
                </div>
              </div>

              <div class="rounded-xl bg-slate-50 p-4">
                <p class="text-sm font-semibold text-slate-700">Samedi</p>
                <div class="mt-2 flex items-center gap-3">
                  <input id="h-sam-ouverture" type="time" class="input" />
                  <span class="text-sm text-slate-400">à</span>
                  <input id="h-sam-fermeture" type="time" class="input" />
                </div>
              </div>

              <div class="rounded-xl bg-slate-50 p-4">
                <div class="flex items-center justify-between gap-4">
                  <p class="text-sm font-semibold text-accent-600">Ouvert le dimanche</p>
                  <label class="relative inline-flex cursor-pointer items-center">
                    <input id="ouvert-dimanche" type="checkbox" class="peer sr-only" />
                    <span class="h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-brand-700"></span>
                    <span class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition peer-checked:translate-x-5"></span>
                  </label>
                </div>
                <div id="dimanche-horaires" class="mt-3 hidden">
                  <div class="flex items-center gap-3">
                    <input id="h-dim-ouverture" type="time" class="input" />
                    <span class="text-sm text-slate-400">à</span>
                    <input id="h-dim-fermeture" type="time" class="input" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="card p-6">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <h3 class="flex items-center gap-2 text-base font-semibold text-slate-900">
              <span data-icon="shield" class="h-5 w-5 text-brand-700"></span>
              Assurances acceptées
            </h3>
            <p class="text-sm text-slate-500" data-field="assurances-count">0 assurance(s) sélectionnée(s)</p>
          </div>
          <div id="assurances-list" class="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <div class="skeleton h-12"></div>
            <div class="skeleton h-12"></div>
            <div class="skeleton h-12"></div>
          </div>
        </div>

        <div class="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <a href="#/accueil" class="btn-ghost">Annuler</a>
          <button id="save-profil" type="button" class="btn-primary btn-lg">
            <span data-icon="check" class="h-4 w-4"></span>
            <span id="save-profil-label">Enregistrer les modifications</span>
          </button>
        </div>
      </section>

      <section data-view="annonces" class="hidden space-y-6">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p class="eyebrow">Espace annonce</p>
            <h2 class="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">Mes annonces</h2>
            <p class="mt-1 text-sm text-slate-500">
              Publiez promotions, informations et urgences visibles par tous les patients.
            </p>
          </div>
          <button id="new-annonce" type="button" class="btn-primary">
            <span data-icon="plus" class="h-4 w-4"></span>
            Nouvelle annonce
          </button>
        </div>

        <div id="annonces-contenu" class="space-y-6">
          <div class="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4">
            <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><span data-icon="megaphone" class="h-5 w-5"></span></span>
            <div>
              <p class="text-sm font-semibold text-slate-900"><span data-stat="annonces">0</span> annonce(s) publiée(s)</p>
              <p class="text-xs text-slate-500" data-field="annonces-quota">Votre forfait définit le nombre d'envois autorisés.</p>
            </div>
          </div>

          <div id="annonces-list" class="grid gap-4 lg:grid-cols-2"></div>
        </div>

        <div id="annonces-verrouille" class="hidden"></div>
      </section>

      <section data-view="newsletter" class="hidden space-y-6">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p class="eyebrow">Espace newsletter</p>
            <h2 class="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">Abonnés newsletter</h2>
            <p class="mt-1 text-sm text-slate-500">
              Retrouvez les patients abonnés aux actualités de votre pharmacie.
            </p>
          </div>
          <button id="new-newsletter" type="button" class="btn-primary">
            <span data-icon="send" class="h-4 w-4"></span>
            Envoyer une newsletter
          </button>
        </div>

        <div id="newsletter-contenu" class="space-y-6">
          <div class="rounded-2xl bg-gradient-to-r from-brand-800 to-brand-600 p-6 text-white">
            <div class="flex flex-wrap items-center gap-6 sm:gap-10">
              <div>
                <p class="text-sm text-brand-100">Abonnés</p>
                <p class="text-3xl font-bold" data-stat="abonnes">0</p>
              </div>
              <span class="hidden h-10 w-px bg-white/30 sm:block"></span>
              <div>
                <p class="text-sm text-brand-100">Abonnements actifs</p>
                <p class="text-3xl font-bold" data-stat="abonnes-actifs">0</p>
              </div>
              <span class="hidden h-10 w-px bg-white/30 sm:block"></span>
              <div>
                <p class="text-sm text-brand-100">Dernier abonnement</p>
                <p class="text-3xl font-bold" data-field="dernier-abonnement">—</p>
              </div>
            </div>
          </div>

          <div id="newsletter-list" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"></div>
        </div>

        <div id="newsletter-verrouille" class="hidden"></div>
      </section>

      <section data-view="statistiques" class="hidden space-y-6">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p class="eyebrow">Espace statistiques</p>
            <h2 class="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">Statistiques</h2>
            <p class="mt-1 text-sm text-slate-500">
              Analysez la performance de vos annonces et de vos newsletters.
            </p>
          </div>
          <div class="flex rounded-xl bg-slate-100 p-1" id="periode-stats" role="tablist" aria-label="Période">
            <button type="button" data-periode="7" class="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-500 transition">7 jours</button>
            <button type="button" data-periode="30" class="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-500 transition">30 jours</button>
            <button type="button" data-periode="0" class="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-500 transition">Tout</button>
          </div>
        </div>

        <div id="stats-contenu" class="space-y-6">
        <p class="text-xs text-slate-400" data-field="st-periode-libelle"></p>

        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div class="card p-5">
            <div class="flex items-center justify-between">
              <p class="stat-label">Annonces publiées</p>
              <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-50 text-accent-500"><span data-icon="megaphone" class="h-5 w-5"></span></span>
            </div>
            <p class="stat-value mt-3" data-stat="st-annonces">—</p>
            <p class="mt-1 text-xs text-slate-500">sur la période</p>
          </div>
          <div class="card p-5">
            <div class="flex items-center justify-between">
              <p class="stat-label">Vues cumulées</p>
              <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><span data-icon="eye" class="h-5 w-5"></span></span>
            </div>
            <p class="stat-value mt-3" data-stat="st-vues">—</p>
            <p class="mt-1 text-xs text-slate-500">toutes vos annonces</p>
          </div>
          <div class="card p-5">
            <div class="flex items-center justify-between">
              <p class="stat-label">Vues par annonce</p>
              <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><span data-icon="chart" class="h-5 w-5"></span></span>
            </div>
            <p class="stat-value mt-3" data-stat="st-vues-moy">—</p>
            <p class="mt-1 text-xs text-slate-500">moyenne</p>
          </div>
          <div class="card p-5">
            <div class="flex items-center justify-between">
              <p class="stat-label">Nouveaux abonnés</p>
              <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><span data-icon="users" class="h-5 w-5"></span></span>
            </div>
            <p class="stat-value mt-3" data-stat="st-abonnes-periode">—</p>
            <p class="mt-1 text-xs text-slate-500">sur la période</p>
          </div>
        </div>

        <div class="grid gap-6 lg:grid-cols-3">
          <div class="card overflow-hidden lg:col-span-2">
            <div class="border-b border-slate-100 px-6 py-4">
              <h3 class="text-base font-semibold text-slate-900">Classement des annonces</h3>
              <p class="text-xs text-slate-500">Selon le nombre de vues enregistrées</p>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th class="px-6 py-3 font-semibold">Annonce</th>
                    <th class="px-4 py-3 font-semibold">Type</th>
                    <th class="px-4 py-3 font-semibold">Publication</th>
                    <th class="px-6 py-3 text-right font-semibold">Vues</th>
                  </tr>
                </thead>
                <tbody id="stats-classement" class="divide-y divide-slate-100"></tbody>
              </table>
            </div>
          </div>

          <div class="card p-6">
            <h3 class="text-base font-semibold text-slate-900">Newsletter</h3>
            <dl class="mt-4 space-y-3 text-sm">
              <div class="flex items-center justify-between gap-3">
                <dt class="text-slate-500">Abonnés</dt>
                <dd class="font-semibold text-slate-900" data-stat="st-abonnes">—</dd>
              </div>
              <div class="flex items-center justify-between gap-3">
                <dt class="text-slate-500">Abonnés actifs</dt>
                <dd class="font-semibold text-slate-900" data-stat="st-actifs">—</dd>
              </div>
              <div class="flex items-center justify-between gap-3">
                <dt class="text-slate-500">Taux d'activité</dt>
                <dd class="font-semibold text-slate-900" data-stat="st-taux">—</dd>
              </div>
              <div class="flex items-center justify-between gap-3">
                <dt class="text-slate-500">Dernier abonnement</dt>
                <dd class="font-semibold text-slate-900" data-field="st-dernier-abonnement">—</dd>
              </div>
            </dl>
            <a href="#/newsletter" class="btn-ghost btn-block mt-5">Gérer mes abonnés</a>
          </div>
        </div>

        <div id="stats-graphiques" class="space-y-6">
          <div class="grid gap-6 lg:grid-cols-3">
            <div class="card p-6 lg:col-span-2">
              <h3 class="text-base font-semibold text-slate-900">Vues par annonce</h3>
              <p class="mb-5 text-xs text-slate-500">Les 6 annonces les plus consultées</p>
              <div id="chart-vues-annonces"></div>
            </div>
            <div class="card p-6">
              <h3 class="text-base font-semibold text-slate-900">Répartition par type</h3>
              <p class="mb-5 text-xs text-slate-500">Nature de vos annonces</p>
              <div id="chart-types"></div>
            </div>
          </div>

          <div class="grid gap-6 lg:grid-cols-3">
            <div class="card p-6 lg:col-span-2">
              <h3 class="text-base font-semibold text-slate-900">Évolution des abonnements</h3>
              <p class="mb-5 text-xs text-slate-500">Nouveaux abonnés sur les 6 derniers mois</p>
              <div id="chart-abonnes"></div>
            </div>
            <div class="card p-6">
              <h3 class="text-base font-semibold text-slate-900">Statut des abonnés</h3>
              <p class="mb-5 text-xs text-slate-500">Actifs et inactifs</p>
              <div id="chart-statut-abonnes"></div>
            </div>
          </div>

          <div class="card p-6">
            <h3 class="text-base font-semibold text-slate-900">Rythme de publication</h3>
            <p class="mb-5 text-xs text-slate-500">Annonces publiées par jour sur la période</p>
            <div id="chart-publications"></div>
          </div>
        </div>

        <div id="stats-verrouille" class="card hidden border-dashed p-10 text-center">
          <span class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <span data-icon="chart" class="h-7 w-7"></span>
          </span>
          <h3 class="mt-5 text-lg font-semibold text-slate-900">Statistiques avancées</h3>
          <p class="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
            Les graphiques détaillés (vues par annonce, évolution des abonnements, rythme de
            publication) sont réservés au forfait Premium.
          </p>
          <a href="#/abonnement" class="btn-primary mt-6">Découvrir Premium</a>
        </div>

        <div class="card p-6">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <h3 class="flex items-center gap-2 text-base font-semibold text-slate-900">
              <span data-icon="chart" class="h-5 w-5 text-brand-700"></span>
              Consommation de votre forfait
            </h3>
            <a href="#/abonnement" class="text-sm font-semibold text-brand-700 hover:text-brand-800">Voir les forfaits</a>
          </div>
          <div id="stats-quotas" class="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"></div>
        </div>
        </div>

        <div id="stats-verrouille-module" class="hidden"></div>
      </section>

      <section data-view="abonnement" class="hidden space-y-6">
        <div>
          <p class="eyebrow">Espace abonnement</p>
          <h2 class="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">Votre abonnement</h2>
          <p class="mt-1 text-sm text-slate-500">
            Choisissez le forfait qui correspond à l'activité de votre pharmacie.
          </p>
        </div>

        <div class="rounded-2xl bg-gradient-to-r from-brand-800 to-brand-600 p-6 text-white sm:p-8">
          <div class="flex flex-wrap items-center justify-between gap-6">
            <div>
              <p class="text-sm text-brand-100">Votre plan actuel</p>
              <p class="mt-1 text-3xl font-bold" data-field="plan-nom">Gratuit</p>
              <p class="mt-1 text-sm text-brand-100" data-field="plan-prix">0 FCFA</p>
            </div>
            <div class="text-right">
              <p class="text-sm text-brand-100" data-field="plan-periode">—</p>
              <p class="mt-1 text-lg font-semibold" data-field="plan-jours">—</p>
            </div>
          </div>
        </div>

        <div>
          <h3 class="text-lg font-semibold text-slate-900">Forfaits disponibles</h3>
          <div id="forfaits-list" class="mt-4 grid gap-6 lg:grid-cols-3">
            <div class="skeleton h-72"></div>
            <div class="skeleton h-72"></div>
            <div class="skeleton h-72"></div>
          </div>
        </div>

        <div>
          <h3 class="text-lg font-semibold text-slate-900">Historique</h3>
          <div id="historique-list" class="mt-4 space-y-3"></div>
        </div>
      </section>
    </main>

    <footer class="border-t border-slate-200 bg-white">
      <div class="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-slate-500 sm:flex-row sm:px-6 lg:px-8">
        <p>&copy; <span id="year"></span> GoPharma — Espace pharmacie</p>
        <nav class="flex flex-wrap items-center justify-center gap-2" aria-label="Navigation publique">
          <a href="pharmacies.php" class="btn-nav">Pharmacies</a>
          <a href="connexion.php" class="btn-primary">Espace pharmacie</a>
        </nav>
      </div>
    </footer>
  </div>

  <script>
    window.GOPHARMA_CONFIG = { env: '<?= APP_ENV ?>', apiBase: '<?= api_base() ?>', debug: <?= APP_DEBUG ? 'true' : 'false' ?> };
  </script>
  <script src="assets/js/config.js"></script>
  <script src="assets/js/ui.js"></script>
  <script src="assets/js/charts.js"></script>
  <script src="assets/js/api.js"></script>
  <script src="assets/js/dashboard.js"></script>
  <script src="assets/js/pwa.js"></script>
</body>
</html>
