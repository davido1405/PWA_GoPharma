# GoPharma — État du projet et décision de mise en ligne

> **Date** : 24 octobre 2026 (v2 — après correctifs P0-1 / P0-2 / P0-4)
> **Périmètre** : application web `D:\AssurAppCI-Web` (front PHP/PWA) + API Node `D:\Bureau\AssurAppCI\APIassureAppCI`
> **Méthode** : vérifications locales uniquement (front PHP, API `localhost:4000`, MySQL `assurappci`). Aucune cible distante interrogée. Aucun secret affiché.
> **Rapports détaillés** : `RAPPORT_RECETTE_FONCTIONNELLE.md` (v4.4), `RAPPORT_SECURITE.md` (90/90).

---

## 1. Verdict

### ⏳ Presque — 2 bloquants restants, tous deux hors du poste local

Les trois bloquants qui dépendaient du code du front sont **corrigés et vérifiés** (§4). Il reste :

1. **l'API réellement déployée** (merge de la branche sécurité + variables Railway + CORS) ;
2. **la base de données de production** (schéma, contenu, comptes réels).

| Domaine | État | Verdict |
|---|---|---|
| Front (pages, navigation, responsive) | 0 erreur JS | ✅ OK |
| PWA (manifeste, hors ligne, mise à jour) | `gopharma-v5`, invite vérifiée | ✅ OK |
| Données affichées (plus de fictif) | Mode démo supprimé, modules verrouillés | ✅ OK |
| Sécurité applicative (code de la branche) | 90/90 | ✅ OK |
| **Configuration de production du front** | `api_base()` bascule local ⇄ Railway | ✅ **corrigé** |
| **Relais PHP `/api` fantôme** | règle morte supprimée, 404 JSON propre | ✅ **corrigé** |
| **Bascule `APP_ENV` inerte** | filet de sécurité par hôte + `est_local()` | ✅ **corrigé** |
| **API réellement déployée** | Branche sécurité non mergée dans `main` | ❌ **BLOQUANT** |
| **Base de données de production** | Non vérifiée (schéma + contenu) | ❌ **BLOQUANT** |
| Conformité (mentions légales, confidentialité) | Pages absentes | ⚠️ Avant ouverture publique |
| Exploitation (sauvegardes, supervision, versionnement) | Non en place | ⚠️ À faire |
| Produit (contenu, périmètre) | 21 pharmacies, forfait Gratuit | ⚠️ Correct pour une bêta |

---

## 2. Ce qui est prêt (avec preuves)

| # | Point | Preuve |
|---|---|---|
| 1 | **Recette fonctionnelle** | **77 vérifs / 75 OK / 0 FAIL / 2 BLOQUÉ** (`tests/functional/results.json`, exécution du 24/10) — les 2 BLOQUÉ sont nommés et expliqués au §2.1 |
| 2 | **Sécurité** | **90 tests / 90 OK / 0 FAIL / 0 BLOQUÉ** (`RAPPORT_SECURITE.md` §8) — le total est passé de 91 à 90, justification au §2.2 |
| 3 | **Smoke tests (jsdom, données simulées)** | `npm test` → exit 0 : liens/IDs, landing 12/12, connexion 12/12, **inscription 19/19**, création 20/20, **dashboard 32/32** |
| 4 | **Intégrité des liens / IDs** | `npm run check` → « Tous les liens locaux existent » |
| 5 | **Aucune erreur JavaScript** | ligne `1.2` : « aucune erreur JS » sur les 6 pages |
| 6 | **Aucune donnée fictive** | `DEMO_MODE` absent ; `demo-banner` absent ; écrans verrouillés vérifiés par le harnais |
| 7 | **Modules Annonces / Newsletter / Statistiques** | Visibles au menu, écran « bientôt disponible », accès refusé par l'API (`acces: false` pour Gratuit) |
| 8 | **Abonnement** | Plan réel (`Gratuit`, 0 FCFA), 3 forfaits affichés, boutons désactivés, aucun paiement simulé |
| 9 | **PWA** | `caches.keys()` = `['gopharma-v5']` ; `dashboard.js` en cache sans `DEMO_MODE` ; invite « Nouvelle version disponible » vérifiée |
| 10 | **Mobile** | 390 px : `overflow = 0` ; 320 px : pas de débordement |
| 11 | **Aucun secret dans le dossier web** | Pas de `.env`, pas de clé, `BDD_PASS = ''` (poste local) |
| 12 | **Photo manquante** | `PHARM001` : photo 404 → repli sur l'icône |
| 13 | **Bascule production du front** | En-tête `Host: gopharma.ci` → `apiBase: 'https://apiassureappci-production.up.railway.app/api'` |

> **Nuance sur `npm test`** : les smoke tests tournent dans jsdom avec des **réponses API simulées** (dont un forfait Standard) ; ils valident le **rendu**, pas l'état verrouillé. L'état réel est couvert par le harnais fonctionnel et les captures.

### 2.1 Les 2 vérifications BLOQUÉ (recette fonctionnelle) — nommées

Source : `tests/functional/results.json`, extraits **verbatim**.

| Ligne | Intitulé | Raison (verbatim) | Nature | Gravité pour une mise en ligne |
|---|---|---|---|---|
| **2.6b** | Filtre assurance : sélection multiple possible | « le filtre assurance est un `<select>` simple (une seule assurance à la fois) — à confirmer avec David » | **Décision produit** : le besoin « l'une **ou** l'autre / les deux » suppose une UI multi-sélection + une route de recherche adaptée | **Aucune** : le filtre simple fonctionne. C'est un manque fonctionnel attendu, pas une panne |
| **2.16** | Liste volumineuse (≥ 100 pharmacies) | « seulement 21 pharmacies en base locale — test de charge à refaire sur données réelles » | **Données manquantes** : impossible de mesurer la fluidité d'un annuaire à 100+ fiches | **Faible** : à refaire sur la base de production (cf. P0-5), avant annonce large |

Détail complet : `RAPPORT_RECETTE_FONCTIONNELLE.md`, §5 (lignes 84-85) et ligne de synthèse p. 34. Aucun des deux n'est une anomalie technique : l'un attend une décision de votre part, l'autre attend des données réelles.

### 2.2 Pourquoi le compteur sécurité est à 90 et non 91

| | Valeur |
|---|---|
| Passe vérifiée le 18/10 (rapport initial) | **91 / 91 / 0 / 0** |
| Passe actuelle (rejouée le 24/10) | **90 / 90 / 0 / 0** |
| Test disparu | **« XSS Playwright — De garde »** (le 6ᵉ écran XSS) |
| Raison | L'écran **`de-garde.php` a été supprimé** (recette, §2ter E3) ; le test a été retiré **avec sa cible** |

**Preuve de la passe actuelle** : `node tests/security/run-security-tests.js` avec `BASE_URL=http://127.0.0.1:8081`
(PHP réel, pas WildFly) → `RÉSULTATS FINAUX : 90 tests | 90 OK | 0 FAIL | 0 BLOQUÉ`.
⚠️ **Pré-requis** : l'API doit tourner avec `MOCK_CLOUDINARY=true` (cf. `RAPPORT_SECURITE.md` §0.1). Sans ce
flag, le même harnais rend **89 OK + 1 BLOQUÉ** (upload) — c'est un état d'environnement, pas une régression,
et le test BLOQUÉ est explicitement annoncé par le harnais.

**Ce n'est ni une fusion, ni le retrait d'un faux positif** : la somme des lignes du §8 de `RAPPORT_SECURITE.md` faisait 91 avec 6 tests XSS, elle fait 90 avec 5. Les 5 écrans existants (liste, carte, dashboard, inscription, connexion) sont testés et OK (`results.json`, entrées 86-90). Aucune page existante n'a perdu sa couverture.

> **Incohérence corrigée** : `RAPPORT_SECURITE.md` affichait encore « 91 / 91 / 0 / 0 », « 6/6 XSS » au §8 et « 6/6 » au résumé, alors que le harnais produisait 90. Les trois mentions sont alignées sur **90 / 5 tests XSS**, avec le journal du total.
> **Limite de traçabilité assumée** : `results.json` est écrasé à chaque exécution et le dossier web n'est pas versionné — il n'existe pas d'archive de la passe à 91. La reconstitution s'appuie sur la composition du tableau §8, la liste des écrans du §7 et le journal du §2ter.

---

## 3. Bloquants restants (P0)

### P0-3 — L'API déployée n'a probablement pas les correctifs de sécurité ❌

**Constat** : dans `D:\Bureau\AssurAppCI\APIassureAppCI`

```
* impl/securite-jwt-bcrypt      ← 13 commits d'avance
  main                         ← ne contient pas 464d182
```

`git rev-list --left-right --count main...impl/securite-jwt-bcrypt` → **`0  13`**.

**Impact** : si Railway déploie `main` (cas par défaut), la production tourne **sans** le contrôle JWT strict, sans bcrypt, sans rate-limit de connexion, avec `/docs` potentiellement exposé — alors que le 90/90 a été établi sur la branche.

**Correctif** : merger `impl/securite-jwt-bcrypt` → `main` (fast-forward possible), pousser, redéployer, puis rejouer `node tests/security/run-security-tests.js`.

**Variables d'environnement à vérifier sur Railway** :

| Variable | Valeur attendue en production | Effet si absente |
|---|---|---|
| `NODE_ENV` | `production` | Swagger exposé, CORS ouvert à toutes les origines |
| `CORS_ALLOWED_ORIGINS` | `https://votre-domaine` | `origin: false` → **toutes** les requêtes du site bloquées |
| `JWT_KEY` | secrète, longue | Signature de jeton invalide |
| `AUTH_STRICT_MODE` | absente (= strict) ou `true` | `false` = contrôle d'accès désactivé |
| `MYSQLHOST` / `MYSQLUSER` / `MYSQL_ROOT_PASSWORD` / `MYSQL_DATABASE` | base de production | API en erreur |

> ⚠️ Le `.env` local ne contient **ni** `NODE_ENV` **ni** `CORS_ALLOWED_ORIGINS` : à définir explicitement côté hébergeur.
> ⚠️ Le front appelle désormais Railway **directement** (P0-1) : sans `CORS_ALLOWED_ORIGINS`, rien ne fonctionnera.

### P0-5 — Base de données de production non vérifiée ❌

**Constat** : seul l'environnement local est connu — **21 pharmacies** (19 Abidjan, 1 Bouaké, 1 Yamoussoukro), 3 sans photo, 16 assurances.

**À vérifier côté production** : schéma importé (`assurappci.sql`), nombre de lignes, comptes réels (aucun compte de test type `0701010101`), photos accessibles.

---

## 4. Correctifs appliqués le 24/10/2026 (avant / après)

### P0-1 — `api_base()` bascule enfin selon l'environnement ✅

**Avant** (`config/app.php`) :

```php
function api_base(): string
{
    return API_NODE_BASE;   // http://localhost:4000/api — TOUJOURS
}
```

**Après** :

```php
function api_base(): string
{
    return est_local() ? API_NODE_BASE : API_DISTANTE;
}
```

**Preuve avant/après** (même requête HTTP, en-tête `Host` forcé) :

| Requête | Avant | Après |
|---|---|---|
| `Host: gopharma.ci` | `apiBase: 'http://localhost:4000/api'` | **`apiBase: 'https://apiassureappci-production.up.railway.app/api'`** |
| `Host: localhost` | `apiBase: 'http://localhost:4000/api'` | `apiBase: 'http://localhost:4000/api'` (inchangé) |

Matrice de décision vérifiée en CLI (`php -r`) :

| Hôte | `api_base()` |
|---|---|
| CLI / scripts (aucun hôte) | `http://localhost:4000/api` |
| `localhost:8080` | `http://localhost:4000/api` |
| `127.0.0.1:8080` | `http://localhost:4000/api` |
| `192.168.1.20:8080` (test téléphone Wi-Fi) | `http://localhost:4000/api` |
| `gopharma.ci` (public) | `https://apiassureappci-production.up.railway.app/api` |
| `APP_ENV = 'prod'` (même sur localhost) | `https://apiassureappci-production.up.railway.app/api` |

**Filet de sécurité** : si `APP_ENV` reste `'local'` sur un hôte public (déploiement non configuré), `est_local()` renvoie **faux** → le site appelle Railway au lieu du localhost du visiteur.

### P0-2 — Relais PHP `/api` fantôme ✅

**Avant** : `.htaccess` réécrivait `^api(/.*)?$` vers `api/index.php` (dossier inexistant) ; `router.php` faisait `require` sur un fichier absent → erreur fatale.

**Après** :
- `.htaccess` : règle morte retirée, remplacée par un commentaire explicatif ;
- `router.php` : réponse **404 JSON** explicite au lieu d'un `require` fatal.

**Preuve** : `GET http://localhost:8081/api/pharmacie` → `404 {"success":false,"message":"Cette application n'expose pas /api : elle appelle directement l'API Node (voir config/app.php)."}`

### P0-4 — Bascule `APP_ENV` / `APP_DEBUG` ✅

**Avant** : `est_local()` n'était appelée **nulle part**, `APP_DEBUG` n'était lu par aucun script → `APP_ENV` ne changeait rien.

**Après** :
- `est_local()` est le point de bascule réel (utilisé par `api_base()`) ;
- détection d'hôte : `localhost`, `127.*`, `::1`, `*.local`, `*.test`, réseaux privés `10.*`, `192.168.*`, `172.16-31.*` → local ; tout autre hôte → distant ; CLI → local ;
- `APP_DEBUG = false` par défaut.

**Rappel d'exploitation** : sur l'hébergeur, `display_errors` doit être `Off` (il vaut `1` sur le poste local).

### Bonus — harnais fonctionnel paramétrable ✅

`tests/functional/run-functional-tests.js` accepte désormais `BASE_URL` (comme les smoke tests) :

```powershell
$env:BASE_URL='http://127.0.0.1:8081'; node tests/functional/run-functional-tests.js
```

Nécessaire parce que **WildFly (Eclipse) occupait `127.0.0.1:8080`** sur le poste : le navigateur tombait sur WildFly (page « 404 - Not Found ») au lieu de GoPharma. Le serveur PHP écoutait pour sa part sur `[::1]:8080`.

> ⚠️ **Action locale recommandée** : arrêter WildFly, ou lancer GoPharma sur un autre port
> (`php -S 127.0.0.1:8081 router.php`) et ouvrir `http://127.0.0.1:8081/`.

### Non-régression après correctifs

| Contrôle | Résultat |
|---|---|
| Harnais fonctionnel | **77 vérifs / 75 OK / 0 FAIL / 2 BLOQUÉ** |
| `npm test` | exit 0 — 12/12, 12/12, 19/19, 20/20, 32/32 |
| `npm run check` | « Tous les liens locaux existent » |
| Cache PWA | `['gopharma-v5']`, `dashboard.js` sans `DEMO_MODE`, page sans `demo-banner` |
| `php -l` | aucune erreur de syntaxe (`config/app.php`, `router.php`) |

---

## 5. À faire avant une ouverture publique (P1)

| # | Point | Pourquoi | Effort |
|---|---|---|---|
| 1 | **Mentions légales + politique de confidentialité** | Absentes ; obligatoires pour un service collectant des données (Côte d'Ivoire : loi n° 2013-450) | 2–3 h |
| 2 | **En-têtes de sécurité** | `.htaccess` ne pose que `X-Content-Type-Options` ; ajouter CSP, HSTS, `X-Frame-Options`, `Referrer-Policy` | 1 h |
| 3 | **`robots.txt` + `sitemap.xml`** | Absents ; annuaire mal indexé sans sitemap | 30 min |
| 4 | **Versionnement du dossier web** | `D:\AssurAppCI-Web` n'est pas un dépôt git → aucun retour arrière | 15 min |
| 5 | **Sauvegardes MySQL** | Aucune politique définie | selon hébergeur |
| 6 | **Supervision** | Aucune alerte si l'API tombe | 1 h |
| 7 | **Photos externes** | URLs `images.unsplash.com` (une déjà en 404) → stockage propre (Cloudinary déjà branché) | à planifier |
| 8 | **Pages d'erreur 404/500** | À confirmer chez l'hébergeur | 30 min |
| 9 | **Domaine + HTTPS** | Certificat et redirection (indispensable à la PWA) | selon hébergeur |
| 10 | **Limiteur de débit global** (100 req / 15 min / IP) | Plusieurs visiteurs derrière un même NAT peuvent recevoir des 429 | 30 min |
| 11 | **Qualité perçue** | Lighthouse et test sur un vrai téléphone non réalisés | 1 h |

---

## 6. Décisions produit (1 tranchée le 24/10, 4 à trancher)

1. **Trois modules verrouillés** — ✅ **tranché le 24/10 : option A** (visibles au menu, écran « bientôt disponible »).
   Vérifié en navigateur le 24/10 : 3 entrées de menu visibles, 3 écrans d'attente affichés, contenu et boutons
   masqués, mention « aucune donnée n'est simulée », **0 erreur JS**. L'option B (masquer les entrées) est écartée.
2. **Forfait Gratuit** — Photo et Gestion des assurances sont classées Standard+ : faut-il les débloquer ? (ligne `2.6b`)
3. **Application Flutter** — l'API est en JWT **strict** : l'app mobile sans jeton sera refusée. La mettre à jour avant, ou activer temporairement `AUTH_STRICT_MODE=false` (déconseillé).
4. **Volume de l'annuaire** — 21 pharmacies : suffisant pour une bêta, faible pour un lancement public (ligne `2.16`).
5. **Paiement** — aucun paiement en ligne : à assumer dans la communication.

---

## 7. Checklist de mise en ligne

```
FAIT
 [x] 1. Front — api_base() bascule local ⇄ Railway (filet de sécurité par hôte)
 [x] 2. Front — APP_DEBUG = false, est_local() réellement utilisée
 [x] 3. Front — .htaccess : règle ^api(...)$ morte supprimée
 [x] 4. Front — CACHE_NAME sw.js : gopharma-v4 → v5
 [x] 5. Front — harnais fonctionnel paramétrable (BASE_URL) + non-régression 77/75/0/2
 [x] 5bis. Produit — modules Annonces/Newsletter/Statistiques : option A retenue
          (visibles + verrouillés), vérifiée en navigateur le 24/10 (0 erreur JS)

RESTE À FAIRE
 [ ] 6. API — merger impl/securite-jwt-bcrypt → main, pousser
 [ ] 7. API — Railway : NODE_ENV=production, CORS_ALLOWED_ORIGINS=https://<domaine>,
         JWT_KEY, identifiants MySQL de production, AUTH_STRICT_MODE absente
 [ ] 8. API — redéployer puis vérifier GET /api/pharmacie et /api/abonnements/forfaits
         depuis le navigateur (contrôle CORS réel)
 [ ] 9. API — rejouer les tests de sécurité (90/90 attendu)
 [ ]10. Base — schéma + données réelles importés, comptes pharmacie opérationnels
 [ ]11. Front — déployer en HTTPS, vérifier accueil / annuaire / carte / connexion / dashboard
 [ ]12. Front — test sur téléphone réel (installation PWA + hors ligne)
 [ ]13. Légal — mentions légales + politique de confidentialité
 [ ]14. Exploitation — sauvegarde MySQL, supervision d'uptime, dépôt git
```

**Durée estimée** : étapes 6 à 11 → **2 à 4 h** ; étapes 12 à 14 → **1/2 à 1 journée**.

---

## 8. Recommandation

**Prêt pour une bêta publique encadrée dès que P0-3 et P0-5 sont clos** :

- périmètre assumé : **annuaire + espace pharmacie gratuit** ;
- trois modules payants **visibles mais verrouillés**, aucun paiement ;
- mention « version pilote » sur l'accueil ;
- ouverture progressive (pharmacies pilotes) avant annonce large.

**Point de vigilance n°1** : le front appelle maintenant Railway **en direct**. Si `CORS_ALLOWED_ORIGINS` n'est pas configuré côté API, le site s'affichera mais restera **vide** — c'est le test de l'étape 8 qui le prouve.

---

## Annexe — Inventaire technique au 24/10/2026

| Élément | Valeur |
|---|---|
| Pages | `index.php`, `pharmacies.php`, `carte.php`, `connexion.php`, `inscription.php`, `dashboard.php` |
| Assets | `assets/css/app.css` (Tailwind compilé), 12 scripts JS, icônes PWA |
| PWA | `manifest.webmanifest`, `sw.js` (`gopharma-v5`), 2 icônes maskable |
| Backend web | `config/app.php`, `router.php` (dev), `.htaccess` (Apache) |
| Dossier `api/` | **absent** (assumé : API Node externe) |
| `.env` dans le dossier web | **absent** (aucun secret) |
| Dépôt git du dossier web | **aucun** |
| Harnais | `tests/functional/` (77 vérifs, `BASE_URL`), `tests/security/` (90 tests), `scripts/` smoke |
| Base locale | `assurappci` : 21 pharmacies (19 Abidjan, 1 Bouaké, 1 Yamoussoukro), 3 sans photo, 16 assurances |
| API Node | branche `impl/securite-jwt-bcrypt`, 13 commits devant `main` |
| Ports | API `4000` ; front `8080` (occupé par WildFly en IPv4 sur ce poste → `8081` utilisé pour les tests) |
