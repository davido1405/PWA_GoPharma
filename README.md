# GoPharma — Espace pharmacie (site web PHP)

Refonte web de toute la partie **gestion de la pharmacie** de l'application
AssurAppCI : page d'accueil, inscription, connexion et tableau de bord
(profil, annonces, newsletter, abonnement, statistiques).

> **État des modules payants (v4.3).** Le tableau de bord n'affiche **aucune donnée
> fictive**. Le forfait **Gratuit** n'ouvre pas encore Annonces, Newsletter et
> Statistiques : ces modules restent visibles dans le menu mais affichent un écran
> « bientôt disponible » (aucune donnée, aucun bouton d'action). La page Abonnement
> liste les forfaits **réels** de l'API ; la souscription en ligne est désactivée
> (« Bientôt disponible ») tant que le paiement n'est pas ouvert.

Le site est écrit en **PHP** (pages + API locale) et parle directement à la base
MySQL — avec un simple interrupteur pour basculer vers l'API distante en
production. Le code Flutter de l'application (partie utilisateur/client) n'a
**pas** été modifié.

## Pages

| Fichier          | Rôle |
| ---------------- | ---- |
| `index.php`      | Landing page : présentation, fonctionnalités, étapes, forfaits |
| `inscription.php`| Inscription en 3 étapes (infos perso → code PIN → infos pharmacie) |
| `connexion.php`  | Connexion du gérant (numéro + code PIN) |
| `dashboard.php`  | Tableau de bord (navigation par ancre `#/vue`) : accueil, profil pharmacie (+ création de pharmacie), annonces, newsletter, statistiques, abonnement |

## Pile technique

- **PHP 8** : pages, API locale (`api/`), configuration (`config/app.php`)
- **MySQL** : base locale `assurappci` (ou API distante en production)
- HTML5 + [Tailwind CSS](https://tailwindcss.com) 3.4 (compilé, **sans CDN**)
- JavaScript vanilla (aucun framework)
- Logo repris de `assets/images/` de l'application Flutter

## Démarrage rapide (test immédiat)

```bash
npm install        # une seule fois (outillage Tailwind + jsdom)
npm run build      # génère assets/css/app.css
php scripts/maj-base.php   # migre la base locale (idempotent, dump assurappci.sql)
npm start          # http://localhost:8080
```

- Pages : <http://localhost:8080/> (la racine `router.php` sert `index.php`)
- API locale : <http://localhost:8080/api/assurance>

`npm run watch` surveille les fichiers CSS pendant le développement.

### Comptes de test (base locale)

| Profil | Identifiant | Numéro | Code PIN |
| ------ | ----------- | ------ | -------- |
| Gérant | `GERANT001` | `+2250701010101` (ou `0701010101`) | `gerant123` → PHARM001 / PHARM002 |
| Gérant | `GERANT002` | `+2250751010102` (ou `0751010102`) | `gerant123` → PHARM003 |

Les codes PIN sont stockés en clair dans la base locale (comportement identique à
l'application mobile) ; `route_connexion` accepte `hash_equals` **ou**
`password_verify` pour rester compatible avec un hash.

## Configuration : local ⇄ production

**Un seul fichier : `config/app.php`.**

```php
const APP_ENV   = 'local';   // 'local' | 'prod'
const APP_DEBUG = false;     // drapeau de débogage exposé au JS
```

| `APP_ENV` | `api_base()` | État |
| --------- | ------------ | ---- |
| `'local'` | `http://localhost:4000/api` (API Node du poste) **si** l'hôte est local | ✅ opérationnel |
| `'prod'`  | `https://apiassureappci-production.up.railway.app/api` (appel direct du navigateur) | ✅ opérationnel |

**Filet de sécurité** : si `APP_ENV` reste `'local'` sur un hôte public (déploiement
non configuré), `est_local()` renvoie faux et le site appelle **l'API Railway** —
un visiteur n'appelle jamais son propre `localhost`.

Hôtes considérés comme locaux : `localhost`, `127.*`, `::1`, `*.local`, `*.test`,
réseaux privés `10.*`, `192.168.*`, `172.16-31.*` (test depuis un téléphone sur le
même Wi-Fi). En ligne de commande (scripts, migrations, tests) : local.

> ⚠️ Le front appelle Railway **directement** : côté API, `CORS_ALLOWED_ORIGINS`
> doit contenir le domaine du site, sinon le navigateur bloque les réponses.
> Voir `RAPPORT_ETAT_PROJET.md`.

## Mise en production

Voir `RAPPORT_ETAT_PROJET.md` (verdict, bloquants, checklist ordonnée). Il reste,
côté hébergement :

1. merger la branche API `impl/securite-jwt-bcrypt` dans `main` et définir
   `NODE_ENV=production`, `CORS_ALLOWED_ORIGINS=https://<domaine>`, `JWT_KEY`,
   `JWT_REFRESH_KEY` (recommandé, sinon repli sur `JWT_KEY`) et
   les identifiants MySQL côté Railway ;
2. importer le schéma et les données réelles dans la base de production ;
3. déployer le dossier en HTTPS, vérifier le parcours complet depuis le domaine ;
4. incrémenter `CACHE_NAME` dans `sw.js` après tout changement de front.

Le fichier `.htaccess` fourni à la racine (Apache / WAMP / XAMPP) gère la
réécriture de `/` vers `index.php`, l'accès sans extension et le service des
fichiers statiques. Sous Nginx, les mêmes règles se traduisent en `location`
blocks. Il n'y a **pas** de relais PHP `/api` : le front appelle l'API Node.

> Le serveur de développement PHP (`php -S`) est **mono-requête** :
> `router.php` envoie systématiquement `Connection: close` et sert lui-même les
> fichiers statiques (table MIME + content-length). En production Apache ne
> passe pas par `router.php`.

> **Conflit de port** : si `8080` est déjà pris (WildFly, Tomcat, autre projet),
> lancer `php -S 127.0.0.1:8081 router.php` et pointer les tests avec
> `BASE_URL` : `$env:BASE_URL='http://127.0.0.1:8081'; node tests/functional/run-functional-tests.js`.

### Mettre à jour une version déjà installée

Les pages et les assets sont servis **cache d'abord** par le service worker
(`sw.js`). Après **toute** modification d'une page, d'un script ou d'une feuille
de style :

1. **incrémenter `CACHE_NAME`** dans `sw.js` (`gopharma-v7` → `gopharma-v8`…) ;
2. recharger l'application : le navigateur détecte le nouveau service worker et
   propose « Nouvelle version disponible. Recharger ? ».

Sans cette incrémentation, un navigateur déjà équipé continue d'afficher
l'**ancienne** version, même si le serveur sert bien la nouvelle (incident **E14**
du rapport de recette : le tableau de bord affichait encore le mode démo).
`sw.js` est servi en `no-cache` (`router.php` en développement, `.htaccess` en
Apache) pour que la mise à jour soit détectée tout de suite.

## Architecture

```
navigateur ── /api/... ──▶ router.php (dev) ou .htaccess (prod)
                              │
                              ▼
                        api/index.php  ── APP_ENV='prod' ──▶ API distante (proxy)
                              │ APP_ENV='local'
                              ▼
                        api/handlers/* ──▶ MySQL locale
```

- `api/bootstrap.php` : connexion PDO, lecture de la requête (JSON, query,
  `POST` form-data, **`PUT` multipart parsé à la main**), réponses JSON,
  résolution des codes pharmacie/gérant (`code_demande()`,
  `code_pharmacie_demande()`, `variantes_numero()`).
- `api/handlers/` : `auth`, `pharmacie`, `abonnements`, `annonces`,
  `newsletter`, `divers`.
- Une route accepte indifféremment le code d'une pharmacie **ou** celui de son
  gérant (`GERANT…`/`USER…`) : la résolution se fait via `utilisateur_gerant`.

## Routes utilisées (module pharmacies)

| Élément                | Méthode | Route                                  |
| ---------------------- | ------- | -------------------------------------- |
| Inscription            | POST    | `/utilisateur/inscription`             |
| Connexion              | POST    | `/utilisateur/connexion`               |
| Profil utilisateur     | POST    | `/utilisateur/profilutilisateur`       |
| Profil pharmacie       | POST    | `/pharmacie/profilPharmacie`           |
| Création pharmacie     | POST    | `/pharmacie/ajouterPharmacie`          |
| Mise à jour du profil  | PUT     | `/pharmacie/modifierpharmacie`         |
| Photo de la pharmacie  | POST    | `/pharmacie/upload-photo`              |
| Statut de garde        | PUT     | `/pharmacie/modifierstatutgarde`       |
| Liste des assurances   | GET     | `/assurance`                           |
| Forfaits               | GET     | `/abonnements/forfaits`                |
| Abonnement actif       | GET     | `/abonnements/actif`                   |
| Historique             | GET     | `/abonnements/historique/{code}`       |
| Souscription           | POST    | `/abonnements/souscrire`               |
| Contrôle d'accès       | POST    | `/abonnements/verifier-acces`          |
| Consommation du forfait| GET     | `/abonnements/utilisation/{code}`      |
| Annonces               | GET     | `/annonces/pharmacie`                  |
| Publication d'annonce  | POST    | `/annonces/envoyer`                    |
| Suppression d'annonce  | DELETE  | `/annonces`                            |
| Abonnés newsletter     | POST    | `/newsLetters/abonnement`              |
| Envoi de newsletter    | POST    | `/newsletters/envoyer`                 |

La newsletter est envoyée via `/newsletters/envoyer` (table `envoi_newsletter` +
notifications aux abonnés). Si la route distante n'existe pas (404/405), le
front-end bascule automatiquement sur `/annonces/envoyer` avec
`type_annonce = "Newsletter"` (type existant dans la table `type_annonce`).

## Statistiques (annonces & newsletter)

La vue **Statistiques** se trouve dans le menu latéral et se divise en trois
blocs, selon les fonctionnalités du forfait :

| Bloc                  | Contenu                                                                 | Fonctionnalité requise |
| --------------------- | ----------------------------------------------------------------------- | ---------------------- |
| Indicateurs (KPI)     | annonces publiées, vues cumulées, vues moyennes, nouveaux abonnés       | `STATS_BASE`           |
| Classement + newsletter | top 6 annonces par vues, abonnés / actifs / taux / dernier abonnement | `STATS_BASE`           |
| Graphiques            | vues par annonce, répartition par type, évolution sur 6 mois, statut des abonnés, rythme de publication | `STATS_AVANCEES` |
| Consommation du forfait | jauges d'utilisation (`/abonnements/utilisation/{code}`)              | `STATS_BASE`           |

- Sélecteur de période : **7 jours / 30 jours / Tout** (recalcul à la volée).
- Sans `STATS_BASE` (cas du forfait **Gratuit**) → l'écran du module est remplacé
  par une carte « Statistiques : bientôt disponible » (aucune donnée affichée,
  aucun bouton d'action) avec un lien vers les forfaits. Idem pour **Annonces**
  et **Newsletter** : les modules restent visibles dans le menu, mais ne sont pas
  encore ouverts par le forfait gratuit.
- Avec `STATS_BASE` mais sans `STATS_AVANCEES` → les graphiques sont remplacés
  par une carte « Découvrir Premium ».
- Les graphiques sont dessinés en SVG/HTML maison (`assets/js/charts.js`),
  aucune bibliothèque externe.

Forfaits : **Gratuit** 0 FCFA/365 j, **Standard** 15 000 FCFA/30 j,
**Premium** 30 000 FCFA/30 j.

## Base de données

`php scripts/maj-base.php` (ou `npm run db:maj`) applique, de façon
**idempotente**, les ajouts nécessaires au dump `D:\Téléchargements\assurappci.sql` :

- table **`envoi_newsletter`** (suivi des envois) + clé étrangère vers `pharmacie` ;
- vue **`vue_statistiques_pharmacie`** : indicateurs agrégés par pharmacie ;
- index de performance :
  `annonce(date_publication)`, `historique_vue(date_vue)` et
  `(id_annonce, date_vue)`, `newsletter(date_abonnement)`,
  `vues_pharmacie(code_pharmacie, date_vue)`, `envoi_newsletter(code_pharmacie, date_envoi)`.

Les données affichées sont calculées côté navigateur à partir des routes
existantes ; ces ajouts permettent à l'API de servir des séries historiques
(vues par jour, envois, taux d'ouverture) sans refonte.

Contraintes gérées côté PHP : `utilisateurs.id_adresse` ↔
`adresse_utilisateur.code_utilisateur` et `pharmacie.id_adresse` ↔
`adresse_pharmacie.code_pharmacie` sont des clés circulaires → création du
parent (id_adresse NULL), insertion de l'enfant, puis `UPDATE`.

## Structure

```
D:\AssurAppCI-Web
├── index.php               # landing page
├── inscription.php         # inscription 3 étapes
├── connexion.php           # connexion gérant
├── dashboard.php           # tableau de bord
├── router.php              # front controller de dev (php -S)
├── .htaccess               # réécriture pour Apache / WAMP
├── config/
│   └── app.php             # ★ APP_ENV : 'local' | 'prod'
├── api/
│   ├── index.php           # table de routes + relais de production
│   ├── bootstrap.php       # PDO, requêtes, réponses JSON, helpers
│   └── handlers/           # auth, pharmacie, abonnements, annonces,
│                           # newsletter, divers
├── tailwind.config.js
├── package.json
├── assets/
│   ├── css/src.css         # source Tailwind
│   ├── css/app.css         # compilé (minifié)
│   ├── img/logo.png        # logo GoPharma
│   ├── img/logo-icone.png  # icône / favicon
│   └── js/
│       ├── config.js       # lit window.GOPHARMA_CONFIG
│       ├── api.js          # client HTTP + session + endpoints
│       ├── ui.js           # icônes, notifications, boîtes de dialogue
│       ├── charts.js       # graphiques SVG/HTML (statistiques)
│       ├── landing.js
│       ├── inscription.js
│       ├── connexion.js
│       └── dashboard.js
└── scripts/
    ├── maj-base.php        # migration idempotente de la base locale
    ├── api-smoke.php       # tests d'intégration de l'API (avec nettoyage)
    ├── nettoyer-tests.php  # supprime un compte de test résiduel
    ├── check-ids.js        # contrôle statique des IDs DOM
    ├── check-links.js      # contrôle des liens locaux (détecte les .html périmés)
    ├── charger-page.js     # charge une page PHP en HTTP dans jsdom
    └── smoke-*.js          # scénarios automatisés (jsdom)
```

## Contrôles

```bash
npm run check    # IDs DOM + liens locaux
npm test         # check + 5 scénarios jsdom (accueil, connexion, inscription, création de pharmacie, tableau de bord)
npm run test:api # tests d'intégration de l'API PHP (le serveur doit tourner)
node --check assets/js/*.js   # syntaxe JavaScript
php -l config/app.php         # syntaxe PHP (et idem pour chaque fichier)
```

`npm test` et `npm run test:api` suppriment les données qu'ils créent
(comptes, pharmacies, annonces, newsletters).

## Session

La session est stockée dans `sessionStorage` sous la clé
`gopharma.pharmacie.session` (l'ancienne clé `localStorage` est encore lue
puis migrée/supprimée). Seuls les comptes de type **Gestionnaire de pharmacie**
peuvent accéder au tableau de bord. L'inscription depuis le web étant réservée à
ce profil (mention affichée à l'étape 1), les autres profils sont créés depuis
l'application mobile : à la connexion, ils reçoivent un message et restent sur
la page de connexion.

Après inscription, le compte est connecté automatiquement et redirigé vers
`dashboard.php#/profil` — si aucune pharmacie n'est encore rattachée au gérant,
le profil s'affiche en **mode création** (bannière, bouton « Créer ma
pharmacie »).

## Données d'exemple de l'application mobile

| Type de pharmacie | `libelle_statut` (statut) |
| ----------------- | -------------------------- |
| 24 h             | « Ouverte 24 h »           |
| De garde         | « De garde »               |
| Normale          | « Ouverte »                |
| Fermée           | « Fermée »                 |
| Automatique      | « Sans horaires »          |

`est_de_garde` reste un booléen séparé (interrupteur « De garde » du profil).
