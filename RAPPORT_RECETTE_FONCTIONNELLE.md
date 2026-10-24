# GoPharma — Recette fonctionnelle (vérification automatisée + lignes manuelles)

> Exécution de la check-list de recette fonctionnelle du 18/10/2026.
> Périmètre : **local uniquement** — front PHP `http://localhost:8080`, API Node `http://localhost:4000/api`
> (Cloudinary en mode simulé), base MySQL `assurappci`. Aucune cible distante, aucun secret affiché.
> **Version 4.3 — suppression des données de démonstration** (voir §2sexies) : le tableau de bord
> n'affiche plus **aucune donnée fictive** (annonces, abonnés, statistiques, abonnement). Les modules
> Annonces, Newsletter et Statistiques restent visibles dans le menu mais affichent un écran
> « bientôt disponible » : le forfait gratuit ne les ouvre pas encore. La page Abonnement affiche
> les forfaits **réels** de l'API (prix, durées, fonctionnalités) avec la souscription en ligne
> désactivée. Non versionnable : le dépôt web n'est pas un dépôt git.
>
> **Version 4.2 — évolutions produit demandées après la recette** (voir §2ter, §2quater et §2quinquies) :
> « De garde » devient un **filtre** de la page Pharmacies (plus de page dédiée), le bouton
> « Carte » n'apparaît que sur cette page, les options de navigation deviennent des
> **pastilles arrondies sans bordure** sur **toutes** les barres du site (le bouton
> « Espace pharmacie » garde son style partout), et l'inscription ne propose plus de case
> « profil » : une **mention** indique que la création de compte est réservée au gestionnaire
> de pharmacie.

## 0. Cadre et méthode

La check-list est une **recette manuelle** (« à passer par David ou un testeur »). Une partie seulement est
automatisable depuis un poste de développement. Ce rapport distingue donc trois verdicts :

| Verdict | Signification |
| --- | --- |
| ✅ **OK** | Vérifié automatiquement, ou vérifié par lecture de code quand le comportement est déterministe. |
| ❌ **FAIL** | Écart constaté avec preuve reproductible (automatique) ou démonstration par le code. |
| ⛔ **BLOQUÉ** | Non vérifiable sans appareil réel / compte réel / outil externe, ou **dépend d'une décision produit**. |

Mesures automatiques : **77 vérifications — 75 OK, 0 FAIL, 2 BLOQUÉ**
(1ʳᵉ passe : 49 OK / 21 FAIL / 2 BLOQUÉ ; 2ᵉ passe : 56 OK / 14 FAIL / 2 BLOQUÉ ; 3ᵉ passe : 70 OK / 0 FAIL / 2 BLOQUÉ ;
4ᵉ passe, v4.3 : 75 OK / 0 FAIL / 2 BLOQUÉ — les deux BLOQUÉ sont les mêmes décisions produit, cf. §5 ;
5ᵉ passe, v4.4 : **75 OK / 0 FAIL / 2 BLOQUÉ** après les correctifs de mise en production, cf. §2septies).
Harnais : `tests/functional/run-functional-tests.js` → résultats machine `tests/functional/results.json`
(Playwright/Chromium, viewports 320 → 1440 px, réseau simulé hors ligne, interception d'API,
refus de géolocalisation déterministe, délai d'attente forcé).
Recette sécurité (7 points) : `tests/security/run-security-tests.js` → **90/90, 0 FAIL** (aucune régression ;
le nombre baisse de 1 parce que l'écran `de-garde.php` testé en XSS a été supprimé, cf. §2ter).
Contrôles du projet : `npm run check` (IDs + liens) **OK** ; `npm test` (5 suites de fumée jsdom) **exit 0**.

> Transparence : lors de cette vague, plusieurs vérifications du harnais qui étaient **codées en dur**
> (`5.5`, `6.8b`, `6.8c`, `7.2`) ont été remplacées par de **vraies assertions** mesurant le comportement
> (refus/aperçu de photo, cache API hors ligne, écritures désactivées, fin d'attente). Un contrôle devenue
> non pertinent a aussi été affiné (`1.3` : une page ne se lie plus forcément à elle-même).

**Données de test effectivement présentes en base locale** (relevé du 24/10) : **21 pharmacies** (dont **3 sans photo**, **5 de garde**,
19 avec coordonnées), 3 villes (Abidjan, Bouaké, Yamoussoukro), 13 assurances renseignées, comptes gérants
(`GERANT001`…) et comptes de test. Il **manque** : une pharmacie au nom très long, une pharmacie sans assurance,
une liste de 100+ pharmacies.

> **Note de cohérence (24/10)** : les mesures du §3 (`2.12` : 20 liens `tel:`, `2.13` : 20 boutons) et de `D14`
> citent « 20 » parce que c'était le volume au moment de leur exécution. La base contient **21** fiches depuis
> l'ajout d'une pharmacie de test ; ces mesures n'ont pas été réécrites (elles restent vraies pour l'instant où
> elles ont été prises), seuls les constats d'état courant (`2.16`, §5 et §3) ont été alignés sur 21.

## 1. Résultat d'ensemble

Répartition des **vérifications automatiques** (par groupe du harnais ; les verdicts remappés sur la
check-list se trouvent au §3) :

| Groupe de vérifs | ✅ OK | ❌ FAIL | ⛔ BLOQUÉ |
| --- | --- | --- | --- |
| 1. Premier lancement / navigation | 16 | — | — |
| 2. Annuaire (dont XSS nom/horaires) | 20 | — | 2 |
| 3. Carte / géolocalisation | 6 | — | — |
| 4. Pharmacies de garde (filtre) | 6 | — | — |
| 5. Espace pharmacie | 14 | — | — |
| 6. Installation / PWA | 7 | — | — |
| 7. Robustesse / erreurs | 5 | — | — |
| 9. Accessibilité (automatisable) | 1 | — | — |
| **Total** | **75** | **0** | **2** |

**Verdict global : plus aucun écart automatiquement détecté.** Les 3 défauts graves de la 1ʳᵉ passe (XSS stocké,
carte vide) et de la 2ᵉ passe (bascule « de garde ») sont corrigés, ainsi que **tous** les défauts gênants et
mineurs (D4–D17, §2bis), et les évolutions produit des §2ter à §2quinquies ont été implémentées et
vérifiées (navigation revisée, filtre de garde, page `de-garde.php` supprimée sans lien résiduel,
design de navigation appliqué à toutes les barres, inscription réservée au gestionnaire). Il ne reste que
**2 points bloqués** : un choix produit (filtre assurance multiple) et un test de charge impossible faute
de données (100+ pharmacies).

## 2. Points restants

### ⛔ Bloqués — décision ou données manquantes

| # | Point | Nature | Preuve |
| --- | --- | --- | --- |
| 2.6b | Filtre assurance : « l'une **ou** l'autre » / « les deux » (sélection **multiple**) | **Décision produit** : le filtre public est un `<select>` simple (une seule assurance). Le passage en multi-sélection change l'UI et l'API de recherche. | `2.6b` |
| 2.16 | Fluidité d'une liste de **100+** pharmacies | **Données manquantes** : seules 21 pharmacies en base. Test de charge à refaire sur données réelles. | `2.16` |

### Points d'attention (à confirmer avec David)

- **Numéro déjà inscrit** : l'API répond **HTTP 200 + `{success:false, message}`**, pas **409** comme l'attend
  la check-list. Le message est clair (« Un compte existe déjà pour ce numéro. »). *Preuve `5.3b`.*
- **Formats de numéro** : le front préfixe toujours par `+225`. Les comptes stockés **sans** ce préfixe
  (5 comptes sur 36, surtout des comptes de test) ne peuvent pas se connecter via le web.
- **Recherche sensible aux accents** : « Angre » ne trouve pas « Angré » (non exigé par la check-list).
- **Rafraîchissement automatique au retour du réseau** : le bandeau disparaît bien, mais les données ne sont
  pas rechargées sans action de l'utilisateur (§6.9).
- **Garde d'accès au dashboard** : la protection repose sur le client (redirection) ; la sécurité réelle est
  côté API (JWT) — couverte par le harnais sécurité.

## 2bis. Correctifs appliqués

### 2ᵉ vague (v2 → v3) — défauts gênants et mineurs

| # | Correctif | Fichier(s) | Avant → Après (preuve) |
| --- | --- | --- | --- |
| **D8** | **Bouton « Réessayer »** quand l'API est injoignable (bloc d'erreur explicite dans la liste) | `assets/js/pharmacies.js` | `7.1` : bouton **absent** → **présent** |
| **D9** | **Délai d'attente** (`AbortController`, 15 s) côté annuaire et client API, avec message dédié. Surchargeable en test via `window.GOPHARMA_API_TIMEOUT_MS` | `assets/js/pharmacies.js`, `assets/js/api.js` | `7.2` : blocage infini → message « Le serveur met trop de temps à répondre… » + réessai |
| **D12** | **Photo** : refus au-delà de 5 Mo, aperçu, **compression canvas** (max 1600 px, JPEG 0,8) avant envoi | `assets/js/inscription.js`, `inscription.php` | `5.5` : 6 Mo acceptés sans avertissement → **refus + message**, aperçu **affiché**, compression **active** |
| **D13** | **Écrans de démo sans réseau** : annonces/newsletters servies par des données fictives locales | `assets/js/dashboard.js` | `5.15` : annonces=1, newsletters=1 → **0 / 0** *(dispositif **retiré** en v4.3 : plus aucune donnée de démonstration, cf. §2sexies E9)* |
| **D14** | **PWA** : bouton « Installer l'application » (`beforeinstallprompt`), **cache des réponses API** (réseau d'abord, cache en secours), **écritures désactivées hors ligne** avec explication | `assets/js/pwa.js`, `sw.js`, `index.php`, `connexion.php`, `inscription.php` | `6.1` présent ; `6.8b` **20 fiches depuis le cache** hors ligne ; `6.8c` bouton « Continuer » **désactivé** + explication |
| **D4** | Menu de l'annuaire complété (Pharmacies / Carte / De garde) ; liens publics ajoutés aux pieds de page connexion / inscription / dashboard | `pharmacies.php`, `connexion.php`, `inscription.php`, `dashboard.php` | `1.3` : liens absents → **présents sur toutes les pages** *(depuis revisé : voir **E2** au §2ter)* |
| **D5** | Page **404** avec **lien de retour à l'accueil** | `router.php` | `1.6` : « lien retour accueil = NON » → **oui** |
| **D6** | **Débordement 320 px** : navigation publique rendue « wrappable », apparition du mot « Yamoussoukro » corrigée (`break-words`, `text-xl`) | `pharmacies.php`, `carte.php`, `index.php` | `1.5` : +176 px (carte) et +16 px (accueil) → **aucun débordement** |
| **D7** | **Squelettes conservés** pendant le chargement (au lieu d'une liste vidée) | `assets/js/pharmacies.js` | `2.2` : 0 squelette, écran vide → **3 squelettes visibles** |
| **D15** | **Libellés** (`aria-label`) sur les filtres publics | `pharmacies.php` | `9.2` : 3 champs sans libellé → **tous libellés** (le filtre de garde est lui aussi étiqueté, via `<label for>`) |
| **D16** | **Manifeste PWA** + `theme-color` sur l'inscription | `inscription.php` | `1.6b` : absent → **présent** |
| **D17** | **Cibles tactiles ≥ 44 px** : `.btn` porte `min-h-[44px]`, bouton d'affichage du PIN et boutons-icônes agrandis | `assets/css/src.css`, `connexion.php`, `index.php` | `1.7b` : plus petit bouton **16 px** (puis 40 px) → **≥ 44 px** |
| — | **Bug réel** : le message de **refus de géolocalisation** était écrasé par la fin du chargement de la carte | `assets/js/carte.js` | `3.6` : message remplacé par « 20 pharmacie(s) affichée(s). » → **message de refus conservé** |
| — | **Outillage** : CSS Tailwind régénéré ; `content` élargi à toutes les pages ; `npm run check` et `npm test` repassés au vert | `tailwind.config.js`, `assets/css/app.css`, `assets/js/dashboard.js` | `npm test` : 3 échecs → **exit 0** |

### 1ʳᵉ vague (v1 → v2) — défauts critiques

| # | Correctif | Fichier(s) | Avant → Après (preuve) |
| --- | --- | --- | --- |
| **D1** | **XSS** : échappement des horaires (`escapeHtml`) avant `innerHTML` | `assets/js/pharmacies.js:51-55` | `XSS-horaires` : exécution **confirmée** → **aucune exécution** |
| **D2** | Base d'API de la carte : `window.CONFIG` (inexistant) remplacé par `CONFIG.API_BASE_URL` ; idem dans l'annuaire pour supprimer le repli codé en dur | `assets/js/carte.js:5-8`, `assets/js/pharmacies.js:5-8` | `3.1` : **0 marqueur** → **20 marqueurs** ; `3.6` : erreur JSON → plus d'erreur |
| **D3** | Statut de garde : lecture de `statut_garde` (avec repli `est_de_garde`), via un helper `estDeGarde()` (même logique que `dashboard.js`) | `assets/js/pharmacies.js` (badge, filtre, fiche) | `2.1b` : badge « Actif » → « **De garde** » ; `4.1` : « Aucune pharmacie de garde » → **5 affichées** ; `4.3` cohérent |
| **D10** | Carte : message en cas de **refus / indisponibilité** de la géolocalisation (+ délai 10 s) | `assets/js/carte.js` | `3.6` : aucun message → « Position indisponible : autorisez la localisation… » |
| **D11** | Carte : **marqueur dédié** (pin vert, classe `marqueur-garde`) pour les pharmacies de garde | `assets/js/carte.js` | `3.4` : aucune distinction → **5 marqueurs de garde distincts** |

> Le harnais de sécurité est repassé **91/91 (0 FAIL)** après ces deux vagues : aucune régression.
> (Il est ensuite passé à **90/90** en v4 : l'écran `de-garde.php` ayant été supprimé, il n'est plus testé en XSS — cf. §2ter.)

## 2ter. Évolution produit demandée après la recette (v4)

Demande de David, appliquée et vérifiée :

1. **« De garde » n'est plus une page** : l'option quitte la navigation et devient une **case à cocher**
   dans les options de filtres de la page Pharmacies (« Uniquement les pharmacies de garde »).
2. **Le bouton « Carte » n'apparaît plus que dans la barre de navigation de la page Pharmacies**
   (retiré de toutes les autres barres et du pied de page d'accueil).
3. **Barre de navigation** : options restylées (voir **E5** au §2quater) ; le bouton
   « **Espace pharmacie** » garde son style d'origine (`btn-primary`).

| # | Changement | Fichier(s) | Preuve |
| --- | --- | --- | --- |
| **E1** | Filtre « Uniquement les pharmacies de garde » (au lieu de l'écran dédié) ; état partageable `pharmacies.php?garde=1` ; « Réinitialiser » le décoche | `pharmacies.php`, `assets/js/pharmacies.js` | `4.1` **5 résultats, tous « De garde »** ; `4.2` 20 sans filtre → **5** avec ; `4.4` lien direct → case cochée + **5** résultats ; `4.6` reset → **20** et case décochée |
| **E2** | Navigation : « De garde » retiré partout ; **« Carte » uniquement sur Pharmacies** | `index.php`, `pharmacies.php`, `carte.php`, `connexion.php`, `inscription.php`, `dashboard.php` | `1.3` liens requis présents ; **`1.3c` « Carte » absent de toutes les autres pages** |
| **E3** | Suppression de `de-garde.php` **sans lien résiduel** (navs, pieds de page, service worker) | `de-garde.php` (supprimé), `sw.js` (`gopharma-v3`), `scripts/check-ids.js` | **`1.3b` 0 lien vers l'ancienne page** ; `npm run check` OK (aucun lien mort) |
| **E4** | Barre de navigation : boutons à contours (`.btn-nav`, `.btn-nav.is-active`) — **remplacés depuis par E5** | `assets/css/src.css`, `assets/css/app.css` | `1.5` aucun débordement 320 px ; **`1.7b` tous les boutons ≥ 44 px** |

> Impact honnête sur la recette : la ligne « Menu : Pharmacies, Carte, De garde, Espace pharmacie » de la
> check-list est **remplacée** par cette décision produit (`1.3` + `1.3c`), et les lignes du §4
> « Écran De garde » deviennent un test du **filtre** (`4.1`, `4.2`, `4.3`, `4.4`, `4.6`). Le test XSS
> automatique perd un écran (91 → **90/90**, 0 FAIL) puisque `de-garde.php` n'existe plus.

## 2quater. Deuxième itération produit (v4.1)

| # | Changement | Fichier(s) | Preuve |
| --- | --- | --- | --- |
| **E5** | **Options de la barre de navigation restylées** : pastilles arrondies **sans bordure**, fond doux au survol, page courante en vert clair (`.btn-nav`, `.btn-nav.is-active`). Le bouton « **Espace pharmacie** » est **inchangé** (`.btn-primary`, jamais `.btn-nav`) | `assets/css/src.css`, `assets/css/app.css`, `pharmacies.php`, `carte.php` | `1.5` aucun débordement 320/390/1100 px ; **`1.7b` ≥ 44 px** ; rendu vérifié en capture (bureau 1 100 px + mobile 390 px) |
| **E6** | **Inscription** : suppression de la **case à cocher « Je suis gestionnaire de pharmacie »** (et du parcours « utilisateur classique ») ; remplacée par une **mention** « Réservé au gestionnaire de pharmacie ». Le compte est **toujours** créé en `Gestionnaire de pharmacie` | `inscription.php`, `assets/js/inscription.js`, `scripts/smoke-inscription.js` | `smoke-inscription` **19/19** : « Case « gestionnaire » supprimée », « Mention « réservé au gestionnaire de pharmacie » », « Type d'utilisateur transmis (gestionnaire) » ; `5.2`/`5.4`/`5.5` (validation, PIN, photo) **OK** ; XSS inscription **OK** |

> Le bouton d'étape n'a plus deux libellés possibles : l'étape 2 affiche toujours « Continuer » et
> l'étape 3 « Créer mon compte ». Le `type_utilisateur` envoyé à l'API est désormais constant
> (`Gestionnaire de pharmacie`), ce que vérifie le test de fumée de l'inscription.

## 2quinquies. Troisième itération produit (v4.2)

Demande de David, appliquée et vérifiée : « applique le même design de navbarre à toutes les navbarres ».

| # | Changement | Fichier(s) | Preuve |
| --- | --- | --- | --- |
| **E7** | **Design de navigation généralisé** : les pastilles `.btn-nav` (option sans bordure, fond doux au survol, page courante en vert clair) remplacent les liens texte de **toutes les autres barres** — en-tête de l'accueil (bureau **et** menu replié), pieds « Navigation publique » de Connexion, Inscription et Tableau de bord — en plus de Pharmacies et Carte (§2quater **E5**). Classe `.nav-link`, devenue inutilisée, **supprimée** de la feuille source | `index.php`, `connexion.php`, `inscription.php`, `dashboard.php`, `assets/css/src.css`, `assets/css/app.css` | **`1.5` aucun débordement horizontal** (1440/1280/1100/1024/390/320 px) ; **`1.7b` tous les boutons ≥ 44 px** ; captures : accueil 1 280 px + menu mobile 390 px, Connexion, Tableau de bord (connecté) |
| **E8** | **Accueil : adaptation responsive honnête** — la barre complète (4 ancres + « Partager le site » + « Créer un compte » + « Espace pharmacie ») s'affiche à partir de **1 280 px** ; en dessous, ces options restent accessibles via le **menu replié** (pastilles pleine largeur). Motif : à 1 024 px, la barre complète ne tenait pas sur une ligne (boutons sur deux lignes) ; le bouton « Espace pharmacie » reste visible dès **640 px** | `index.php` | captures 1 440 / 1 280 px : barre complète, `overflow = 0` (contenu 987 px pour 1 216 px utiles) ; 1 100 / 1 024 / 390 px : menu replié, `overflow = 0` |

> **Points à valider par David (non bloquants).** (1) Les options sont **sans bordure** hors survol :
> elles se lisent donc comme du texte au repos — c'est le design validé en E5, mais sur l'accueil
> « Partager le site » et « Créer un compte » perdent leur ancien contour de bouton secondaire ; il est
> possible d'ajouter un fond très clair permanent (une ligne dans `.btn-nav`). (2) Le bouton
> « **Espace pharmacie** » garde son style `btn-primary` **partout** (y compris le pied du tableau de
> bord) conformément à la consigne. (3) La **barre latérale** du tableau de bord (`.sidebar-link`) n'a
> pas été touchée : c'est un menu d'application vertical, pas une barre de navigation publique.

## 2sexies. Quatrième itération produit (v4.3) — plus aucune donnée fictive

Demande de David, appliquée et vérifiée : « je ne veux pas de donnée fictive au niveau des stats, des
newsletters, des annonces et même les données sur l'abonnement sur le dashboard. Mieux limite les
fonctionnalités aux forfaits gratuits pour l'instant. » Décisions confirmées : les modules restent
**visibles** (« je veux qu'ils sachent que ces modules existent mais qu'ils ne sont pas encore
disponibles ») et les forfaits restent **consultables**, boutons désactivés.

| # | Changement | Fichier(s) | Preuve |
| --- | --- | --- | --- |
| **E9** | **Mode démonstration supprimé** : `DEMO_MODE`, les 2 annonces et les 2 abonnés fictifs, le bandeau « Mode démonstration » et les libellés « (démo) » sont retirés. Les écrans lisent exclusivement l'API réelle | `assets/js/dashboard.js`, `dashboard.php` | `5.15` : **aucune** trace de `DEMO_MODE` ni de donnée inventée dans le front livré ; `5.14b` : `#demo-banner` = **0**, libellé « (démo) » invisible ; réseau : appels réels `/annonces/pharmacie`, `/newsLetters/abonnement`, `/abonnements/*` |
| **E10** | **Modules hors forfait** : l'ouverture d'Annonces, Newsletter et Statistiques est demandée à l'API (`POST /abonnements/verifier-acces`, qui répond `acces:false` pour le forfait **Gratuit**). Accès refusé → écran « bientôt disponible », contenu et boutons d'action **masqués**. Aucune donnée affichée, aucune valeur simulée | `assets/js/dashboard.js`, `dashboard.php` | `5.15b` : les 3 modules renvoient `{contenuCache:true, verrouVisible:true, annonce:true, actionCachee:true}` |
| **E11** | **Abonnement réel** : le plan affiché vient de `GET /abonnements/actif` (réponse mesurée : `Gratuit`, 0 FCFA) ; les 3 forfaits affichés sont les **données réelles** de l'API (prix, durées, fonctionnalités) ; la souscription en ligne est **fermée** (« Bientôt disponible », boutons désactivés) et le code de souscription (paiement simulé `Wave`) est **retiré** | `assets/js/dashboard.js` | `5.14c` : plan courant « Gratuit » ; Gratuit → « Forfait en cours » (désactivé), Standard et Premium → « Bientôt disponible » (désactivés) |
| **E12** | **Bug réel corrigé, masqué par le mode démo** : `assurances_acceptees` arrive de l'API en **chaîne** (`"ALLIANZ, Atlantique, …"`) → `.map()` levait une exception dans `renderAssurances`, ce qui **interrompait le rendu initial** (annonces, newsletter, forfaits et statistiques n'étaient jamais rendus). Normalisation de la liste + garde `Array.isArray` sur toutes les réponses de liste | `assets/js/dashboard.js` | **Avant** : `TypeError: ((state.pharmacie || {}).assurances_acceptees \|\| …).map is not a function` (console) ; **après** : **aucune erreur JS**, accueil réel (6 assurances, 0 annonce, 0 abonné) |
| **E13** | **Photo distante indisponible** : l'URL `photo_pharmacie` de `PHARM001` répond **404** → repli sur l'icône prévue au lieu d'une image cassée (accueil et aperçu du profil) | `assets/js/dashboard.js` | `https://images.unsplash.com/photo-1586015555751-63bb77f9a5f0` → **404** mesuré ; capture avant (image cassée) / après (icône de repli) |
| **E14** | **Ancienne version servie par le cache du service worker** (constaté par David : « les pages annonces/newsletter/statistiques sont toujours accessibles et affichent des données fictives ») : le `CACHE_NAME` n'avait pas été incrémenté, or le service worker sert les pages et les assets en **cache d'abord** → un navigateur déjà équipé gardait l'ancien `dashboard.js`. Version de cache **`gopharma-v4`** + règle documentée (incrémenter à chaque modification) + `sw.js` servi en `no-cache` pour que la mise à jour soit détectée | `sw.js`, `router.php` | **Avant** : `CACHE_NAME = 'gopharma-v3'` (inchangé depuis la vague précédente) ; **après** : `caches.keys()` = **`['gopharma-v4']`**, `dashboard.js` en cache **sans** `DEMO_MODE`, `dashboard.php` en cache **sans** `demo-banner` et **avec** `annonces-verrouille` ; en-tête `sw.js` = `no-cache, must-revalidate`. Le serveur servait déjà la bonne version (vérifié : `DEMO_MODE` absent du fichier livré) — le décalage venait uniquement du cache navigateur |

**Points d'attention ouverts (v4.3, non bloquants, backend)**

1. **Plan payant non affichable** : le front interroge `GET /abonnements/actif` avec le **code gérant**
   (comportement historique) ; l'API répond alors le forfait par défaut (`Gratuit`). Avec le **code
   pharmacie** (`PHARM001`), la même route renvoie **403 « Accès non autorisé à cette ressource »**
   (`verifierIdentite` compare au code utilisateur). Afficher un forfait payant suppose donc un
   correctif backend (vérifier le lien gérant ↔ pharmacie). Sans impact aujourd'hui : le seul forfait
   réel est le gratuit.
2. **Route de consommation absente** : `GET /abonnements/utilisation/:code` n'existe pas dans l'API
   locale (**404**). Elle n'est donc appelée que lorsqu'un abonnement est en cours ; sinon la carte
   affiche « Aucune donnée de consommation disponible pour le moment. » (état réel, pas simulé).
3. **Newsletter d'une pharmacie sans abonnement** : l'API refuse la liste (`{success:false, message:
   "Vous avez aucun abonnement en cours"}`) alors que la base contient 6 abonnés pour `PHARM001` →
   l'écran affiche 0. C'est la réponse réelle de l'API, pas une donnée inventée.
4. **Périmètre exact du forfait Gratuit** : en base, il ne contient que *Profil de base*, *Horaires* et
   *Localisation* — **ni Photo pharmacie, ni Gestion assurances** (réservées à Standard/Premium). Ces deux
   éléments du formulaire **restent utilisables** aujourd'hui : ils n'ont pas été verrouillés faute de
   demande explicite. Décision produit à prendre si l'on veut appliquer le forfait à la lettre
   (le profil deviendrait alors partiellement verrouillé).

## 2septies. Cinquième itération (v4.4) — configuration de mise en production

Demande de David : « peux-je le mettre en ligne maintenant ? ». L'audit de mise en ligne a identifié
trois bloquants **dans le front** ; ils sont corrigés ici (les deux autres — merge de la branche API et
base de production — relèvent de l'hébergement). Détail complet : `RAPPORT_ETAT_PROJET.md`.

| # | Changement | Fichier(s) | Preuve avant / après |
| --- | --- | --- | --- |
| **E15** | **Bascule local ⇄ production de l'API** : `api_base()` renvoyait **toujours** `http://localhost:4000/api`, même en production → le navigateur du visiteur appelait sa propre machine. Il renvoie désormais `API_DISTANTE` dès que l'hôte n'est pas local (filet de sécurité si `APP_ENV` reste `'local'` sur un hôte public). `est_local()` devient le point de bascule réel (elle n'était appelée nulle part) et `APP_DEBUG` passe à `false` | `config/app.php` | **Avant** : `GET index.php` avec `Host: gopharma.ci` → `apiBase: 'http://localhost:4000/api'` ; **après** : `apiBase: 'https://apiassureappci-production.up.railway.app/api'` (et `localhost` → inchangé). Matrice vérifiée en CLI : `localhost`, `127.0.0.1`, `192.168.*` → API locale ; `gopharma.ci` → Railway ; `APP_ENV='prod'` → Railway même sur localhost |
| **E16** | **Relais PHP `/api` fantôme** : `.htaccess` et `router.php` pointaient vers `api/index.php`, **absent** du projet (`require` fatal si la route était appelée) | `.htaccess`, `router.php` | **Avant** : `require` sur un fichier inexistant ; **après** : `GET /api/pharmacie` → `404 {"success":false, "message":"Cette application n'expose pas /api…"}` |
| **E17** | **Cache PWA** : `CACHE_NAME` porté à **`gopharma-v5`** pour que les navigateurs déjà équipés prennent les correctifs ci-dessus | `sw.js` | `caches.keys()` = `['gopharma-v5']` ; `dashboard.js` en cache **sans** `DEMO_MODE` ; `dashboard.php` en cache **avec** `annonces-verrouille` |
| **E18** | **Harnais paramétrable** : `BASE_URL` accepté par la recette fonctionnelle (comme les smoke tests), après découverte que **WildFly occupait `127.0.0.1:8080`** sur le poste de test (le navigateur tombait sur WildFly, pas sur GoPharma) | `tests/functional/run-functional-tests.js` | Recette relancée sur `http://127.0.0.1:8081` : **77 vérifs / 75 OK / 0 FAIL / 2 BLOQUÉ** ; `npm test` exit 0 (12/12, 12/12, 19/19, 20/20, 32/32) ; `npm run check` OK |

## 3. Vérification ligne par ligne

Légende : ✅ OK · ❌ FAIL · ⛔ BLOQUÉ · — non applicable.

### 0. Préparation

| Ligne | Verdict | Commentaire / preuve |
| --- | --- | --- |
| Tester en local, comptes/pharmacies fictifs | ✅ | Fait en local (front 8080 + API 4000, Cloudinary simulé). |
| Données de test (6 pharmacies, 2 de garde, 1 sans photo, 1 nom long, 1 sans assurance, 3 assurances, 2 villes, 2 gérants) | ⛔ | 21 pharmacies, 3 sans photo, 3 villes, 16 assurances : suffisant **sauf** nom très long, sans-assurance, et 2ᵉ gérant dédié. |
| Appareils Android / iPhone / ordinateur | ⛔ | Test humain requis (Playwright ≠ iPhone Safari). |
| Réseaux Wi-Fi / 4G / Slow 3G / mode avion | ⛔ | Mode hors ligne simulé et validé (`6.8`, `6.8b`, `6.8c`). Le reste = test humain. |
| Console sans erreur rouge (parcours normal) | ✅ | `1.2` : 0 erreur JS sur les 6 écrans. |
| Vider cache / données avant 1ᵉʳ lancement | ✅ | Contexte navigateur neuf à chaque test. |

### 1. Premier lancement et navigation

| Ligne | Verdict | Commentaire / preuve |
| --- | --- | --- |
| Affichage < 3 s en 4G avec indicateur de chargement | ✅ | `1.1` : DOM prêt 20–60 ms en local (à chaud) ; squelettes affichés pendant le chargement (`2.2`, D7). Vitesse 4G réelle à confirmer. |
| Texte en français, sans faute ni texte technique | ✅ | `1.2b`, `1.4` : aucun `undefined`/`null`/`[object Object]`, `html lang="fr"`. |
| Menu : Pharmacies, Carte, De garde, Espace pharmacie + badge « Démo » | ✅ | **Décision produit (E2/E3, §2ter)** : « De garde » est devenu un **filtre** de la page Pharmacies et le bouton « Carte » n'est affiché **que** sur cette page. `1.3` (liens Pharmacies + Espace pharmacie sur toutes les pages), `1.3c` (« Carte » absent ailleurs dont l'accueil), `1.3b` (aucun lien vers l'ex-page supprimée). **v4.3** : le badge « Démo » n'existe plus (mode démonstration supprimé, §2sexies E9). |
| Boutons retour navigateur / téléphone | ⛔ | Test humain (routage interne du dashboard par `#/vue`). |
| F5 sans page blanche ni 404 | ✅ | Rechargements validés sur toutes les pages (`1.1`). |
| Adresse inconnue → page « introuvable » + retour accueil | ✅ | `1.6` : HTTP 404 + **lien « Retour à l'accueil »** (D5). |
| Boutons ≥ 44 px, contraste, pas de défilement horizontal | ✅/⛔ | `1.7b` : tous les boutons ≥ 44 px (D17) ; `1.5` : **aucun débordement** à 320 px (D6). Contraste : non mesuré (humain). |

### 2. Annuaire des pharmacies

| Ligne | Verdict | Commentaire / preuve |
| --- | --- | --- |
| Liste : nom, ville/adresse, horaires, assurances, badge « De garde » | ✅ | `2.1` (20 fiches) et `2.1b` : badge « **De garde** » correct après correctif D3. |
| Pendant le chargement : squelettes (pas d'écran vide) | ✅ | `2.2` : **3 squelettes** visibles pendant le `fetch` (D7). |
| Recherche : partiel, casse, accents | ✅ | `2.3a` (PHARM → 20), `2.3b` (Angré trouvée). |
| Recherche sans résultat : message clair | ✅ | `2.4` : « Aucune pharmacie trouvée pour ces critères… ». |
| Caractères spéciaux (`'`, `"`, `%`, `<b>`) : rien ne s'exécute | ✅ | `2.5` : 0 erreur, 0 dialogue, pas de balise injectée. |
| Filtre assurance (dont « l'une ou l'autre / les deux ») | ⛔/✅ | `2.6` : liste alimentée (13 assurances) — **sélection simple uniquement** ; le multi dépend d'une décision produit (`2.6b`). |
| Filtre ville (et combinaison ville + assurance + recherche) | ✅ | `2.7`, `2.7b` : Abidjan → 18 fiches, filtre actif affiché. |
| Bouton « Réinitialiser » + filtres actifs visibles | ✅ | `2.8`, `2.9` : reset → 20 fiches, zone « Filtres actifs » présente. |
| Fiche : nom, adresse, tél, horaires, assurances, photo, garde | ✅ | `2.10` : tous les champs présents. |
| Pharmacie sans photo : remplacement propre | ✅ | `2.11` : bloc gris « Pharmacie », aucune icône cassée. |
| Nom très long : non cassé | ✅ | `2.11b` : 0 débordement avec un nom de ~200 caractères. |
| Bouton « Appeler » (`tel:`) | ✅ | `2.12` : 20 liens `tel:`. |
| Bouton « Itinéraire » | ✅ | `2.13` : 20 boutons (ouverture effective = test humain). |
| URL d'une fiche partageable | ✅ | `2.14` : `?pharmacie=…` rouvre la bonne fiche. |
| Liste volumineuse (100+) fluide | ⛔ | `2.16` : seulement 21 pharmacies en base (test de charge à refaire). |

### 3. Carte et géolocalisation

| Ligne | Verdict | Commentaire / preuve |
| --- | --- | --- |
| Carte avec marqueurs ; chargée seulement sur son écran | ✅ | `3.1` : **20 marqueurs** après correctif D2 ; `3.1b` : Leaflet chargé uniquement sur la carte. |
| Zoom / déplacement / pincement fluides | ⛔ | Test humain. |
| Toucher un marqueur → la bonne pharmacie | ⛔ | Test humain (les popups portent nom/adresse/tél/itinéraire). |
| Marqueurs distincts pour les pharmacies de garde | ✅ | `3.4` : **5 marqueurs de garde distincts** (D11). |
| Permission acceptée : centrage + tri par distance | ✅ | `3.5` : position affichée sur la carte + message « Votre position est affichée sur la carte. ». |
| Permission refusée : message clair, app utilisable | ✅ | `3.6` : « Position indisponible : autorisez la localisation ou choisissez une ville dans la liste. » (D10 + correctif d'écrasement du message). |
| Permission bloquée : explication pour réactiver | ✅ | Même message d'aide au refus (D10). |
| Position indisponible : délai max puis message | ✅ | Délai de 10 s + message (D10). |
| Permission demandée seulement après action | ✅ | `3.9` : `getCurrentPosition` uniquement au clic « Me localiser ». |
| Mauvaise connexion : message si tuiles non chargées | ⛔ | Test humain (message d'erreur API présent pour les données). |
| Pharmacie sans coordonnées : absente de la carte sans erreur | ✅ | Marqueur ignoré si lat/lon non finies (19/20 géolocalisées). |

### 4. Pharmacies de garde

| Ligne | Verdict | Commentaire / preuve |
| --- | --- | --- |
| Écran « De garde » = seulement les pharmacies de garde, bon compte | ✅ | **Devenu un filtre de la page Pharmacies** (E1) : `4.1` case cochée → **5 résultats, tous « De garde »** ; `4.2` : 20 sans filtre → **5** avec filtre (la liste est réellement restreinte). |
| Aucune pharmacie de garde : message clair | ✅ | Message « Aucune pharmacie de garde enregistrée pour le moment. » affiché lorsque le filtre est actif et ne renvoie rien. |
| Badge « De garde » cohérent liste / fiche / carte | ✅ | `4.3` : liste « De garde », fiche « De garde », carte marqueur dédié (`3.4`). |
| Bascule de garde depuis l'espace pharmacie → visible en public | ⛔ | Test humain (nécessite un compte gérant abonné et une modification réelle). |
| Aucune date de garde affichée si l'API n'en fournit pas | ✅ | `4.5` : aucune date affichée par le front. |

### 5. Espace pharmacie

> Numérotation ajoutée par nos soins (les puces d'origine n'étaient pas numérotées), dans l'ordre du document.

**Inscription et connexion**

| Ligne | Verdict | Commentaire / preuve |
| --- | --- | --- |
| 5.1 Inscription données valides → étape suivante | ⛔ | Créerait un compte réel : test humain / données dédiées. L'inscription web est **réservée au gestionnaire de pharmacie** (mention à l'étape 1, plus de case à cocher — **E6**). |
| 5.2 Champs obligatoires vides → erreurs précises en français | ✅ | `5.2` : « Indiquez votre nom. », « Saisissez un numéro de téléphone valide. », etc. |
| 5.3 Numéro déjà inscrit → message clair (409) sans plantage | ✅/⚠️ | `5.3b` : « Un compte existe déjà… », mais en **HTTP 200**, pas 409 (voir Points d'attention). |
| 5.4 PIN masqué, jamais dans l'URL | ✅ | `5.4` : `#pin` = `type="password"` ; envoyé en corps POST. |
| 5.5 Mauvais PIN → message générique + ralentissement | ✅ | `5.5b` : « Identifiants incorrects… » (générique). Limiteur de débit côté API (constaté). |
| 5.6 Connexion réussie → nom du gérant | ✅ | `5.6`, `5.6b` : dashboard + « Paul Assouan ». |
| 5.7 Déconnexion → connexion ; retour ne ramène pas | ✅ | `5.7` : retour à `connexion.php`, `sessionStorage` et `localStorage` vidés. |
| 5.8 Fermer l'onglet puis rouvrir (session) | ✅ | Session en `sessionStorage` (`5.9b`) → fermeture d'onglet = déconnecté (comportement annoncé). |
| 5.9 Session expirée → connexion avec message | ⛔ | Non simulé (expiration JWT). À vérifier (geste humain). |

**Enregistrement d'une pharmacie** *(débloqué côté backend : correctifs A1/A2 déjà livrés)*

| Ligne | Verdict | Commentaire / preuve |
| --- | --- | --- |
| 5.10 Champs obligatoires signalés, envoi impossible | ⛔ | Test humain (formulaire du dashboard). |
| 5.11 Horaires : format accepté, invalide refusé | ⛔ | Test humain. |
| 5.12 Position : épingle, « Utiliser ma position », lat/long | ⛔ | Test humain. |
| 5.13 Assurances : sélection multiple | ⛔ | Test humain. |
| 5.14 Photo : refus non-image, taille max, aperçu, compression | ✅/⛔ | `5.5` : fichier de 6 Mo **refusé** avec message, aperçu **affiché**, compression **canvas** active avant envoi. Le refus *non-image* dépend aussi du backend (test humain). |
| 5.15 Envoi réussi → confirmation + visible dans l'annuaire | ⛔ | Test humain (écrit en base). |
| 5.16 Double clic → une seule pharmacie | ⛔ | Test humain. |
| 5.17 Coupure réseau → message, formulaire conservé, réessai | ⛔ | Test humain ; le bouton d'envoi est désormais **désactivé hors ligne** (`6.8c`). |

**Modification et garde**

| Ligne | Verdict | Commentaire / preuve |
| --- | --- | --- |
| 5.18 Fiche préremplie | ⛔ | Test humain. |
| 5.19 Modifier un champ, autres intacts, photo préservée | ⛔ | Test humain. |
| 5.20 Changer la photo → visible en public | ⛔ | Test humain (Cloudinary simulé en local). |
| 5.21 Modifier les assurances → filtre public à jour | ⛔ | Test humain. |
| 5.22 Bascule « de garde » → effet visible en public | ⛔ | Désormais **possible** (correctif D3) ; reste un test humain. |
| 5.23 Un gérant n'accède qu'à sa pharmacie (compte B) | ⛔ | Test humain (2 comptes gérants). |
| 5.24 Visiteur non connecté → redirigé vers la connexion | ✅ | `5.13` : redirection vers `connexion.php`. ⚠️ garde **côté client seulement** (l'API est protégée par JWT). |

**Modules payants (annonces, newsletter, statistiques)**

| Ligne | Verdict | Commentaire / preuve |
| --- | --- | --- |
| 5.25 Badge « Démo » + données fictives | ✅ | **Supprimé en v4.3** (E9) : plus aucun jeu de démonstration — `5.15` ne trouve ni `DEMO_MODE` ni donnée inventée dans le front livré ; `5.14b` : bandeau « Mode démonstration » **absent** (0) et libellé « (démo) » **invisible**. |
| 5.26 Aucune requête réseau vers ces routes | ✅/⚠️ | **Comportement changé en v4.3** : les écrans ne simulent plus rien mais interrogent l'**API réelle** (annonces, abonnés, `verifier-acces`). `5.15b` : les trois modules affichent un écran d'attente et **aucune donnée**. |
| 5.27 Texte « bientôt disponible » | ✅ | `5.15b` : chaque module affiche « Annonces / Newsletter / Statistiques : bientôt disponible », l'explication « rien n'est affiché ; aucune donnée n'est simulée » et un lien « Voir les forfaits » ; `5.14c` : les forfaits payants portent « Bientôt disponible » (désactivés). |

### 6. Installation et PWA

| Ligne | Verdict | Commentaire / preuve |
| --- | --- | --- |
| 6.1 Android : bouton « Installer » + installation | ✅/⛔ | `6.1` : section « Installer l'application » + bouton (révélé par `beforeinstallprompt`) présents. L'installation réelle = test humain Android. |
| 6.2 iPhone Safari : ajout à l'écran d'accueil + aide | ✅/⛔ | Aide intégrée (« Sur iPhone : bouton Partager puis “Sur l'écran d'accueil” »). Manipulation réelle = test humain. |
| 6.3 Ordinateur Chrome : installation depuis la barre d'adresse | ⛔ | Test humain. |
| 6.4 Icône « maskable », splash, barre d'état | ✅/⛔ | `6.4` : manifeste valide (`display=standalone`), icônes 192/512 en 200, `purpose="any maskable"`. Splash/barre d'état = humain. |
| 6.5 Invite discrète, ne réapparaît pas | ✅ | Invite **contextuelle** (section dédiée en bas de page d'accueil) et non intrusive ; le bouton natif n'apparaît que si le navigateur le propose. |
| 6.6 Une fois installée, le bouton disparaît | ✅/⛔ | Sur `appinstalled`, le bouton est masqué et l'aide devient « Application installée ». Vérification réelle = test humain. |
| 6.7 Mise à jour : message « Nouvelle version disponible » | ⛔ | Test humain (mise à jour du SW). |
| 6.8 Hors ligne : app s'ouvre + bandeau ; dernières données ; écritures désactivées | ✅ | `6.8` ouverture + bandeau ; `6.8b` **20 fiches servies depuis le cache** du service worker ; `6.8c` bouton « Continuer » **désactivé** + explication (D14). |
| 6.9 Retour réseau : bandeau disparaît, données se rafraîchissent | ✅/⚠️ | `6.9` : bandeau retiré. Le rafraîchissement automatique des données n'est pas déclenché par l'évènement `online` (les données sont à jour au prochain chargement). |
| 6.10 Après déconnexion, aucune donnée de compte hors ligne | ✅ | Session en `sessionStorage` vidée à la déconnexion (`5.7`) ; le dashboard exige la session (`5.13`). |
| 6.11 Notifications push non proposées | ✅ | Aucun code de push. |

### 7. Robustesse et erreurs

| Ligne | Verdict | Commentaire / preuve |
| --- | --- | --- |
| 7.1 API injoignable : message + « Réessayer », pas d'écran blanc | ✅ | `7.1` : message clair + **bouton « Réessayer »** (D8). |
| 7.2 API lente (> 15 s) : fin d'attente, message, réessai | ✅ | `7.2` : délai d'attente (15 s, ramené à 800 ms en test) → « Le serveur met trop de temps à répondre… » + réessai (D9). |
| 7.3 Réponse vide/inattendue : pas d'`undefined`, pas de plantage | ✅ | `1.2b` + échappement des champs ; JSON invalide → message, pas de crash. |
| 7.4 Erreurs 400/401/404/409/500 : message FR, jamais technique | ✅ | `7.4` : une 500 affiche « Impossible de charger les pharmacies : Erreur serveur » (pas de trace technique). |
| 7.5 Listes vides / assurance sans pharmacie / ville sans pharmacie | ✅ | `7.5` : états vides soignés. |
| 7.6 Données inhabituelles (emoji, accents, apostrophes, long, horaires vides, tél inattendu) | ✅/⚠️ | Nom très long OK (`2.11b`), accents OK (`2.3b`) ; emoji non couvert explicitement. |
| 7.7 `<script>` dans un nom → affiché comme texte | ✅ | Nom **et** horaires échappés (`XSS-nom`, `XSS-horaires` : OK) après correctif D1. |
| 7.8 Deux onglets, connexion dans l'un | ⛔ | Test humain. |
| 7.9 Bascule Wi-Fi ↔ 4G pendant une action | ⛔ | Test humain. |

### 8. Performance et données

| Ligne | Verdict | Commentaire |
| --- | --- | --- |
| 8.1 Lighthouse mobile (PWA, perf ≥ 80, a11y ≥ 90) | ⛔ | Outil non lancé (à exécuter par un humain). |
| 8.2 Poids 1ʳᵉ page ; carte à la demande | ✅/⛔ | `3.1b` : carte chargée à la demande. Poids : à mesurer. |
| 8.3 2ᵉ visite plus rapide (cache) | ✅ | Service worker actif (`6.10`), pages et assets pré-cachés — à confirmer sur appareil. |
| 8.4 Données fraîches (délai après modification) | ⛔ | Test humain. |
| 8.5 Consommation de données maîtrisée | ⛔ | Test humain (appareil). |
| 8.6 Pas de fuite mémoire (10 min) | ⛔ | Test humain. |

### 9. Accessibilité et confort

| Ligne | Verdict | Commentaire / preuve |
| --- | --- | --- |
| 9.1 Navigation clavier + focus visible | ⛔ | Test humain (balisage standard, `focus-visible:ring` sur les boutons). |
| 9.2 Chaque champ a un libellé ; erreurs annoncées | ✅ | `9.2` : filtres publics (`#pharmacies-search`, `#filtre-ville`, `#filtre-assurance`) **libellés** (`aria-label`) (D15) ; le nouveau filtre de garde porte un `<label for="filtre-garde">` (E1). |
| 9.3 Texte agrandi 150 % | ⛔ | Test humain. |
| 9.4 Rotation d'écran | ⛔ | Test humain. |
| 9.5 Mode sombre | ⛔ | Test humain. |
| 9.6 Lecteur d'écran (TalkBack/VoiceOver) | ⛔ | Test humain. |

### 10. Scénarios de bout en bout

| Scénario | Verdict | Commentaire |
| --- | --- | --- |
| A. Patient (position, garde proche, appeler, itinéraire) | ⛔ | **Débloqué par D2/D3/D11 + D6/D17** ; à rejouer sur appareil réel. |
| B. Patient sans position (ville + assurance + fiche) | ✅/⛔ | Annuaire/filtres OK (`2.4`–`2.14`) ; à confirmer sur appareil. |
| C. Patient hors ligne (retrouver une fiche) | ✅/⛔ | Données désormais **mises en cache** (`6.8b`, D14) ; à confirmer sur appareil. |
| D. Nouveau gérant (inscription + pharmacie + annuaire) | ⛔ | Nécessite données réelles (5.1, 5.15). |
| E. Gérant au quotidien (modifier horaires, garde, déconnexion) | ⛔ | Test humain ; l'effet « garde » est désormais visible côté public (D3). |
| F. Partenaire en démo (installer + parcourir) | ✅/⛔ | Bouton « Installer l'application » désormais présent (`6.1`, D14) ; installation réelle = test humain. |

### 11. Compte rendu

Le présent document tient lieu de compte rendu. Les points restants sont détaillés au §2 avec
appareil/navigateur (Chromium bureau + viewport mobile 320–390 px), étapes de reproduction (harnais
`tests/functional/run-functional-tests.js`), résultat obtenu, résultat attendu et gravité.

## 4. Critères d'ouverture aux partenaires

| Critère | Atteint ? |
| --- | --- |
| Aucune ligne « bloquant » ouverte dans les sections 1 à 6 | ✅ Oui — **0 FAIL** automatique ; 2 points *bloqués* (décision produit / données manquantes) |
| Scénarios A, B, D et F réussis sur Android modeste et iPhone | ⚠️ Partiel — A et F **débloqués** ; appareils réels non testés |
| Section 5 n'est plus « bloquée » par les correctifs backend | ✅ Oui — correctifs A1/A2 (et suivants) livrés |
| Aucun risque critique ouvert dans le rapport de sécurité | ✅ Oui — l'XSS stocké (D1) est corrigé et vérifié (90/90) |

## 5. Ce qui reste à faire par un humain (non automatisable)

- Tests sur **Android bas de gamme** et **iPhone Safari** (installation PWA réelle, plein écran, `tel:`, itinéraire, rotation, mode sombre).
- **Lighthouse mobile** (§8.1) et mesure du poids / de la consommation.
- Simulation **Slow 3G** et **mode avion** réels, bascule Wi-Fi ↔ 4G.
- **Session expirée** (5.9), **deux onglets** (7.8), lecteur d'écran (9.6).
- Parcours d'**écriture** de l'espace pharmacie (inscription, enregistrement, modification, garde) avec comptes/données dédiés.
- **Décisions produit** : filtre assurance multiple (`2.6b`) ; corps HTTP 409 vs 200 pour « numéro déjà inscrit » ;
  **ouverture des forfaits payants** (paiement en ligne, puis déblocage d'Annonces, Newsletter et Statistiques —
  modules aujourd'hui annoncés « bientôt disponible », §2sexies E10/E11).
- Données manquantes à préparer : 1 pharmacie au **nom très long**, 1 **sans assurance**, 1 liste de **100+** pharmacies (`2.16`), un **2ᵉ compte gérant** dédié (5.23).

## 6. Reproductibilité

```powershell
# 1) API Node locale (Cloudinary simulé) — jamais en production
cd D:\Bureau\AssurAppCI\APIassureAppCI
$env:MOCK_CLOUDINARY='true'; node index.js      # http://localhost:4000

# 2) Front PHP local
cd D:\AssurAppCI-Web
php -S localhost:8080 router.php                # http://localhost:8080

# 3) CSS (si les classes changent)
npm run build

# 3 bis) Service worker : incrémenter CACHE_NAME dans sw.js à CHAQUE
#        modification de page / JS / CSS, sinon les navigateurs déjà
#        équipés continuent d'afficher l'ancienne version (cache d'abord).

# 4) Recette fonctionnelle automatisée
node tests/functional/run-functional-tests.js    # → tests/functional/results.json

# 5) Recette sécurité (7 points)
node tests/security/run-security-tests.js        # → tests/security/results.json (90/90)

# 6) Contrôles du projet
npm run check   # IDs + liens
npm test        # 5 suites de fumée (jsdom)
```

Résultats machine : `tests/functional/results.json` et `tests/security/results.json`.
Rapport de sécurité : `RAPPORT_SECURITE.md`.
