<?php
/**
 * GoPharma — création de compte gérant de pharmacie.
 * Étape 1 : informations personnelles
 * Étape 2 : code PIN
 * Étape 3 : informations de la pharmacie (gestionnaires uniquement)
 */
require_once __DIR__ . '/config/app.php';
?>
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Créer mon espace pharmacie — GoPharma</title>
  <meta name="description" content="Inscrivez-vous et créez le profil de votre pharmacie en quelques minutes." />
  <link rel="icon" type="image/png" href="assets/img/logo-icone.png" />
  <link rel="manifest" href="manifest.webmanifest" />
  <meta name="theme-color" content="#1B8A5A" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="assets/css/app.css" />
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
          Créez votre espace,<br />on s'occupe du reste.
        </h1>
        <p class="mt-4 max-w-md text-brand-100">
          Trois étapes suffisent : vos informations, votre code PIN puis le profil
          de votre pharmacie.
        </p>

        <ol class="mt-10 space-y-5 text-sm text-brand-100" id="aside-steps">
          <li data-aside-step="1" class="flex items-start gap-3">
            <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-brand-800 text-xs font-bold">1</span>
            <span><span class="font-semibold text-white">Vos informations</span><br />Nom, numéro, ville et assurance.</span>
          </li>
          <li data-aside-step="2" class="flex items-start gap-3 opacity-60">
            <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/15 text-white text-xs font-bold">2</span>
            <span><span class="font-semibold text-white">Votre code PIN</span><br />Pour sécuriser vos accès.</span>
          </li>
          <li data-aside-step="3" class="flex items-start gap-3 opacity-60">
            <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/15 text-white text-xs font-bold">3</span>
            <span><span class="font-semibold text-white">Votre pharmacie</span><br />Nom, horaires et assurances acceptées.</span>
          </li>
        </ol>
      </div>

      <p class="relative mt-12 text-xs text-brand-200">
        &copy; <span id="year-side"></span> GoPharma — La pharmacie idéale partout
      </p>
    </aside>

    <main class="flex items-center justify-center px-5 py-10 sm:px-10">
      <div class="w-full max-w-lg">
        <div class="mb-8 flex items-center justify-between lg:hidden">
          <a href="/">
            <img src="assets/img/logo.png" alt="GoPharma" class="h-11 w-auto" />
          </a>
          <a href="/" class="text-sm font-medium text-slate-500 hover:text-brand-700">Accueil</a>
        </div>

        <a href="connexion" class="mb-8 hidden items-center gap-2 text-sm font-medium text-slate-500 hover:text-brand-700 lg:inline-flex">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/></svg>
          Retour à la connexion
        </a>

        <h2 class="text-3xl font-bold tracking-tight text-slate-900">Créer un compte</h2>
        <p class="mt-2 text-slate-500" id="step-subtitle">Étape 1 sur 3 — vos informations personnelles.</p>

        <!-- Barre d'étapes (mobile / tablette) -->
        <div class="mt-6 flex items-center gap-2" id="stepper">
          <span class="h-2 flex-1 rounded-full bg-brand-600" data-step-bar="1"></span>
          <span class="h-2 flex-1 rounded-full bg-slate-200" data-step-bar="2"></span>
          <span class="h-2 flex-1 rounded-full bg-slate-200" data-step-bar="3"></span>
        </div>

        <div id="form-success" class="mt-6 hidden rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"></div>
        <div id="form-error" class="mt-6 hidden rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"></div>

        <form id="inscription-form" class="mt-6 space-y-5" novalidate>
          <!-- Étape 1 -->
          <section data-step="1" class="space-y-5">
            <div class="grid gap-5 sm:grid-cols-2">
              <div>
                <label class="label" for="nom">Nom</label>
                <input id="nom" name="nom" type="text" autocomplete="family-name" class="input" placeholder="KOUASSI" />
                <p class="mt-1.5 hidden text-xs font-medium text-red-600" data-error-for="nom"></p>
              </div>
              <div>
                <label class="label" for="prenom">Prénom</label>
                <input id="prenom" name="prenom" type="text" autocomplete="given-name" class="input" placeholder="Aminata" />
                <p class="mt-1.5 hidden text-xs font-medium text-red-600" data-error-for="prenom"></p>
              </div>
            </div>

            <div>
              <label class="label" for="numero">Numéro de téléphone</label>
              <div class="relative">
                <span class="pointer-events-none absolute inset-y-0 left-0 flex w-11 items-center justify-center text-slate-400">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.7" stroke="currentColor" class="h-5 w-5"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"/></svg>
                </span>
                <input id="numero" name="numero" type="tel" inputmode="tel" autocomplete="tel"
                       class="input input-icon" placeholder="+225 07 00 00 00 00" />
              </div>
              <p class="mt-1.5 hidden text-xs font-medium text-red-600" data-error-for="numero"></p>
            </div>

            <div class="grid gap-5 sm:grid-cols-2">
              <div>
                <label class="label" for="ville">Ville</label>
                <input id="ville" name="ville" type="text" class="input" placeholder="Abidjan" value="Abidjan" />
                <p class="mt-1.5 hidden text-xs font-medium text-red-600" data-error-for="ville"></p>
              </div>
              <div>
                <label class="label" for="assurance">Assurance</label>
                <select id="assurance" name="assurance" class="input">
                  <option value="">Chargement…</option>
                </select>
              </div>
            </div>

            <div>
              <label class="label" for="adresse">Adresse</label>
              <input id="adresse" name="adresse" type="text" autocomplete="street-address" class="input" placeholder="Cocody, Angré 8e tranche" />
              <p class="mt-1.5 hidden text-xs font-medium text-red-600" data-error-for="adresse"></p>
            </div>

            <div class="flex items-start gap-3 rounded-xl border border-brand-100 bg-brand-50 p-4 text-sm text-slate-700">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" class="mt-0.5 h-5 w-5 shrink-0 text-brand-700" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
              <p>
                <span class="font-semibold text-slate-900">Réservé au gestionnaire de pharmacie.</span><br />
                La création de compte depuis le web est réservée aux gestionnaires de pharmacie.
                Juste après, vous créerez et gérerez le profil de votre officine.
              </p>
            </div>
          </section>

          <!-- Étape 2 -->
          <section data-step="2" class="hidden space-y-5">
            <div>
              <label class="label" for="pin">Code PIN</label>
              <div class="relative">
                <input id="pin" name="pin" type="password" inputmode="numeric" autocomplete="new-password"
                       maxlength="6" class="input pr-11" placeholder="6 chiffres" />
                <button id="toggle-pin" type="button" class="absolute inset-y-0 right-0 px-4 text-xs font-semibold text-brand-700 hover:text-brand-800">Afficher</button>
              </div>
              <p class="mt-1.5 hidden text-xs font-medium text-red-600" data-error-for="pin"></p>
            </div>

            <div>
              <label class="label" for="pin-confirmation">Confirmez le code PIN</label>
              <input id="pin-confirmation" name="pin-confirmation" type="password" inputmode="numeric"
                     autocomplete="new-password" maxlength="6" class="input" placeholder="6 chiffres" />
              <p class="mt-1.5 hidden text-xs font-medium text-red-600" data-error-for="pin-confirmation"></p>
            </div>

            <div class="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600" id="recap-etat"></div>
          </section>

          <!-- Étape 3 -->
          <section data-step="3" class="hidden space-y-5">
            <div class="rounded-xl border border-brand-100 bg-brand-50 p-4 text-sm text-slate-700">
              Dernière étape : présentez votre pharmacie. Vous pourrez ajuster ces
              informations à tout moment depuis votre tableau de bord.
            </div>

            <div>
              <label class="label" for="nom-pharmacie">Nom de la pharmacie</label>
              <input id="nom-pharmacie" name="nom-pharmacie" type="text" class="input" placeholder="Pharmacie de la Paix" />
              <p class="mt-1.5 hidden text-xs font-medium text-red-600" data-error-for="nom-pharmacie"></p>
            </div>

            <div class="grid gap-5 sm:grid-cols-2">
              <div>
                <label class="label" for="numero-pharmacie">Numéro de la pharmacie</label>
                <input id="numero-pharmacie" name="numero-pharmacie" type="tel" inputmode="tel" class="input" placeholder="07 00 00 00 00" />
                <p class="mt-1.5 hidden text-xs font-medium text-red-600" data-error-for="numero-pharmacie"></p>
              </div>
              <div>
                <label class="label" for="email-pharmacie">Email</label>
                <input id="email-pharmacie" name="email-pharmacie" type="email" class="input" placeholder="contact@pharmacie.ci" />
                <p class="mt-1.5 hidden text-xs font-medium text-red-600" data-error-for="email-pharmacie"></p>
              </div>
            </div>

            <div class="grid gap-5 sm:grid-cols-2">
              <div>
                <label class="label" for="ville-pharmacie">Ville</label>
                <input id="ville-pharmacie" name="ville-pharmacie" type="text" class="input" placeholder="Abidjan" />
              </div>
              <div>
                <label class="label" for="adresse-pharmacie">Adresse</label>
                <input id="adresse-pharmacie" name="adresse-pharmacie" type="text" class="input" placeholder="Rue des Jardins, Cocody" />
              </div>
            </div>

            <div class="grid gap-5 sm:grid-cols-3">
              <div>
                <label class="label" for="horaire-semaine">Semaine</label>
                <input id="horaire-semaine" name="horaire-semaine" type="text" class="input" placeholder="08:30 - 21:30" value="08:30 - 21:30" />
              </div>
              <div>
                <label class="label" for="horaire-samedi">Samedi</label>
                <input id="horaire-samedi" name="horaire-samedi" type="text" class="input" placeholder="08:30 - 15:30" value="08:30 - 15:30" />
              </div>
              <div>
                <label class="label" for="horaire-dimanche">Dimanche</label>
                <input id="horaire-dimanche" name="horaire-dimanche" type="text" class="input" placeholder="Fermée" value="Fermée" />
              </div>
            </div>

            <div>
              <span class="label">Assurances acceptées</span>
              <div id="assurances-liste" class="mt-2 grid max-h-44 gap-2 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-2">
                <p class="text-sm text-slate-400">Chargement…</p>
              </div>
            </div>

            <div>
              <span class="label">Photo de la pharmacie <span class="font-normal text-slate-400">(facultatif)</span></span>
              <label for="photo" class="mt-2 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-500 hover:border-brand-500 hover:text-brand-700">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.7" stroke="currentColor" class="h-5 w-5"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 19.5h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5z"/></svg>
                <span id="photo-label">JPEG, PNG ou WEBP — 5 Mo maximum</span>
                <input id="photo" name="photo" type="file" accept="image/*" class="hidden" />
              </label>
              <p id="photo-error" class="mt-1.5 hidden text-xs font-medium text-red-600"></p>
              <div id="photo-preview" class="mt-3 hidden items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
                <img id="photo-preview-img" data-photo-preview alt="Aperçu de la photo de la pharmacie" class="h-20 w-20 rounded-lg object-cover" />
                <div class="text-xs text-slate-500">
                  <p id="photo-preview-nom" class="font-semibold text-slate-700"></p>
                  <p id="photo-preview-taille"></p>
                  <button type="button" id="photo-retirer" class="mt-1 font-semibold text-brand-700 hover:text-brand-800">Retirer la photo</button>
                </div>
              </div>
            </div>
          </section>

          <!-- Actions -->
          <div class="flex flex-col gap-3 sm:flex-row">
            <button id="btn-retour" type="button" class="btn-ghost btn-block sm:w-auto" hidden>Retour</button>
            <button id="btn-suivant" type="submit" class="btn-primary btn-lg btn-block">
              <span data-label>Continuer</span>
              <span data-spinner hidden class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"></span>
            </button>
          </div>
        </form>

        <p class="mt-6 text-center text-sm text-slate-500">
          Déjà inscrit ?
          <a href="connexion" class="font-semibold text-brand-700 hover:text-brand-800">Se connecter</a>
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
  <script src="assets/js/inscription.js"></script>
  <script src="assets/js/pwa.js"></script>
</body>
</html>
