/*!
 * GoPharma — Harnais de tests de sécurité (réexécutable en une commande)
 * Cibles : API Node locale (http://localhost:4000) + front PHP local (http://localhost:8080) + MySQL locale.
 * RÈGLES : jamais de production, jamais de vrais secrets, force brute ≤ 30 essais, écritures uniquement en base locale.
 *
 * Usage : node tests/security/run-security-tests.js
 * Sortie : console + tests/security/results.json
 *
 * PRÉ-REQUIS pour le test d'upload de bout en bout (chemin nominal -> 201) :
 * l'API Node doit tourner avec le mock Cloudinary local :
 *     $env:MOCK_CLOUDINARY='true' ; node index.js      (PowerShell)
 * Sans cette variable, le test d'image valide est marqué BLOQUÉ (aucun appel
 * Cloudinary distant n'est jamais effectué depuis ce harnais).
 */

'use strict';

const http = require('http');
const https = require('https');
const { URL } = require('url');
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const REQUEST_DELAY_MS = 400;

// 127.0.0.1 (et non « localhost ») : nécessaire pour pouvoir forcer une IP
// source loopback distincte lors du test de force brute (isolation du quota).
const API_NODE_URL = `http://127.0.0.1:4000`;
// Front PHP local (pages pharmacies.php, carte.php, ...).
// Remarque : il n'y a plus d'API PHP (/api) dans ce dépôt ; le front appelle
// l'API Node ci-dessus. L'URL sert uniquement aux tests XSS via Playwright.
// Surchargeable par BASE_URL si un autre logiciel occupe le port 8080.
const API_PHP_URL  = process.env.BASE_URL || `http://localhost:8080`;

const DB = {
  host: `localhost`,
  port: 3306,
  user: `root`,
  password: ``,
  database: `assurappci`,
};

const DB_HOST_AFFICHE = DB.host + `:` + DB.port + ` / ` + DB.database;

function assertLocal(urlStr, label) {
  try {
    const u = new URL(urlStr);
    const host = u.hostname.toLowerCase();
    const isLocal = host === `localhost` || host === `127.0.0.1` || host === `::1`;
    if (!isLocal) {
      console.error(`GARDE-FOU : ` + label + ` pointe vers ` + host + ` (non local). ARRET.`);
      process.exit(2);
    }
    if (u.protocol !== `http:`) {
      console.error(`GARDE-FOU : ` + label + ` utilise ` + u.protocol + ` (pas http local). ARRET.`);
      process.exit(2);
    }
  } catch (e) {
    console.error(`GARDE-FOU : URL invalide pour ` + label + ` : ` + urlStr);
    process.exit(2);
  }
}

assertLocal(API_NODE_URL, `API Node`);
assertLocal(API_PHP_URL,  `API PHP`);

console.log(`=== Garde-fous OK : cibles locales uniquement ===`);
console.log(`Hôte de base : ` + DB_HOST_AFFICHE);

/* ========================================================================
   1. UTILITAIRES HTTP
   ======================================================================== */

function request(method, urlStr, headers, body, contentType, options) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const opts = {
      hostname: u.hostname,
      port: u.port || (u.protocol === `https:` ? 443 : 80),
      path: u.pathname + u.search,
      method: method,
      headers: headers || {},
      timeout: 10000,
    };
    if (options && options.localAddress) opts.localAddress = options.localAddress;
    let payload = null;
    if (body !== undefined && body !== null) {
      if (typeof body === `string`) {
        payload = body;
      } else if (Buffer.isBuffer(body)) {
        payload = body;
      } else {
        payload = JSON.stringify(body);
      }
      if (contentType) {
        opts.headers[`Content-Type`] = contentType;
      } else if (!Buffer.isBuffer(body)) {
        opts.headers[`Content-Type`] = `application/json`;
      }
      opts.headers[`Content-Length`] = Buffer.byteLength(payload);
    }
    const req = (u.protocol === `https:` ? https : http).request(opts, (res) => {
      let data = ``;
      res.on(`data`, (chunk) => { data += chunk; });
      res.on(`end`, () => {
        let parsed = null;
        try { parsed = data ? JSON.parse(data) : null; } catch (_) { parsed = { _raw: data }; }
        resolve({ status: res.statusCode, headers: res.headers, body: parsed, _raw: data });
      });
    });
    req.on(`error`, (e) => reject(e));
    req.on(`timeout`, () => { req.destroy(new Error(`timeout`)); });
    if (payload !== null) req.write(payload);
    req.end();
  });
}

function get(urlStr, headers, options) { return request(`GET`, urlStr, headers, undefined, undefined, options); }
function post(urlStr, body, headers, contentType, options) { return request(`POST`, urlStr, headers, body, contentType, options); }
function put(urlStr, body, headers, contentType) { return request(`PUT`, urlStr, headers, body, contentType); }
function del(urlStr, body, headers) { return request(`DELETE`, urlStr, headers, body); }

function authHeader(token) {
  return token ? { Authorization: `Bearer ` + token } : {};
}

// IP source loopback distincte par exécution pour les appels à /connexion :
// le limiteur dédié étant indexé par IP, cela isole son quota et garantit que
// le harnais reste réexécutable (aucune IP légitime ne reste bloquée).
const IP_CONNEXION = `127.0.0.` + (2 + Math.floor(Math.random() * 118));
const IP_FORCE_BRUTE = `127.0.0.` + (130 + Math.floor(Math.random() * 118));

function tronquer(s, max = 200) {
  if (s === null || s === undefined) return `null`;
  s = String(s);
  if (!s.includes(`password`) && !s.includes(`token`) && !s.includes(`secret`) && !s.includes(`jwt`)) {
    return s.length > max ? s.substring(0, max) + `…` : s;
  }
  return `[masqué]`;
}

/* ========================================================================
   2. UTILITAIRES BASE DE DONNÉES
   ======================================================================== */

let dbConn = null;

async function getDb() {
  if (!dbConn) {
    dbConn = await mysql.createConnection(DB);
  }
  return dbConn;
}

async function countRows(table) {
  const conn = await getDb();
  const [r] = await conn.execute(`SELECT COUNT(*) AS n FROM \`${table}\``);
  return r[0].n;
}

async function tableExists(table) {
  const conn = await getDb();
  const [r] = await conn.execute(
    `SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = ? AND table_name = ?`,
    [DB.database, table]
  );
  return r[0].n > 0;
}

async function selectOne(sql, params) {
  const conn = await getDb();
  const [r] = await conn.execute(sql, params);
  return r[0] || null;
}

/* ========================================================================
   3. RÉSULTATS
   ======================================================================== */

const results = [];
let total = 0;
let okCount = 0;
let failCount = 0;
let blockedCount = 0;

function t(name, status, preuve, gravite, detail) {
  total++;
  const r = {
    name: name,
    status: status,
    preuve: preuve || ``,
    gravite: gravite || `non évalué`,
    detail: detail || ``,
  };
  results.push(r);
  if (status === `OK`) okCount++;
  else if (status === `FAIL`) failCount++;
  else if (status === `BLOQUÉ`) blockedCount++;
  const pad = (s) => s + ` `.repeat(Math.max(0, 62 - s.length));
  console.log(`[` + status.padEnd(8) + `] ` + pad(name) + (preuve ? ` — ` + preuve : ``));
}

/* ========================================================================
   4. DONNÉES DE TEST (tout en SQL, base locale)
   ======================================================================== */

const gerantA = {
  code_utilisateur: `USER_SEC_A`,
  nomUtilisateur: `SEC_GERANT_A`,
  prenomUtilisateur: `Alice`,
  numeroUtilisateur: `0705050505`,
  codePinUtilisateur: `123456`,
  type_utilisateur: `Gestionnaire de pharmacie`,
  ville_utilisateur: `Abidjan`,
  adresseUtilisateur: `Zone A Test`,
};
const gerantB = {
  code_utilisateur: `USER_SEC_B`,
  nomUtilisateur: `SEC_GERANT_B`,
  prenomUtilisateur: `Bob`,
  numeroUtilisateur: `0706060606`,
  codePinUtilisateur: `654321`,
  type_utilisateur: `Gestionnaire de pharmacie`,
  ville_utilisateur: `Abidjan`,
  adresseUtilisateur: `Zone B Test`,
};

// Identité UNIQUE par exécution pour le test d'upload de bout en bout :
// évite « Vous êtes déjà gérant d'une pharmacie active » (code_gerant unique)
// et le doublon de nom (nom_pharmacie unique). Le code_pharmacie est généré
// par l'API elle-même, donc unique lui aussi.
const RUN_ID = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const CODE_GERANT_UPLOAD = `USER_UP_` + RUN_ID;
const NUMERO_UPLOAD = `07` + String(Date.now() % 100000000).padStart(8, `0`);
const NOM_PHARMACIE_UPLOAD = `Pharmacie Upload ` + RUN_ID;
const gerantUpload = {
  code_utilisateur: CODE_GERANT_UPLOAD,
  nomUtilisateur: `SEC_UPLOAD`,
  prenomUtilisateur: `Ulrich`,
  numeroUtilisateur: NUMERO_UPLOAD,
  codePinUtilisateur: `112233`,
  type_utilisateur: `Gestionnaire de pharmacie`,
  ville_utilisateur: `Abidjan`,
  adresseUtilisateur: `Zone Upload Test`,
};

let tokenA = null;
let tokenB = null;
let tokenUpload = null;
let codePharmacieA = null;
let codePharmacieB = null;

const PAYLOAD_XSS = `<img src=x onerror=alert(1)>`;

/**
 * Supprime les assurances de test laissées par un run précédent (payload XSS,
 * nom vide) ainsi que leurs liens avec des pharmacies. Sans cela, la liste
 * d'assurances du front se remplit de doublons malveillants à chaque exécution.
 * Base locale uniquement (le harnais refuse toute cible distante).
 *
 * `inclureSecurite` supprime aussi `NSIA_Securite` : à réserver au nettoyage
 * initial, une fois les gérants de test supprimés (sinon la clé étrangère
 * `utilisateurs.id_assurance` pointerait dans le vide).
 */
async function nettoyerAssurancesTest(conn, { inclureSecurite = false } = {}) {
  const noms = inclureSecurite ? [PAYLOAD_XSS, ``, `NSIA_Securite`] : [PAYLOAD_XSS, ``];
  const marques = noms.map(() => `?`).join(`, `);
  await conn.execute(
    `DELETE FROM pharmacie_assurance WHERE id_assurance IN (SELECT id_assurance FROM assurances WHERE nom_assurance IN (${marques}))`,
    noms
  );
  await conn.execute(
    `DELETE FROM assurances WHERE nom_assurance IN (${marques})`,
    noms
  );
}

async function insererDonneesTest() {
  console.log(`\n--- Insertion SQL des données de test (base locale) ---`);
  const conn = await getDb();

  await conn.execute(`SET FOREIGN_KEY_CHECKS = 0`);
  await conn.execute(`DELETE FROM utilisateur_gerant WHERE code_utilisateur IN (?, ?)`, [gerantA.code_utilisateur, gerantB.code_utilisateur]);
  await conn.execute(`DELETE FROM utilisateurs WHERE code_utilisateur IN (?, ?)`, [gerantA.code_utilisateur, gerantB.code_utilisateur]);
  await conn.execute(`DELETE FROM adresse_utilisateur WHERE id_adresse IN (?, ?)`, [90001, 90002]);

  // Nettoyage (best-effort) des données d'upload créées par un run précédent.
  const [pharmUp] = await conn.execute(`SELECT code_pharmacie FROM pharmacie WHERE nom_pharmacie LIKE 'Pharmacie Upload %'`);
  for (const row of pharmUp) {
    const cp = row.code_pharmacie;
    await conn.execute(`DELETE FROM pharmacie_assurance WHERE code_pharmacie = ?`, [cp]);
    await conn.execute(`DELETE FROM horaires_ouverture WHERE code_pharmacie = ?`, [cp]);
    await conn.execute(`DELETE FROM utilisateur_gerant WHERE code_pharmacie = ?`, [cp]);
    await conn.execute(`DELETE FROM adresse_pharmacie WHERE code_pharmacie = ?`, [cp]);
    await conn.execute(`DELETE FROM pharmacie WHERE code_pharmacie = ?`, [cp]);
  }
  await conn.execute(`DELETE FROM adresse_utilisateur WHERE code_utilisateur LIKE 'USER_UP_%'`);
  await conn.execute(`DELETE FROM utilisateurs WHERE code_utilisateur LIKE 'USER_UP_%'`);

  await nettoyerAssurancesTest(conn, { inclureSecurite: true });

  await conn.execute(`INSERT IGNORE INTO villes (nom_ville) VALUES (?)`, [`Abidjan`]);
  const [villeRow] = await conn.execute(`SELECT id_ville FROM villes WHERE nom_ville = 'Abidjan' LIMIT 1`);
  const idVille = villeRow[0].id_ville;

  await conn.execute(`INSERT IGNORE INTO type_utilisateur (libelle_type_utilisateur) VALUES (?)`, [`Gestionnaire de pharmacie`]);
  const [tuRow] = await conn.execute(`SELECT id_type_utilisateur FROM type_utilisateur WHERE libelle_type_utilisateur = 'Gestionnaire de pharmacie' LIMIT 1`);
  const idTypeGerant = tuRow[0].id_type_utilisateur;

  await conn.execute(`INSERT IGNORE INTO statut (libelle_statut) VALUES (?)`, [`Actif`]);
  const [stRow] = await conn.execute(`SELECT id_statut FROM statut WHERE libelle_statut = 'Actif' LIMIT 1`);
  const idStatut = stRow[0].id_statut;

  await conn.execute(
    `INSERT IGNORE INTO assurances (nom_assurance, id_statut) VALUES (?, ?)`,
    [`NSIA_Securite`, idStatut]
  );
  await conn.execute(
    `INSERT IGNORE INTO assurances (nom_assurance, id_statut) VALUES (?, ?)`,
    [PAYLOAD_XSS, idStatut]
  );
  const [assRow] = await conn.execute(`SELECT id_assurance FROM assurances WHERE nom_assurance = 'NSIA_Securite' LIMIT 1`);
  const idAssurance = assRow[0].id_assurance;

  await conn.execute(
    `INSERT IGNORE INTO utilisateurs (code_utilisateur,nom_utilisateur,prenom_utilisateur,numeros_utilisateur,password_hash,id_type_utilisateur,id_assurance,id_adresse) VALUES (?,?,?,?,?,?,?,?)`,
    [gerantA.code_utilisateur, gerantA.nomUtilisateur, gerantA.prenomUtilisateur, gerantA.numeroUtilisateur, gerantA.codePinUtilisateur, idTypeGerant, idAssurance, 90001]
  );
  await conn.execute(
    `INSERT IGNORE INTO utilisateurs (code_utilisateur,nom_utilisateur,prenom_utilisateur,numeros_utilisateur,password_hash,id_type_utilisateur,id_assurance,id_adresse) VALUES (?,?,?,?,?,?,?,?)`,
    [gerantB.code_utilisateur, gerantB.nomUtilisateur, gerantB.prenomUtilisateur, gerantB.numeroUtilisateur, gerantB.codePinUtilisateur, idTypeGerant, idAssurance, 90002]
  );

  await conn.execute(
    `INSERT IGNORE INTO adresse_utilisateur (id_adresse, code_utilisateur, latitude, longitude, adresse_fournit, id_ville) VALUES (?, ?, 5.3, -4.0, ?, ?)`,
    [90001, gerantA.code_utilisateur, gerantA.adresseUtilisateur, idVille]
  );
  await conn.execute(
    `INSERT IGNORE INTO adresse_utilisateur (id_adresse, code_utilisateur, latitude, longitude, adresse_fournit, id_ville) VALUES (?, ?, 5.4, -4.1, ?, ?)`,
    [90002, gerantB.code_utilisateur, gerantB.adresseUtilisateur, idVille]
  );

  await conn.execute(`UPDATE utilisateurs SET id_adresse = ? WHERE code_utilisateur = ?`, [90001, gerantA.code_utilisateur]);
  await conn.execute(`UPDATE utilisateurs SET id_adresse = ? WHERE code_utilisateur = ?`, [90002, gerantB.code_utilisateur]);

  // Gérant DÉDIÉ au test d'upload (volontairement sans pharmacie : il peut donc
  // en créer une sans tomber sur « déjà gérant d'une pharmacie active »).
  await conn.execute(
    `INSERT IGNORE INTO utilisateurs (code_utilisateur,nom_utilisateur,prenom_utilisateur,numeros_utilisateur,password_hash,id_type_utilisateur,id_assurance,id_adresse) VALUES (?,?,?,?,?,?,?,?)`,
    [gerantUpload.code_utilisateur, gerantUpload.nomUtilisateur, gerantUpload.prenomUtilisateur, gerantUpload.numeroUtilisateur, gerantUpload.codePinUtilisateur, idTypeGerant, idAssurance, 90005]
  );
  await conn.execute(
    `INSERT IGNORE INTO adresse_utilisateur (id_adresse, code_utilisateur, latitude, longitude, adresse_fournit, id_ville) VALUES (?, ?, 5.35, -4.05, ?, ?)`,
    [90005, gerantUpload.code_utilisateur, gerantUpload.adresseUtilisateur, idVille]
  );
  await conn.execute(`UPDATE utilisateurs SET id_adresse = ? WHERE code_utilisateur = ?`, [90005, gerantUpload.code_utilisateur]);

  await conn.execute(
    `INSERT IGNORE INTO pharmacie (code_pharmacie, nom_pharmacie, photo_pharmacie, numeros_pharmacie, id_adresse, id_statut, email_pharmacie, est_de_garde, derniere_maj_garde) VALUES (?, ?, NULL, ?, NULL, ?, NULL, 0, NULL)`,
    [`PHARM_SEC_A`, PAYLOAD_XSS, `0700000000`, idStatut]
  );
  await conn.execute(
    `INSERT IGNORE INTO pharmacie (code_pharmacie, nom_pharmacie, photo_pharmacie, numeros_pharmacie, id_adresse, id_statut, email_pharmacie, est_de_garde, derniere_maj_garde) VALUES (?, ?, NULL, ?, NULL, ?, NULL, 0, NULL)`,
    [`PHARM_SEC_B`, `Pharmacie B Test`, `0700000001`, idStatut]
  );

  await conn.execute(
    `INSERT IGNORE INTO adresse_pharmacie (id_adresse, code_pharmacie, latitude, longitude, adresse_fournit, id_ville) VALUES (?, ?, 5.3, -4.0, ?, ?)`,
    [90003, `PHARM_SEC_A`, PAYLOAD_XSS, idVille]
  );
  await conn.execute(
    `INSERT IGNORE INTO adresse_pharmacie (id_adresse, code_pharmacie, latitude, longitude, adresse_fournit, id_ville) VALUES (?, ?, 5.4, -4.1, ?, ?)`,
    [90004, `PHARM_SEC_B`, `1234 Rue B`, idVille]
  );

  await conn.execute(`UPDATE pharmacie SET id_adresse = ? WHERE code_pharmacie = ?`, [90003, `PHARM_SEC_A`]);
  await conn.execute(`UPDATE pharmacie SET id_adresse = ? WHERE code_pharmacie = ?`, [90004, `PHARM_SEC_B`]);

  await conn.execute(
    `INSERT IGNORE INTO horaires_ouverture (code_pharmacie, en_semaine, samedi, dimanche) VALUES (?, ?, ?, ?)`,
    [`PHARM_SEC_A`, `08:00-20:00`, `08:00-14:00`, `Fermée`]
  );
  await conn.execute(
    `INSERT IGNORE INTO horaires_ouverture (code_pharmacie, en_semaine, samedi, dimanche) VALUES (?, ?, ?, ?)`,
    [`PHARM_SEC_B`, `08:00-20:00`, `08:00-14:00`, `Fermée`]
  );

  if (idAssurance) {
    await conn.execute(`INSERT IGNORE INTO pharmacie_assurance (code_pharmacie, id_assurance) VALUES (?, ?)`, [`PHARM_SEC_A`, idAssurance]);
  }

  await conn.execute(
    `INSERT IGNORE INTO utilisateur_gerant (code_utilisateur, code_pharmacie, id_statut) VALUES (?, ?, ?)`,
    [gerantA.code_utilisateur, `PHARM_SEC_A`, idStatut]
  );
  await conn.execute(
    `INSERT IGNORE INTO utilisateur_gerant (code_utilisateur, code_pharmacie, id_statut) VALUES (?, ?, ?)`,
    [gerantB.code_utilisateur, `PHARM_SEC_B`, idStatut]
  );

  await conn.execute(`SET FOREIGN_KEY_CHECKS = 1`);

  codePharmacieA = `PHARM_SEC_A`;
  codePharmacieB = `PHARM_SEC_B`;

  t(`Insertion SQL données de test`, `OK`, `Pharmacie A=` + codePharmacieA + `, Pharmacie B=` + codePharmacieB + `, Gérants A=` + gerantA.code_utilisateur + `, B=` + gerantB.code_utilisateur, `Faible`);
}

// Le contrôleur de connexion renvoie le jeton dans data.jwt_tokens.
function extraireJeton(body) {
  if (!body) return null;
  return (
    body.jwt_tokens ||
    body.token ||
    body.jeton ||
    body.access_token ||
    (body.data &&
      (body.data.jwt_tokens || body.data.token || body.data.jeton || body.data.access_token)) ||
    null
  );
}

async function connexionComptes() {
  console.log(`\n--- Connexion des comptes de test (API Node) ---`);

  for (const [label, g] of [[`A`, gerantA], [`B`, gerantB]]) {
    try {
      const r = await post(API_NODE_URL + `/api/utilisateur/connexion`, {
        numeroUtilisateur: g.numeroUtilisateur,
        codePinUtilisateur: g.codePinUtilisateur,
      }, undefined, undefined, { localAddress: IP_CONNEXION });
      const corps = JSON.stringify(r.body).substring(0, 200);
      let tok = null;
      if (r.body) {
        tok = extraireJeton(r.body);
      }
      const success = r.body && r.body.success === true;

      if (!success || !tok) {
        console.error(`\nARRÊT DU RUN : aucune connexion valide pour ` + label + ` (jeton manquant).`);
        console.error(`Réponse : ` + corps);
        process.exit(1);
      }

      if (label === `A`) {
        tokenA = tok;
      } else {
        tokenB = tok;
      }
      t(`Connexion ` + label + ` (jeton)`, `OK`, `jeton récupéré`, `Faible`);
    } catch (e) {
      console.error(`\nARRÊT DU RUN : erreur de connexion ` + label + ` : ` + e.message);
      process.exit(1);
    }
  }

  // Connexion du gérant DÉDIÉ au test d'upload (non bloquante : si elle échoue,
  // le test d'upload de bout en bout sera marqué BLOQUÉ un peu plus loin).
  try {
    const r = await post(API_NODE_URL + `/api/utilisateur/connexion`, {
      numeroUtilisateur: gerantUpload.numeroUtilisateur,
      codePinUtilisateur: gerantUpload.codePinUtilisateur,
    }, undefined, undefined, { localAddress: IP_CONNEXION });
    tokenUpload = r.body ? extraireJeton(r.body) : null;
    if (tokenUpload) {
      t(`Connexion upload (gérant dédié)`, `OK`, `jeton récupéré (` + CODE_GERANT_UPLOAD + `)`, `Faible`);
    } else {
      t(`Connexion upload (gérant dédié)`, `BLOQUÉ`, `jeton non récupéré`, `Faible`);
    }
  } catch (e) {
    tokenUpload = null;
    t(`Connexion upload (gérant dédié)`, `BLOQUÉ`, `Erreur : ` + e.message, `Faible`);
  }
}

async function lireEtatPharmacie(codePharmacie) {
  const row = await selectOne(`SELECT nom_pharmacie, numeros_pharmacie, est_de_garde FROM pharmacie WHERE code_pharmacie = ?`, [codePharmacie]);
  return row;
}

async function testRoute(label, method, url, body, headers, expectedBlocked, verifierBase = false, codePharmacieVerif = null, etatAvant = null) {
  try {
    const r = await method(url, body, headers);
    const blocked = r.status === 401 || r.status === 403 || r.status === 409;
    const corps = JSON.stringify(r.body).substring(0, 200);

    let statut = `OK`;
    let preuve = `HTTP ` + r.status + ` — ` + tronquer(corps);

    if (expectedBlocked === false) {
      if (blocked) {
        statut = `FAIL`;
        preuve += ` (accès refusé inattendu)`;
      } else {
        t(label, `OK`, `HTTP ` + r.status + ` accès autorisé (attendu)`, `Faible`);
        return r;
      }
    } else {
      if (blocked) {
        preuve += ` (accès refusé — attendu)`;
        t(label, `OK`, preuve, `Faible`);
        return r;
      } else {
        statut = `FAIL`;
        preuve += ` (ACCÈS AUTORISÉ — faille)`;
      }
    }

    if (statut === `FAIL` && verifierBase && codePharmacieVerif && etatAvant) {
      const etatApres = await lireEtatPharmacie(codePharmacieVerif);
      const change = etatApres && (
        etatApres.nom_pharmacie !== etatAvant.nom_pharmacie ||
        etatApres.numeros_pharmacie !== etatAvant.numeros_pharmacie ||
        etatApres.est_de_garde !== etatAvant.est_de_garde
      );
      if (change) {
        preuve += ` | BASE MODIFIÉE (critique)`;
      } else {
        preuve += ` | base inchangée`;
      }
    }

    t(label, statut, preuve, statut === `FAIL` ? `Critique` : `Faible`);
    return r;
  } catch (e) {
    t(label, `BLOQUÉ`, `Erreur réseau : ` + e.message, `Critique`);
    return null;
  }
}

async function matriceControleAcces() {
  console.log(`\n--- Matrice de contrôle d'accès (API Node) ---`);

  const invalide = { Authorization: `Bearer token_invalide_12345` };
  const tokB = authHeader(tokenB);

  const etatPharmacieA = await lireEtatPharmacie(codePharmacieA);

  await testRoute(
    `PUT modifierpharmacie — sans jeton`,
    put, API_NODE_URL + `/api/pharmacie/modifierpharmacie`,
    { code_pharmacie: codePharmacieA, nom_pharmacie: `PHARMIE HACKÉE` }, {},
    true, true, codePharmacieA, etatPharmacieA
  );
  await testRoute(
    `PUT modifierpharmacie — jeton invalide`,
    put, API_NODE_URL + `/api/pharmacie/modifierpharmacie`,
    { code_pharmacie: codePharmacieA, nom_pharmacie: `PHARMIE HACKÉE` }, invalide,
    true, true, codePharmacieA, etatPharmacieA
  );
  await testRoute(
    `PUT modifierpharmacie — jeton B sur pharmacie A`,
    put, API_NODE_URL + `/api/pharmacie/modifierpharmacie`,
    { code_pharmacie: codePharmacieA, nom_pharmacie: `PHARMIE HACKÉE` }, tokB,
    true, true, codePharmacieA, etatPharmacieA
  );

  await testRoute(
    `PUT modifierstatutgarde — sans jeton`,
    put, API_NODE_URL + `/api/pharmacie/modifierstatutgarde`,
    { code_pharmacie: codePharmacieA, est_de_garde: true }, {},
    true, true, codePharmacieA, etatPharmacieA
  );
  await testRoute(
    `PUT modifierstatutgarde — jeton B sur pharmacie A`,
    put, API_NODE_URL + `/api/pharmacie/modifierstatutgarde`,
    { code_pharmacie: codePharmacieA, est_de_garde: true }, tokB,
    true, true, codePharmacieA, etatPharmacieA
  );

  await testRoute(
    `POST ajouterassurance — sans jeton`,
    post, API_NODE_URL + `/api/pharmacie/ajouterassurance`,
    { codePharmacie: codePharmacieA, liste_assurance: [`NSIA_Securite`] }, {},
    true
  );
  await testRoute(
    `POST ajouterassurance — jeton B sur pharmacie A`,
    post, API_NODE_URL + `/api/pharmacie/ajouterassurance`,
    { codePharmacie: codePharmacieA, liste_assurance: [`NSIA_Securite`] }, tokB,
    true
  );

  await testRoute(
    `POST profilpharmacie — sans jeton`,
    post, API_NODE_URL + `/api/pharmacie/profilpharmacie`,
    { code_gerant: gerantA.code_utilisateur }, {},
    true
  );
  await testRoute(
    `POST profilpharmacie — jeton B sur A`,
    post, API_NODE_URL + `/api/pharmacie/profilpharmacie`,
    { code_gerant: gerantA.code_utilisateur }, tokB,
    true
  );

  await testRoute(
    `POST profilutilisateur — sans jeton`,
    post, API_NODE_URL + `/api/utilisateur/profilutilisateur`,
    { code_utilisateur: gerantA.code_utilisateur }, {},
    true
  );
  await testRoute(
    `POST profilutilisateur — jeton B sur A`,
    post, API_NODE_URL + `/api/utilisateur/profilutilisateur`,
    { code_utilisateur: gerantA.code_utilisateur }, tokB,
    true
  );

  await testRoute(
    `PUT envoyerFCMT — sans jeton`,
    put, API_NODE_URL + `/api/utilisateur/envoyerFCMT`,
    { fcm_token: `fake_fcm_token`, code_utilisateur: gerantA.code_utilisateur }, {},
    true
  );
  await testRoute(
    `PUT envoyerFCMT — jeton B sur A`,
    put, API_NODE_URL + `/api/utilisateur/envoyerFCMT`,
    { fcm_token: `fake_fcm_token`, code_utilisateur: gerantA.code_utilisateur }, tokB,
    true
  );

  await testRoute(
    `PUT enovyerLocalisation — sans jeton`,
    put, API_NODE_URL + `/api/utilisateur/enovyerLocalisation`,
    { code_utilisateur: gerantA.code_utilisateur, latitude: 5.3, longitude: -4.0 }, {},
    true
  );

  await testRoute(
    `POST annonces/envoyer — sans jeton`,
    post, API_NODE_URL + `/api/annonces/envoyer`,
    { titre: `Annonce test`, contenu: `Contenu test`, code_gerant: gerantA.code_utilisateur, type_annonce: `Information` }, {},
    true
  );
  await testRoute(
    `POST annonces/envoyer — jeton B sur A`,
    post, API_NODE_URL + `/api/annonces/envoyer`,
    { titre: `Annonce test`, contenu: `Contenu test`, code_gerant: gerantA.code_utilisateur, type_annonce: `Information` }, tokB,
    true
  );

  await testRoute(
    `DELETE annonces/:id — sans jeton`,
    del, API_NODE_URL + `/api/annonces/999999`,
    { code_gerant: gerantA.code_utilisateur }, {},
    true
  );
  await testRoute(
    `DELETE annonces/:id — jeton B sur A`,
    del, API_NODE_URL + `/api/annonces/999999`,
    { code_gerant: gerantA.code_utilisateur }, tokB,
    true
  );

  await testRoute(
    `POST newsLetters/sabonner — sans jeton`,
    post, API_NODE_URL + `/api/newsLetters/sabonner`,
    { codePharmacie: codePharmacieA, codeUtilisateur: gerantA.code_utilisateur }, {},
    true
  );
  await testRoute(
    `POST newsLetters/sabonner — jeton B sur A`,
    post, API_NODE_URL + `/api/newsLetters/sabonner`,
    { codePharmacie: codePharmacieA, codeUtilisateur: gerantA.code_utilisateur }, tokB,
    true
  );
  await testRoute(
    `POST newsLetters/abonnement — sans jeton`,
    post, API_NODE_URL + `/api/newsLetters/abonnement`,
    { codeUtilisateur: gerantA.code_utilisateur }, {},
    true
  );
  await testRoute(
    `DELETE newsLetters/supprimerabonnement — sans jeton`,
    del, API_NODE_URL + `/api/newsLetters/supprimerabonnement`,
    { codePharmacie: codePharmacieA, codeUtilisateur: gerantA.code_utilisateur }, {},
    true
  );

  await testRoute(
    `POST abonnements/souscrire — sans jeton`,
    post, API_NODE_URL + `/api/abonnements/souscrire`,
    { code_gerant: gerantA.code_utilisateur, nom_forfait: `Standard`, mode_paiement: `test` }, {},
    true
  );
  await testRoute(
    `GET abonnements/actif — sans jeton`,
    get, API_NODE_URL + `/api/abonnements/actif?code_pharmacie=` + encodeURIComponent(codePharmacieA), null, {},
    true
  );
  await testRoute(
    `GET abonnements/historique — sans jeton`,
    get, API_NODE_URL + `/api/abonnements/historique/` + encodeURIComponent(codePharmacieA), null, {},
    true
  );

  await testRoute(
    `GET pharmacie/statistiques/avancees — sans jeton`,
    get, API_NODE_URL + `/api/pharmacie/statistiques/avancees/` + encodeURIComponent(codePharmacieA), null, {},
    true
  );

  await testRoute(
    `POST assurance/ajouterassurance — sans jeton`,
    post, API_NODE_URL + `/api/assurance/ajouterassurance`,
    { nom_assurance: `Assurance Test` }, {},
    true
  );
  await testRoute(
    `PUT assurance/modifierassurance — sans jeton`,
    put, API_NODE_URL + `/api/assurance/modifierassurance`,
    { id_assurance: 1, nouvelle_valeur: `Modifiée` }, {},
    true
  );
  await testRoute(
    `PUT assurance/activerassurance — sans jeton`,
    put, API_NODE_URL + `/api/assurance/activerassurance`,
    { id_assurance: 1 }, {},
    true
  );
  await testRoute(
    `PUT assurance/desactiverassurance — sans jeton`,
    put, API_NODE_URL + `/api/assurance/desactiverassurance`,
    null, {},
    true
  );

  await testRoute(
    `GET annonces/pharmacie — sans jeton`,
    get, API_NODE_URL + `/api/annonces/pharmacie?code_gerant=` + encodeURIComponent(gerantA.code_utilisateur), null, {},
    true
  );

  await testRoute(
    `GET notifications — sans jeton`,
    get, API_NODE_URL + `/api/notifications?code_utilisateur=` + encodeURIComponent(gerantA.code_utilisateur), null, {},
    true
  );
  await testRoute(
    `PUT notifications/lireNotifications — sans jeton`,
    put, API_NODE_URL + `/api/notifications/lireNotifications`,
    { code_utilisateur: gerantA.code_utilisateur, id_annonce: 1 }, {},
    true
  );
  await testRoute(
    `DELETE notifications/supprimerNotification — sans jeton`,
    del, API_NODE_URL + `/api/notifications/supprimerNotification`,
    { code_utilisateur: gerantA.code_utilisateur, id_annonce: 1 }, {},
    true
  );

  await testRoute(
    `Inscription type_utilisateur=Administrateur`,
    post, API_NODE_URL + `/api/utilisateur/inscription`,
    { nomUtilisateur: `ELEVAGE_TEST`, prenomUtilisateur: `Eve`, numeroUtilisateur: `0707070707`, codePinUtilisateur: `123456`, type_utilisateur: `Administrateur`, ville_utilisateur: `Abidjan`, adresseUtilisateur: `Zone Elevage` },
    {},
    false
  );
  await testRoute(
    `Mass assignment inscription`,
    post, API_NODE_URL + `/api/utilisateur/inscription`,
    { nomUtilisateur: `MASS_TEST`, prenomUtilisateur: `Mass`, numeroUtilisateur: `0708080808`, codePinUtilisateur: `123456`, type_utilisateur: `Client`, ville_utilisateur: `Abidjan`, adresseUtilisateur: `Zone Mass`, est_de_garde: 1, id: 99999, role: `admin`, password_hash: `injected` },
    {},
    false
  );
}

async function testsInjectionSQL() {
  console.log(`\n--- Injection SQL (Node + PHP) ---`);

  const charges = [
    `' OR '1'='1`,
    `" OR "1"="1`,
    `'; DROP TABLE utilisateurs; --`,
    `' UNION SELECT null,null,null --`,
    `admin'--`,
    `' OR 1=1 --`,
    `'; UPDATE utilisateurs SET password_hash='injected' --`,
    `\\\\`,
    `%`,
    `1' OR '1'='1' #`,
  ];

  const termeInoffensif = `ZZZ_AUCUN_RESULTAT_SECURITE`;

  let nbInoffensifNode = 0;
  try {
    const r = await get(API_NODE_URL + `/api/pharmacie/rechercher?terme_saisi=` + encodeURIComponent(termeInoffensif));
    nbInoffensifNode = (r.body && r.body.data && Array.isArray(r.body.data)) ? r.body.data.length : 0;
  } catch (e) { /* ok */ }

  for (const c of charges) {
    try {
      const r = await get(API_NODE_URL + `/api/pharmacie/rechercher?terme_saisi=` + encodeURIComponent(c));
      const raw = r._raw || ``;
      const exposeTrace = /sql syntax|sqlite|mysql|exception|stack trace/i.test(raw);
      let nbLignes = 0;
      if (r.body && r.body.data && Array.isArray(r.body.data)) nbLignes = r.body.data.length;
      const plusDeLignes = nbLignes > nbInoffensifNode;
      if (exposeTrace) {
        t(`Injection Node terme_saisi (` + c.substring(0,18) + `…`, `FAIL`, `HTTP ` + r.status + ` trace SQL exposée`, `Critique`);
      } else if (plusDeLignes) {
        t(`Injection Node terme_saisi (` + c.substring(0,18) + `…`, `FAIL`, nbLignes + ` lignes (inoffensif=` + nbInoffensifNode + `)`, `Critique`);
      } else {
        t(`Injection Node terme_saisi (` + c.substring(0,18) + `…`, `OK`, `HTTP ` + r.status + ` sans trace`, `Faible`);
      }
    } catch (e) {
      t(`Injection Node terme_saisi`, `BLOQUÉ`, `Erreur : ` + e.message, `Critique`);
    }
  }

  try {
    const debut = Date.now();
    const r = await get(API_NODE_URL + `/api/pharmacie/rechercher?terme_saisi=` + encodeURIComponent(`' OR SLEEP(3) --`));
    const duree = Date.now() - debut;
    const raw = r._raw || ``;
    const exposeTrace = /sql syntax|sqlite|mysql|exception|stack trace/i.test(raw);
    if (duree > 2500) {
      t(`Injection Node SLEEP(3)`, `FAIL`, `réponse en ` + duree + ` ms (injection temporelle possible)`, `Critique`);
    } else if (exposeTrace) {
      t(`Injection Node SLEEP(3)`, `FAIL`, `HTTP ` + r.status + ` trace SQL exposée`, `Critique`);
    } else {
      t(`Injection Node SLEEP(3)`, `OK`, `réponse en ` + duree + ` ms sans trace`, `Faible`);
    }
  } catch (e) {
    t(`Injection Node SLEEP(3)`, `BLOQUÉ`, `Erreur : ` + e.message, `Critique`);
  }

  for (const c of [`-1`, `999999999999`, `1.5`, `abc`, `' OR 1=1 --`, `0; DROP TABLE pharmacie --`]) {
    try {
      const r = await get(API_NODE_URL + `/api/pharmacie?limits=` + encodeURIComponent(c));
      const raw = r._raw || ``;
      const exposeTrace = /sql syntax|sqlite|mysql|exception|stack trace/i.test(raw);
      if (exposeTrace) {
        t(`Injection Node limits=` + c, `FAIL`, `HTTP ` + r.status + ` trace SQL exposée`, `Critique`);
      } else {
        t(`Injection Node limits=` + c, `OK`, `HTTP ` + r.status + ` sans trace`, `Faible`);
      }
    } catch (e) {
      t(`Injection Node limits=` + c, `BLOQUÉ`, `Erreur : ` + e.message, `Critique`);
    }
  }

  for (const c of charges) {
    try {
      const r = await post(API_NODE_URL + `/api/utilisateur/connexion`, {
        numeroUtilisateur: c,
        codePinUtilisateur: c,
      }, undefined, undefined, { localAddress: IP_CONNEXION });
      const raw = r._raw || ``;
      const exposeTrace = /sql syntax|sqlite|mysql|exception|stack trace/i.test(raw);
      const tok = extraireJeton(r.body);
      if (exposeTrace) {
        t(`Injection Node connexion=` + c.substring(0,18) + `…`, `FAIL`, `trace SQL exposée`, `Critique`);
      } else if (tok) {
        t(`Injection Node connexion=` + c.substring(0,18) + `…`, `FAIL`, `jeton renvoyé malgré payload`, `Critique`);
      } else {
        t(`Injection Node connexion=` + c.substring(0,18) + `…`, `OK`, `HTTP ` + r.status + ` sans trace, sans jeton`, `Faible`);
      }
    } catch (e) { /* ok */ }
  }

  // NOTE : les anciens tests d'injection visant l'API PHP locale
  // (http://localhost:8080/api/...) ont été retirés : ce dossier api/ n'existe
  // plus dans le dépôt WEB (le front appelle désormais l'API Node). Les requêtes
  // aboutissaient à une page d'erreur Xdebug « Failed to open stream ...
  // api/index.php », donc zéro rapport avec une injection SQL (faux positif).
  // Voir RAPPORT_SECURITE.md, section « API PHP retirée ».

  const tablesCritiques = [`utilisateurs`, `pharmacie`, `assurances`, `annonce`];
  const countsAvant = {};
  for (const table of tablesCritiques) {
    countsAvant[table] = await countRows(table);
  }

  let tablesOK = true;
  let countsOK = true;
  for (const table of tablesCritiques) {
    const ex = await tableExists(table);
    if (!ex) tablesOK = false;
    const countApres = await countRows(table);
    if (countApres !== countsAvant[table]) countsOK = false;
  }
  t(`Injection SQL post-DROP/UPDATE — tables intactes`, tablesOK ? `OK` : `FAIL`, tablesOK ? `toutes présentes` : `au moins une table manquante`, tablesOK ? `Faible` : `Critique`);
  t(`Injection SQL post-DROP/UPDATE — comptes de lignes inchangés`, countsOK ? `OK` : `FAIL`, countsOK ? `comptes stables` : `au moins un compte modifié`, countsOK ? `Faible` : `Critique`);
}

async function testsUpload() {
  console.log(`\n--- Upload (API Node) ---`);

  // --- Générateur de PNG réellement valide (1x1 rouge), CRC corrects ---
  const CRC_TABLE = (() => {
    const t = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }
  function chunkPng(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
    const t = Buffer.from(type, `ascii`);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
    return Buffer.concat([len, t, data, crc]);
  }
  function genererPngTémoin() {
    const zlib = require(`zlib`);
    const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(1, 0); ihdr.writeUInt32BE(1, 4);
    ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
    const idat = zlib.deflateSync(Buffer.from([0x00, 0xff, 0x00, 0x00])); // filtre 0 + RGB
    return Buffer.concat([sig, chunkPng(`IHDR`, ihdr), chunkPng(`IDAT`, idat), chunkPng(`IEND`, Buffer.alloc(0))]);
  }

  // Construit un corps multipart en Buffer (jamais de conversion en chaîne,
  // sinon les octets binaires de l'image sont corrompus).
  function buildMultipart(fields, files) {
    const boundary = `----GoPharmaBoundary` + Date.now();
    const parties = [];
    for (const [k, v] of Object.entries(fields)) {
      parties.push(Buffer.from(`--` + boundary + `\r\nContent-Disposition: form-data; name="` + k + `"\r\n\r\n` + v + `\r\n`));
    }
    for (const [k, file] of Object.entries(files)) {
      parties.push(Buffer.from(`--` + boundary + `\r\nContent-Disposition: form-data; name="` + k + `"; filename="` + file.name + `"\r\nContent-Type: ` + file.type + `\r\n\r\n`));
      parties.push(Buffer.isBuffer(file.content) ? file.content : Buffer.from(String(file.content)));
      parties.push(Buffer.from(`\r\n`));
    }
    parties.push(Buffer.from(`--` + boundary + `--\r\n`));
    return { body: Buffer.concat(parties), boundary };
  }

  const champsCommuns = {
    code_gerant: CODE_GERANT_UPLOAD,
    nom_pharmacie: NOM_PHARMACIE_UPLOAD,
    numero_pharmacie: `0700000000`,
    horaires_en_semaine: `08:00-20:00`,
    horaires_samedi: `08:00-14:00`,
    horaires_dimanche: `Fermée`,
    email_pharmacie: `test@exemple.com`,
    latitudePharmacie: `5.3`,
    longitudePharmacie: `-4.0`,
    ville_pharmacie: `Abidjan`,
    adresse_fournit: `Adresse test upload`,
    liste_assurance_accepte: JSON.stringify([`NSIA_Securite`]),
  };

  async function envoyerPhoto(fichier, token) {
    const m = buildMultipart(champsCommuns, { photo: fichier });
    const ct = `multipart/form-data; boundary=` + m.boundary;
    return post(API_NODE_URL + `/api/pharmacie/ajouterPharmacie`, m.body, authHeader(token), ct);
  }

  // Jeton valide pour les tests de rejet (le gérant dédié est préféré ; à
  // défaut on retombe sur le gérant A).
  const tokenUploadOk = tokenUpload || tokenA;

  // 1) Accès sans jeton : la route d'upload doit être protégée (JWT strict).
  try {
    const r = await envoyerPhoto({ name: `temoin.png`, type: `image/png`, content: genererPngTémoin() }, null);
    const refuse = r.status === 401 || r.status === 403;
    t(`Upload pharmacie — sans jeton`, refuse ? `OK` : `FAIL`, `HTTP ` + r.status + ` — ` + JSON.stringify(r.body).substring(0, 160), refuse ? `Faible` : `Critique`);
  } catch (e) {
    t(`Upload pharmacie — sans jeton`, `BLOQUÉ`, `Erreur : ` + e.message, `Critique`);
  }

  // 2) Fichier non-image (.txt) : le filtre Multer doit le rejeter ET répondre
  //    proprement (pas de page d'erreur HTML avec pile d'appels).
  try {
    const r = await envoyerPhoto({ name: `script.txt`, type: `text/plain`, content: Buffer.from(`du texte`) }, tokenUploadOk);
    const rejete = !(r.status === 200 || r.status === 201);
    const pageErreurBrute = /DOCTYPE html|<pre>Error:|at .*\(.*:\d+:\d+\)/i.test(r._raw || ``);
    if (!rejete) {
      t(`Upload fichier non-image (.txt) rejeté`, `FAIL`, `HTTP ` + r.status + ` — fichier accepté`, `Critique`);
    } else if (pageErreurBrute) {
      t(`Upload fichier non-image (.txt) rejeté`, `FAIL`, `HTTP ` + r.status + ` — rejeté MAIS page d'erreur HTML / pile exposée`, `Moyenne`);
    } else {
      t(`Upload fichier non-image (.txt) rejeté`, `OK`, `HTTP ` + r.status + ` — ` + JSON.stringify(r.body).substring(0, 160), `Faible`);
    }
  } catch (e) {
    t(`Upload fichier non-image (.txt) rejeté`, `BLOQUÉ`, `Erreur : ` + e.message, `Moyenne`);
  }

  // 3) Image falsifiée (.jpg dont le contenu n'est pas une image) : rejetée.
  try {
    const r = await envoyerPhoto({ name: `faux.jpg`, type: `image/jpeg`, content: Buffer.from(`Ceci est du texte, pas une image`) }, tokenUploadOk);
    const accepte = r.status === 200 || r.status === 201;
    t(`Upload faux .jpg (contenu non-image) rejeté`, accepte ? `FAIL` : `OK`, `HTTP ` + r.status + ` — ` + JSON.stringify(r.body).substring(0, 160), accepte ? `Critique` : `Faible`);
  } catch (e) {
    t(`Upload faux .jpg (contenu non-image) rejeté`, `BLOQUÉ`, `Erreur : ` + e.message, `Critique`);
  }

  // 4) Fichier vide : rejeté.
  try {
    const r = await envoyerPhoto({ name: `vide.jpg`, type: `image/jpeg`, content: Buffer.alloc(0) }, tokenUploadOk);
    const accepte = r.status === 200 || r.status === 201;
    t(`Upload fichier vide rejeté`, accepte ? `FAIL` : `OK`, `HTTP ` + r.status + ` — ` + JSON.stringify(r.body).substring(0, 160), accepte ? `Critique` : `Faible`);
  } catch (e) {
    t(`Upload fichier vide rejeté`, `BLOQUÉ`, `Erreur : ` + e.message, `Critique`);
  }

  // 5) Témoin image valide : chemin NOMINAL complet (201), via le mock
  //    Cloudinary local (MOCK_CLOUDINARY=true côté serveur). Aucun appel
  //    réseau vers Cloudinary n'est effectué.
  try {
    const sante = await get(API_NODE_URL + `/health`);
    const mockActif = !!(sante.body && sante.body.cloudinaryMock);
    if (!tokenUpload) {
      t(`Upload témoin (image valide -> 201)`, `BLOQUÉ`, `Connexion du gérant dédié impossible`, `Faible`);
    } else if (!mockActif) {
      t(`Upload témoin (image valide -> 201)`, `BLOQUÉ`, `MOCK_CLOUDINARY non actif côté serveur (relancer l'API avec MOCK_CLOUDINARY=true)`, `Faible`);
    } else {
      const r = await envoyerPhoto({ name: `temoin_` + RUN_ID + `.png`, type: `image/png`, content: genererPngTémoin() }, tokenUpload);
      const accepte = r.status === 201;
      const corps = JSON.stringify(r.body).substring(0, 220);
      t(`Upload témoin (image valide -> 201)`, accepte ? `OK` : `FAIL`,
        `HTTP ` + r.status + ` — ` + corps, accepte ? `Faible` : `Moyenne`);
    }
  } catch (e) {
    t(`Upload témoin (image valide -> 201)`, `BLOQUÉ`, `Erreur : ` + e.message, `Faible`);
  }

  // Nettoyage best-effort de la pharmacie + du gérant créés par ce test
  // (base locale uniquement), pour que le harnais reste réexécutable proprement.
  try {
    const conn = await getDb();
    await conn.execute(`SET FOREIGN_KEY_CHECKS = 0`);
    const [ph] = await conn.execute(`SELECT code_pharmacie FROM pharmacie WHERE nom_pharmacie = ?`, [NOM_PHARMACIE_UPLOAD]);
    for (const row of ph) {
      const cp = row.code_pharmacie;
      await conn.execute(`DELETE FROM pharmacie_assurance WHERE code_pharmacie = ?`, [cp]);
      await conn.execute(`DELETE FROM horaires_ouverture WHERE code_pharmacie = ?`, [cp]);
      await conn.execute(`DELETE FROM utilisateur_gerant WHERE code_pharmacie = ?`, [cp]);
      await conn.execute(`DELETE FROM adresse_pharmacie WHERE code_pharmacie = ?`, [cp]);
      await conn.execute(`DELETE FROM pharmacie WHERE code_pharmacie = ?`, [cp]);
    }
    await conn.execute(`DELETE FROM utilisateur_gerant WHERE code_utilisateur = ?`, [CODE_GERANT_UPLOAD]);
    await conn.execute(`DELETE FROM utilisateurs WHERE code_utilisateur = ?`, [CODE_GERANT_UPLOAD]);
    await conn.execute(`DELETE FROM adresse_utilisateur WHERE code_utilisateur = ?`, [CODE_GERANT_UPLOAD]);
    await conn.execute(`SET FOREIGN_KEY_CHECKS = 1`);
  } catch (e) {
    /* nettoyage best-effort, non bloquant */
  }
}

async function testRoutesPubliques() {
  console.log(`\n--- Routes publiques (sans jeton, paramètres vides/absents) ---`);

  const cibles = [
    { methode: `POST`, url: `/api/utilisateur/inscription`, body: {} },
    { methode: `POST`, url: `/api/utilisateur/connexion`, body: {} },
    { methode: `POST`, url: `/api/utilisateur/recoverPassword`, body: {} },
    { methode: `GET`, url: `/api/pharmacie/rechercher` },
    { methode: `GET`, url: `/api/pharmacie` },
    { methode: `GET`, url: `/api/assurance` },
    { methode: `GET`, url: `/api/abonnements/forfaits` },
    { methode: `GET`, url: `/api/annonces/toutes` },
  ];

  for (const c of cibles) {
    const libelle = `Route publique ` + c.methode + ` ` + c.url;
    try {
      const r = c.methode === `GET`
        ? await get(API_NODE_URL + c.url)
        : await post(API_NODE_URL + c.url, c.body || {});
      const raw = r._raw || ``;
      // « Plantage brut » = page d'erreur HTML Express ou pile d'appels exposée.
      const plantageBrut = /DOCTYPE html|<pre>Error:|at [^\n]*\([^\n]*:\d+:\d+\)/i.test(raw);
      t(libelle, plantageBrut ? `FAIL` : `OK`,
        `HTTP ` + r.status + ` — ` + raw.slice(0, 160),
        plantageBrut ? `Moyenne` : `Faible`);
    } catch (e) {
      // Aucune réponse (blocage) = défaut : une route publique doit toujours répondre.
      t(libelle, `FAIL`, `Aucune réponse / erreur : ` + e.message, `Moyenne`);
    }
  }
}

async function testStockagePIN() {
  console.log(`\n--- Stockage du PIN (base MySQL locale) ---`);
  try {
    const conn = await getDb();
    const row = await selectOne(
      `SELECT code_utilisateur, numeros_utilisateur, password_hash FROM utilisateurs WHERE numeros_utilisateur = ? LIMIT 1`,
      [gerantA.numeroUtilisateur]
    );

    if (!row) {
      t(`PIN stocké en clair ?`, `BLOQUÉ`, `Utilisateur ` + gerantA.numeroUtilisateur + ` introuvable en base`, `Critique`);
      return;
    }

    const hash = row.password_hash;
    const estClair = hash === gerantA.codePinUtilisateur;
    const ressembleBcrypt = /^\$2[abxy]\$/.test(hash || ``);

    t(`PIN stocké en clair ?`, estClair ? `FAIL` : `OK`, `valeur="` + (hash ? hash.substring(0, 40) + `…` : `NULL`) + `" bcrypt=` + (ressembleBcrypt ? `oui` : `non`), estClair ? `Critique` : `Faible`);
  } catch (e) {
    t(`PIN stocké en clair ?`, `BLOQUÉ`, `Impossible d'accéder à MySQL : ` + e.message, `Critique`);
  }
}

async function testBruteForce() {
  console.log(`\n--- Brute force (30 essais max, /connexion) ---`);
  let blocs = 0;
  const codesRecus = [];
  const numeroCible = gerantA.numeroUtilisateur;

  // IP source loopback DÉDIÉE à ce test : le limiteur dédié peut ainsi bloquer
  // les essais sans jamais bloquer les connexions légitimes du harnais, ce qui
  // garantit que le harnais reste réexécutable (le quota est isolé par IP).
  const ipForceBrute = IP_FORCE_BRUTE;
  console.log(`   (IP source isolée : ` + ipForceBrute + `)`);

  for (let i = 0; i < 30; i++) {
    try {
      const r = await post(API_NODE_URL + `/api/utilisateur/connexion`, {
        numeroUtilisateur: numeroCible,
        codePinUtilisateur: `000000`,
      }, undefined, undefined, { localAddress: ipForceBrute });
      codesRecus.push(r.status);
      if (r.status === 429 || r.status === 403 || /bloqué|verrou|trop|limite/i.test(r._raw || ``)) {
        blocs++;
      }
    } catch (e) {
      /* ignorer */
    }
  }

  const status429 = codesRecus.includes(429);
  const status403 = codesRecus.includes(403);
  const uniques = [...new Set(codesRecus)];

  if (blocs > 0 || status429 || status403) {
    t(`Brute force — rate-limit réagit`, `OK`, blocs + ` blocage(s) sur 30 essais`, `Faible`);
  } else {
    t(`Brute force — rate-limit réagit`, `FAIL`, `30 essais passés sans blocage (statuts : ` + uniques.join(`,`) + `)`, `Critique`);
  }
}

async function testErreursProduction() {
  console.log(`\n--- Erreurs (pas de stack trace) ---`);

  try {
    const r = await post(API_NODE_URL + `/api/utilisateur/inscription`, {
      nomUtilisateur: 12345,
      numeroUtilisateur: null,
    });
    const raw = r._raw || ``;
    const exposeTrace = /at Object\.|at Function\.|require\(|node_modules|Error:\s/i.test(raw);
    t(`Inscription invalide — pas de stack trace (Node)`, exposeTrace ? `FAIL` : `OK`, `HTTP ` + r.status + ` ` + (exposeTrace ? `trace exposée` : `réponse propre`), exposeTrace ? `Moyenne` : `Faible`);
  } catch (e) {
    t(`Inscription invalide`, `BLOQUÉ`, `Erreur : ` + e.message, `Moyenne`);
  }

  // Le test « PHP profilpharmacie » a été retiré : l'API PHP locale n'existe
  // plus (dossier api/ supprimé). Voir la note dans testsInjectionSQL().
}

async function testXSSPlaywright() {
  console.log(`\n--- XSS (Playwright, écrans PHP) ---`);

  let playwright;
  try {
    playwright = require(`playwright`);
  } catch (e) {
    t(`XSS Playwright — liste/carte/dashboard/inscription/connexion`, `BLOQUÉ`, `Playwright non installé (npm install playwright requis)`, `Critique`);
    return;
  }

  const pages = [
    { url: `${API_PHP_URL}/pharmacies.php`, label: `Liste pharmacies` },
    { url: `${API_PHP_URL}/carte.php`, label: `Carte` },
    { url: `${API_PHP_URL}/dashboard.php`, label: `Dashboard` },
    { url: `${API_PHP_URL}/inscription.php`, label: `Inscription` },
    { url: `${API_PHP_URL}/connexion.php`, label: `Connexion` },
  ];

  const browser = await playwright.chromium.launch({ headless: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  await context.route('**/*.{woff,woff2,ttf,otf,eot}', route => route.abort());
  await context.route('https://fonts.googleapis.com/**', route => route.abort());
  await context.route('https://fonts.gstatic.com/**', route => route.abort());

  for (const p of pages) {
    const page = await context.newPage();
    let dialogueOuvert = false;
    let baliseNonEchappee = false;
    page.on(`dialog`, () => { dialogueOuvert = true; });
    try {
      await page.goto(p.url, { waitUntil: `domcontentloaded`, timeout: 8000 });
      const html = await page.content();
      baliseNonEchappee = html.includes(PAYLOAD_XSS);
    } catch (err) {
      t(`XSS Playwright ` + p.label, `BLOQUÉ`, `Erreur navigation : ` + err.message, `Critique`);
      await page.close();
      continue;
    }
    const echoue = dialogueOuvert || baliseNonEchappee;
    t(`XSS Playwright ` + p.label, echoue ? `FAIL` : `OK`, `dialogue=` + dialogueOuvert + ` baliseNonEchappee=` + baliseNonEchappee, echoue ? `Critique` : `Faible`);
    await page.close();
  }
  await context.close();
  await browser.close();
}

async function main() {
  try {
    assertLocal(API_NODE_URL, `API Node`);
    assertLocal(API_PHP_URL,  `API PHP`);

    await insererDonneesTest();
    await connexionComptes();
    await testRoutesPubliques();
    await matriceControleAcces();
    await testsInjectionSQL();
    await testsUpload();
    await testStockagePIN();
    await testBruteForce();
    await testErreursProduction();
    // testXSSApi() a été retiré : l'API Node renvoie du JSON (jamais du HTML).
    // Un « reflet brut » du payload dans une réponse JSON n'est pas une XSS ;
    // le seul test pertinent est le rendu réel dans les pages (Playwright).
    await testXSSPlaywright();

    // Nettoyage final : ne pas laisser les payloads XSS dans la liste des
    // assurances (ils réapparaîtraient dans le front au run suivant).
    try {
      const conn = await getDb();
      await nettoyerAssurancesTest(conn);
    } catch (e) {
      /* best-effort */
    }

    if (dbConn) await dbConn.end();

  } catch (e) {
    console.error(`ERREUR FATALE : ` + e.message);
    if (dbConn) { try { await dbConn.end(); } catch (_) {} }
    process.exit(1);
  }

  console.log(`\n==========================================`);
  console.log(`RÉSULTATS FINAUX : ` + total + ` tests | ` + okCount + ` OK | ` + failCount + ` FAIL | ` + blockedCount + ` BLOQUÉ`);
  console.log(`==========================================\n`);

  const rapport = {
    hoteBase: DB_HOST_AFFICHE,
    total: total,
    okCount: okCount,
    failCount: failCount,
    blockedCount: blockedCount,
    results: results,
  };
  fs.writeFileSync(
    path.join(__dirname, `results.json`),
    JSON.stringify(rapport, null, 2),
    `utf8`
  );
  console.log(`Rapport détaillé écrit dans tests/security/results.json`);
}

main().catch((e) => { console.error(`ERREUR FATALE : ` + e.message); process.exit(1); });