/* ⚠️ À INCRÉMENTER à chaque modification d'un fichier listé ci-dessous (JS, CSS,
   pages PHP). Le service worker sert ces fichiers en « cache d'abord » : sans
   changement de ce nom, un navigateur déjà équipé continue d'afficher
   l'ancienne version, même après un redéploiement.
   v4 : suppression du mode démonstration du tableau de bord.
   v5 : bascule local/production de api_base() (config/app.php). */
const CACHE_NAME = 'gopharma-v5';
const DATA_CACHE = 'gopharma-data-v1';
const ASSETS = [
  '/',
  '/index.php',
  '/pharmacies.php',
  '/carte.php',
  '/dashboard.php',
  '/connexion.php',
  '/inscription.php',
  '/manifest.webmanifest',
  '/assets/css/app.css',
  '/assets/js/config.js',
  '/assets/js/ui.js',
  '/assets/js/api.js',
  '/assets/js/pwa.js',
  '/assets/js/share.js',
  '/assets/js/landing.js',
  '/assets/js/pharmacies.js',
  '/assets/js/carte.js',
  '/assets/js/connexion.js',
  '/assets/js/inscription.js',
  '/assets/js/dashboard.js',
  '/assets/js/charts.js',
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(ASSETS).catch(function () {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME && k !== DATA_CACHE; })
            .map(function (k) { return caches.delete(k); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  const requete = event.request;
  if (requete.method !== 'GET') return;

  let url;
  try { url = new URL(requete.url); } catch (err) { return; }

  /* Données de l'API : réseau d'abord, cache de secours (dernières données
     consultées disponibles hors ligne). */
  if (url.pathname.indexOf('/api/') === 0) {
    event.respondWith(
      fetch(requete).then(function (reponse) {
        if (reponse && reponse.ok) {
          const copie = reponse.clone();
          caches.open(DATA_CACHE).then(function (cache) {
            cache.put(requete, copie).catch(function () {});
          }).catch(function () {});
        }
        return reponse;
      }).catch(function () {
        return caches.match(requete).then(function (cachee) {
          if (cachee) return cachee;
          return new Response(
            JSON.stringify({ success: false, hors_ligne: true, message: 'Hors ligne', data: [] }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        });
      })
    );
    return;
  }

  /* Pages et ressources locales : cache d'abord, réseau en secours. */
  event.respondWith(
    caches.match(requete).then(function (cachee) {
      return cachee || fetch(requete).then(function (reponse) {
        if (reponse && reponse.ok && url.origin === self.location.origin) {
          const copie = reponse.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(requete, copie).catch(function () {});
          }).catch(function () {});
        }
        return reponse;
      }).catch(function () {
        return caches.match('/index.php').then(function (secours) {
          if (secours && requete.mode === 'navigate') return secours;
          return Response.error();
        });
      });
    })
  );
});
