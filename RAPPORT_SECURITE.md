# GoPharma — Rapport de sécurité et de tests

> Conformément à `CHECKLIST_SECURITE_TESTS.md` (sections 1 à 10).
> Cibles : **local uniquement**, données fictives. Jamais la production, jamais de vrais numéros de téléphone.
> Chaque constat est marqué **OK / FAIL / BLOQUÉ** avec preuve (requête + réponse).
> Tests rejouables en une commande : `node tests/security/run-security-tests.js` → `tests/security/results.json`.

## État figé de ce rapport (à lire en premier)

**Ce rapport décrit UN SEUL état : celui après les 6 points du suivi de sécurité. Il remplace toute version antérieure.**

- **Date d'exécution** : 2026-10-18.
- **Branche backend** : `impl/securite-jwt-bcrypt` (`D:\Bureau\AssurAppCI\APIassureAppCI`).
- **État web** : `D:\AssurAppCI-Web` (dossier `api/` PHP supprimé, le front appelle l'API Node).
- **Résultat du harnais** : **90 tests | 90 OK | 0 FAIL | 0 BLOQUÉ** (voir §8, cohérent avec `tests/security/results.json`).

### Points du suivi de sécurité (1 → 6) : état

| # | Objet | État |
|---|---|---|
| 1 | Scan de secrets, historique git complet (les 2 dépôts) | **OK** — aucun secret trouvé |
| 2 | Route publique `GET /api/annonces/toutes` qui plantait | **OK** — corrigée (200, plus de pile) |
| 3 | Erreurs Multer + handler global sans pile d'appels | **OK** — 400 JSON, jamais de pile |
| 4 | Upload de bout en bout (mock Cloudinary) + `code_gerant` unique | **OK** — 201 atteint |
| 5 | Front : échappement `nom_assurance` + jeton → `sessionStorage` | **OK** |
| 6 | `/docs` (Swagger) inaccessible en production | **OK** — 404 |

### Correctifs déjà appliqués antérieurement et toujours en place

1. **Contrôle d'accès JWT actif par défaut** — `middleware/auth.js` : `verifierJWT` est **strict par défaut** (`process.env.AUTH_STRICT_MODE !== "false"`), monté sur `/api`. Les contrôleurs vérifient en plus que l'identité du jeton correspond à la ressource visée (`estAdmin`, `verifierIdentite`).
2. **Code PIN haché (bcrypt)** — `models/utilisateur.js` : hachage à l'inscription + migration à la volée d'un PIN clair à la première connexion.
3. **Rate-limit dédié à la connexion** — 10 tentatives / 15 min / IP, distinct du limiteur global (100 req / 15 min / IP).
4. **Exemption des routes publiques insensible à la chaîne de requête** — `estRoutePublique` compare le **chemin seul** (`url.split("?")[0]`).
5. **Front pharmacies réparé** + web pointant sur l'API Node (`config/app.php` → `http://localhost:4000/api`).

## 0. Méthode et périmètre

- Web app PHP : `D:\AssurAppCI-Web`.
- Backend Node : `D:\Bureau\AssurAppCI\APIassureAppCI`, branche `impl/securite-jwt-bcrypt`.
- Serveurs locaux : MySQL `localhost:3306`, API Node `localhost:4000`, front PHP `localhost:8080`.
- Hôte de base (garde-fou local) : `localhost:3306 / assurappci`.
- Garde-fous : arrêt si hôte/URL non local, aucune cible distante (sauf le scan git du point 1), force brute limitée à 30 essais, écritures uniquement en base locale, **aucun secret écrit ni affiché**.
- Données de test : gérants `USER_SEC_A` / `USER_SEC_B` (pharmacies `PHARM_SEC_A` / `PHARM_SEC_B`) + un **gérant d'upload dédié, régénéré à chaque exécution** (`USER_UP_<id>`), ce qui évite l'erreur « déjà gérant d'une pharmacie active » et le doublon de nom.
- Le harnais écrit `tests/security/results.json` : **90 tests | 90 OK | 0 FAIL | 0 BLOQUÉ**.

### 0.1 Pré-requis d'exécution

- API Node avec le **mock Cloudinary local** pour le chemin nominal d'upload :
  `$env:MOCK_CLOUDINARY='true' ; node index.js` (PowerShell). Sans cette variable, le test d'image valide est marqué BLOQUÉ (aucun appel Cloudinary distant n'est jamais effectué).
- MySQL local + front PHP (`localhost:8080`) + Playwright Chromium (tests XSS).

### 0.2 Scan de secrets de l'historique git complet (point 1)

Outil : **gitleaks 8.30.1** (release officielle, installé localement et utilisé uniquement ici).

| Dépôt | Commande | Résultat | Code de sortie |
|---|---|---|---|
| `APIassureAppCI` (git) | `gitleaks detect --source . --log-opts="--all" --redact` | **45 commits scannés, aucun secret trouvé** | 0 |
| `AssurAppCI-Web` (non git) | `gitleaks detect --source . --no-git --redact` | **aucun secret trouvé** | 0 |

- `.env` est **ignoré par git et n'a jamais été suivi** (seul `.env.example` est versionné, avec un placeholder `JWT_KEY=change-me`, pas un secret réel).
- `config/firebase.config.js` lit les identifiants depuis l'environnement (ou un `serviceAccountKey.json` **local**, ignoré par git et jamais suivi) : aucun secret codé en dur.
- Le scan de motifs masqués n'a fait ressortir que des fichiers **locaux non suivis** (`.env`, `serviceAccountKey.json`) ; **rien dans le code commité**.
- **Conclusion : aucun secret à faire tourner** au titre du point 1.

## 1. Contrôle d'accès aux routes (backend)

Tests exécutés contre l'API Node locale (`http://127.0.0.1:4000`). Deux comptes connectés (jetons récupérés). Pour chaque route : sans jeton, jeton invalide, puis jeton de B sur une ressource de A.

| Route | Sans jeton | Jeton invalide | Jeton B sur ressource A | Statut |
|---|---|---|---|---|
| `PUT /api/pharmacie/modifierpharmacie` | 401 | 403 | 403 | **OK** |
| `PUT /api/pharmacie/modifierstatutgarde` | 401 | — | 403 | **OK** |
| `POST /api/pharmacie/ajouterassurance` | 401 | — | 403 | **OK** |
| `POST /api/pharmacie/profilpharmacie` | 401 | — | 403 | **OK** |
| `POST /api/utilisateur/profilutilisateur` | 401 | — | 403 | **OK** |
| `PUT /api/utilisateur/envoyerFCMT` | 401 | — | 403 | **OK** |
| `PUT /api/utilisateur/enovyerLocalisation` | 401 | — | — | **OK** |
| `POST /api/annonces/envoyer` | 401 | — | 403 | **OK** |
| `DELETE /api/annonces/:id_annonce` | 401 | — | 403 | **OK** |
| `POST /api/newsLetters/sabonner` | 401 | — | 403 | **OK** |
| `POST /api/newsLetters/abonnement` | 401 | — | — | **OK** |
| `DELETE /api/newsLetters/supprimerabonnement` | 401 | — | — | **OK** |
| `POST /api/abonnements/souscrire` | 401 | — | — | **OK** |
| `GET /api/abonnements/actif` | 401 | — | — | **OK** |
| `GET /api/abonnements/historique/:code` | 401 | — | — | **OK** |
| `GET /api/pharmacie/statistiques/avancees/:code` | 401 | — | — | **OK** |
| `POST /api/assurance/ajouterassurance` | 401 | — | — | **OK** |
| `PUT /api/assurance/modifierassurance` | 401 | — | — | **OK** |
| `PUT /api/assurance/activerassurance` | 401 | — | — | **OK** |
| `PUT /api/assurance/desactiverassurance` | 401 | — | — | **OK** |
| `GET /api/annonces/pharmacie` | 401 | — | — | **OK** |
| `GET /api/notifications` | 401 | — | — | **OK** |
| `PUT /api/notifications/lireNotifications` | 401 | — | — | **OK** |
| `DELETE /api/notifications/supprimerNotification` | 401 | — | — | **OK** |
| `POST /api/utilisateur/inscription` (`type_utilisateur=Administrateur`) | rejeté (200, type non défini) | — | — | **OK** |
| Mass assignment inscription (`est_de_garde`, `id`, `role`, `password_hash`) | champs ignorés | — | — | **OK** |

Réponses typiques :
- Sans jeton → `HTTP 401 {"success":false,"message":"Token d'authentification requis"}`
- Jeton invalide/expiré → `HTTP 403 {"success":false,"message":"Token invalide ou expiré"}`
- Jeton B sur ressource A → `HTTP 403 {"success":false,"message":"Accès non autorisé à cette ressource"}`

**Statut global §1 : OK** — 36 assertions, toutes conformes ; aucune écriture non autorisée observée.

### 1.1 Routes publiques (exemptées de `verifierJWT`) — sans jeton, paramètres vides/absents

Liste exhaustive (`ROUTES_PUBLIQUES` dans `index.js`) et **appels réels sans jeton** (8/8 OK) :

| Requête (sans jeton) | HTTP | Corps (tronqué) |
|---|---|---|
| `POST /api/utilisateur/inscription` (corps vide) | 200 | `{"success":false,"message":"Type utilisateur non défini"}` |
| `POST /api/utilisateur/connexion` (corps vide) | 200 | `{"success":false,"message":"Veuillez vérifier tous les champs. Merci"}` |
| `POST /api/utilisateur/recoverPassword` (corps vide) | 501 | `{"success":false,"message":"Récupération du code PIN non disponible pour le moment"}` |
| `GET /api/pharmacie/rechercher` | 200 | `{"success":true,"message":"Liste des pharmacies triée selon votre position","data":[…]}` |
| `GET /api/pharmacie` | 200 | `{"success":true,"message":"Liste des pharmacies","data":[…]}` |
| `GET /api/assurance` | 200 | `{"success":true,"message":"Liste des assurances du système","data":[…]}` |
| `GET /api/abonnements/forfaits` | 200 | `{"success":true,"data":[…]}` |
| `GET /api/annonces/toutes` | 200 | `{"success":true,"total_annonces":29,"data":[…]}` |

Aucune de ces 8 routes ne renvoie de plantage brut : les réponses sont du JSON propre (aucune page d'erreur Express, aucune pile).

**Correctif du point 2 — `GET /api/annonces/toutes`** : la route répondait auparavant **HTTP 500 + pile** (`TypeError: Cannot read properties of undefined (reading 'error')`). Deux causes cumulées :
1. `controllers/controller.annonces.js` importait le logger via `{ default: logger }` alors que `logger.js` fait `module.exports = logger` → `logger` était `undefined`, et le `catch` plantait à son tour ;
2. la méthode de modèle `getToutesLesAnnonces()` appelée par le contrôleur **n'existait pas**.

Corrections : import logger aligné, ajout de `getToutesLesAnnonces(limit)` (jointures `annonce`/`type_annonce`/`pharmacie`, tri par date, `LIMIT` borné). Liste vide ou erreur de modèle → réponse JSON propre. **Vérifié : HTTP 200.**

## 2. Authentification et sessions (backend)

| Constat | Preuve | Statut |
|---|---|---|
| Code PIN haché (bcrypt) en base | `password_hash = "$2b$10$…"`, bcrypt=oui (lecture MySQL) | **OK** |
| Migration à la volée d'un PIN clair vers bcrypt | logs : `PIN migré vers bcrypt pour l'utilisateur USER_SEC_…` | **OK** |
| Rate-limit dédié sur `/connexion` | `index.js` : 10 essais puis 429 ; harnais : 20 blocages sur 30 essais | **OK** |
| Pas de fuite du PIN ni du jeton dans les logs de test | réponse de connexion tronquée/masquée | **OK** |
| `recoverPassword` répond sans confirmer l'existence du numéro | `routes.utilisateur.js` (501 propre, sans pile) | **OK** |
| JWT secret hors dépôt (`.env` non commité) | `.gitignore` + scan git du §0.2 | **OK** |

## 3. Injection et validation des entrées

| Constat | Preuve | Statut |
|---|---|---|
| `terme_saisi` — 10 charges injectées (API Node) | HTTP 200 sans trace SQL, pas de sur-affichage | **OK** |
| `limits` — 6 valeurs injectées (API Node) | HTTP 200 sans trace | **OK** |
| `connexion` — 10 charges injectées | HTTP 200/429 sans trace, aucun jeton renvoyé | **OK** |
| Payload `SLEEP(3)` (time-based blind) | réponse en ~70 ms (pas d'injection temporelle) | **OK** |
| Post-DROP/UPDATE : tables `utilisateurs`, `pharmacie`, `assurances`, `annonce` intactes | toutes présentes | **OK** |
| Post-DROP/UPDATE : comptes de lignes inchangés | comptes stables | **OK** |

Requêtes SQL paramétrées (`?`) côté Node. Aucune trace SQL exposée par l'API.

*Note : l'ancienne API PHP `api/` a été retirée du dépôt web ; les tests qui la visaient (faux positifs Xdebug) ont été supprimés du harnais.*

## 4. Envoi de fichiers (photo de pharmacie) — point 3 et point 4

Tests contre `POST /api/pharmacie/ajouterPharmacie` (API Node). **5/5 OK.**

| Test | Résultat | Statut |
|---|---|---|
| Upload sans jeton | HTTP 401 refusé | **OK** |
| Fichier non-image (`.txt`, `text/plain`) | **HTTP 400** `{"success":false,"message":"Seulement les images sont autorisées (jpeg, jpg, png, gif, webp)"}` | **OK** |
| Faux `.jpg` (contenu texte, `Content-Type: image/jpeg`) | **HTTP 400** `{"success":false,"message":"Le fichier envoyé n'est pas une image valide (contenu non reconnu)"}` | **OK** |
| Fichier vide (0 octet) | **HTTP 400** (même message) | **OK** |
| Témoin image valide (PNG 1x1 réel) | **HTTP 201** `{"success":true,"message":"Votre pharmacie a été enregistrée avec succès !","data":{"code_pharmacie":"PHARM-…","photo_url":"https://mock.cloudinary.local/…"}}` | **OK** |

### Correctifs appliqués

- **Point 3 — erreurs Multer gérées proprement** : nouveau `middleware/erreurs.js` :
  - `gestErrUpload` intercepte `multer.MulterError` **et** les erreurs du `fileFilter` (marquées `isUploadError`) et répond **400 JSON** ; monté après les routes `/ajouterPharmacie` et `/modifierpharmacie` (`routes/routes.pharmacie.js`) ;
  - `gestionnaireErreurs` (handler **global**, monté en dernier dans `index.js`) journalise la pile **côté serveur** via `logger.error` et **ne renvoie jamais** de pile ni de détail interne dans le corps HTTP, **quel que soit `NODE_ENV`**.
  - Avant : `.txt` → **HTTP 500 + page Express avec pile** (`at fileFilter (…middleware/upload.js:32:7)`). Après : **HTTP 400 JSON**.
- **Point 4 — chemin nominal d'upload testable sans effet de bord externe** :
  - `services/UploadImages.js` : mock **activé par `MOCK_CLOUDINARY=true`, uniquement si `NODE_ENV !== "production"`** ; renvoie une URL factice sans aucun appel réseau. **La variable n'existe dans aucun `.env` de production** (vérifié : seule `.env`/`.env.example` existent, aucune ne contient `MOCK_CLOUDINARY`). `/health` expose `cloudinaryMock` (booléen) pour que le harnais sache si le mock est actif.
  - `middleware/upload.js` : `verifierContenuImage` contrôle la **signature binaire réelle** (magic bytes PNG/JPEG/GIF/BMP/WebP) après réception du buffer → un faux `.jpg` ou un fichier vide est rejeté en **400**. (Le `fileFilter` seul ne validait que l'extension / le MIME déclarés, falsifiables.)
  - `models/pharmacie.js` : correction d'un bug latent — l'`INSERT` de `ajouterPharmacie` avait **6 colonnes mais 7 marqueurs `?`** (erreur SQL rendant tout ajout impossible).
  - `tests/security/run-security-tests.js` : `code_gerant` / `nom_pharmacie` **uniques par exécution** (suffixe horodaté), gérant d'upload dédié, nettoyage des données d'upload des runs précédents.

## 5. Configuration, erreurs et exposition (backend) — points 3 et 6

| Constat | Preuve | Statut |
|---|---|---|
| `helmet()` appliqué | `index.js` | OK |
| CORS : toutes origines en dev, liste blanche en production | `index.js` | OK |
| Erreur d'upload → 400 JSON (plus de 500 + pile) | voir §4 | OK |
| Handler global : aucune pile dans la réponse, quel que soit `NODE_ENV` | `middleware/erreurs.js` | OK |
| Inscription invalide sans fuite de pile | HTTP 200, JSON propre (pile uniquement côté logs) | OK |
| `/docs` et `/api-docs` inaccessibles en production | voir ci-dessous | OK |

**Correctif du point 6 — Swagger (`/docs`)** : `exposeApiDocs` était forcé à `true`. Désormais `exposeSwaggerUI` et `exposeApiDocs` suivent `process.env.NODE_ENV !== "production"`. Hors production, `/docs` reste disponible en local.

Vérification en local avec `NODE_ENV=production` :

| Requête | HTTP |
|---|---|
| `GET /docs` | **404** |
| `GET /docs/` | **404** |
| `GET /api-docs` | **404** |
| `GET /health` (témoin de bon fonctionnement) | 200 |
| `GET /api/pharmacie` (témoin) | 200 |

## 6. Stockage du PIN (base MySQL locale)

| Constat | Preuve | Statut |
|---|---|---|
| PIN haché bcrypt | `utilisateurs.password_hash = "$2b$10$…"` (bcrypt=oui) | **OK** |

## 7. PWA — sécurité du front (web app) — point 5

| Constat | Preuve | Statut |
|---|---|---|
| XSS Playwright — 5 écrans (liste, carte, dashboard, inscription, connexion) | 5/5 : aucun dialogue, aucune balise non échappée | **OK** |
| `inscription.js` : `nom_assurance` échappé avant insertion en `innerHTML` | `escapeHtml()` (select, liste à cases, récapitulatif) | **OK** |
| Données API échappées dans `pharmacies.js` / `carte.js` | `escapeHtml()` | OK |
| Jeton de session stocké dans `sessionStorage` | `assets/js/api.js` | **OK** |
| Déconnexion : clé effacée dans **les deux** stockages (transition) | `api.js` : `sessionStorage.removeItem` + `localStorage.removeItem` | **OK** |
| Aucune autre lecture du jeton dans `localStorage` | seule `api.js` lit la clé (migration transitoire) ; `connexion.js` n'utilise `localStorage` que pour `gopharma.numero` (dernier numéro saisi, sans rapport) | **OK** |
| PIN jamais stocké/loggé côté client, champ `type="password"` | `connexion.js` | OK |
| CSP, HSTS, Referrer-Policy, Permissions-Policy | décision hébergeur | **BLOQUÉ (décision hébergeur)** |

**Correctifs du point 5 :**
- `assets/js/inscription.js` : toutes les valeurs dynamiques insérées en `innerHTML` (noms d'assurance, récapitulatif prénom/nom/ville/assurance) passent par `escapeHtml()`.
- `assets/js/api.js` : le jeton est écrit en `sessionStorage` ; `localStorage` est purgé à l'écriture, lu uniquement pour migrer une ancienne session, et vidé à la déconnexion.
- `scripts/smoke-*.js` (lecteurs du jeton) alignés sur `sessionStorage`.

*L'item CSP/HSTS/headers est un point de décision hébergeur, non compté dans les totaux du harnais (§8).*

## 8. Tests fonctionnels exécutés (ce rapport)

| Suite | Résultat | Détail |
|---|---|---|
| Tests de sécurité (`tests/security/`) | **90 tests \| 90 OK \| 0 FAIL \| 0 BLOQUÉ** | `tests/security/results.json` |
| — dont préparation (§0 : insertion + connexions A/B + connexion upload) | 4/4 OK | |
| — dont routes publiques sans jeton (§1.1) | 8/8 OK | 8 routes |
| — dont matrice de contrôle d'accès (§1) | 36/36 OK | 26 routes, 36 assertions |
| — dont injection SQL (§3) | 29/29 OK | Node + intégrité base |
| — dont upload (§4) | 5/5 OK | 5 tests |
| — dont stockage PIN (§6) | 1/1 OK | lecture MySQL |
| — dont brute force (§2) | 1/1 OK | 20 blocages / 30 essais |
| — dont erreurs (§5) | 1/1 OK | |
| — dont XSS Playwright (§7) | 5/5 OK | 5 écrans PHP (le 6ᵉ test portait sur `de-garde.php`, page supprimée) |
| `node --check` (JS modifiés) | OK | harnais + fichiers backend |
| Backend `npm test` | 22/22 | tests Jest mockés |

**Cohérence** : les totaux ci-dessus (**90 / 90 / 0 / 0**) correspondent exactement aux lignes de `tests/security/results.json` (90 entrées).

**Pourquoi 91 → 90 — journal du total.** La somme des lignes ci-dessus fait **90** avec 5 tests XSS ; elle faisait **91** avec 6. Le test qui manque est **« XSS Playwright — De garde »** : l'écran `de-garde.php` a été **supprimé** (cf. `RAPPORT_RECETTE_FONCTIONNELLE.md`, §2ter E3) et son test a été retiré **avec sa cible**. Ce n'est donc ni une fusion, ni le retrait d'un faux positif, et aucun écran existant n'a perdu sa couverture : les 5 pages restantes sont testées et OK (`tests/security/results.json`, entrées 86 à 90).

> Limite de traçabilité : `results.json` est **écrasé à chaque exécution** et le dossier web n'est pas versionné — il n'existe pas d'archive de la passe à 91. La reconstitution s'appuie sur la composition du tableau ci-dessus (91 = 90 + 1 test XSS), sur la liste des écrans du §7 (5 écrans, sans `de-garde.php`) et sur le journal du §2ter de la recette. Un test XSS « API » avait par ailleurs été retiré (l'API Node ne renvoie que du JSON) mais il n'était pas compté dans ces 91.

## 9. Livrables

1. Ce rapport (`RAPPORT_SECURITE.md`) — **état unique après les 6 points**, cohérent avec `results.json`.
2. Harnais rejouable : `D:\AssurAppCI-Web\tests\security\run-security-tests.js` (+ `results.json`).
3. Code : modèles `models/`, upload `middleware/`, configuration `index.js`, routeur `routes/routes.pharmacie.js`, front `assets/js/`, `scripts/smoke-*.js`.
4. Commits backend sur la branche `impl/securite-jwt-bcrypt` (un par point) :

| Commit | Point | Objet |
|---|---|---|
| `bd0d2e5` | 2 | `GET /api/annonces/toutes` : méthode de modèle manquante + import logger |
| `beb13ed` | 3 | Erreurs Multer (400 JSON) + handler global sans pile |
| `71356fe` | 4 | Mock Cloudinary local + validation magic bytes + `INSERT` pharmacie |
| `464d182` | 6 | `/docs` et `/api-docs` inaccessibles en production |

> Le dossier `D:\AssurAppCI-Web` **n'est pas un dépôt git** : ses fichiers (harnais, rapport, front, scripts smoke) ne peuvent pas être versionnés par commit. Les modifications correspondantes y sont néanmoins appliquées.

### Reste à faire

- **CSP / HSTS / en-têtes de sécurité** (`Content-Security-Policy`, `Strict-Transport-Security`, `Referrer-Policy`, `Permissions-Policy`) à définir **chez l'hébergeur** (décision d'hébergement).
- **Rotation de secrets** : **aucune** — le scan d'historique git complet (§0.2) n'a révélé aucun secret, donc aucun renouvellement n'est nécessaire au titre du point 1.

## Résumé

- **Secrets (point 1)** : historique git des deux dépôts scanné (gitleaks, 45 commits) → **aucun secret**, aucune rotation requise.
- **Route publique `GET /api/annonces/toutes` (point 2)** : **corrigée** → 200 JSON, plus de 500 + pile.
- **Erreurs Multer / handler global (point 3)** : **corrigées** → 400 JSON propre ; jamais de pile dans le corps, quel que soit `NODE_ENV`.
- **Upload de bout en bout (point 4)** : **validé** → témoin PNG accepté (201) via mock Cloudinary local ; faux `.jpg` et fichier vide rejetés (400) ; `code_gerant` unique par run.
- **Front (point 5)** : `nom_assurance` échappé ; jeton en `sessionStorage` (purge `localStorage`, déconnexion des deux) ; **5/5** tests XSS OK sur les écrans existants (le 6ᵉ, `de-garde.php`, a disparu avec la page — cf. §8).
- **Swagger (point 6)** : **protégé** → `/docs`, `/docs/`, `/api-docs` en **404** quand `NODE_ENV=production`.
- **Contrôle d'accès JWT** : 26 routes protégées, refus sans jeton / jeton invalide / accès croisé.
- **Injection SQL** : aucune trace, base intacte, pas d'injection temporelle.
- **Reste ouvert** : uniquement la CSP / HSTS / en-têtes (décision hébergeur).

Résultat global du harnais : **90 tests | 90 OK | 0 FAIL | 0 BLOQUÉ**.
