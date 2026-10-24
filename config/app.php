<?php
/**
 * Configuration GoPharma — Espace pharmacie.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │ BASCULE LOCAL / PRODUCTION : un seul réglage, APP_ENV                │
 * │                                                                      │
 * │  'local' → le site appelle l'API Node du poste (API_NODE_BASE)       │
 * │  'prod'  → le site appelle l'API Railway (API_DISTANTE)              │
 * │                                                                      │
 * │ Les pages injectent window.GOPHARMA_CONFIG.apiBase : aucun autre     │
 * │ fichier n'est à modifier.                                            │
 * │                                                                      │
 * │ Filet de sécurité : si APP_ENV reste 'local' sur un hôte public      │
 * │ (déploiement non configuré), le site bascule automatiquement sur     │
 * │ l'API distante — le navigateur du visiteur n'appelle jamais son      │
 * │ propre localhost.                                                    │
 * └──────────────────────────────────────────────────────────────────────┘
 */

declare(strict_types=1);

/* ----------------------------- Bascule ---------------------------------- */
const APP_ENV    = 'local';   // 'local' | 'prod'
const APP_DEBUG  = false;     // drapeau de débogage exposé au JS — false en production

/* ------------------------ Base de données locale ------------------------ */
const BDD_HOST   = 'localhost';
const BDD_PORT   = 3306;
const BDD_NOM    = 'assurappci';
const BDD_USER   = 'root';
const BDD_PASS   = '';

/* --------------------------- API distante ------------------------------- */
const API_DISTANTE = 'https://apiassureappci-production.up.railway.app/api';

/* --------------------------- API Node locale ---------------------------- */
const API_NODE_BASE = 'http://localhost:4000/api';

/* ------------------------------ Divers ---------------------------------- */
const RACINE_PROJET = __DIR__ . '/..';
const DOSSIER_UPLOADS = RACINE_PROJET . '/assets/uploads/pharmacies';
const URL_UPLOADS = '/assets/uploads/pharmacies';

/**
 * Hôte de la requête, sans port ni crochets IPv6 (« localhost:8080 » → « localhost »).
 * Vide en ligne de commande (scripts, migrations, tests).
 */
function hote_actuel(): string
{
    $hote = (string) ($_SERVER['HTTP_HOST'] ?? $_SERVER['SERVER_NAME'] ?? '');
    $hote = strtolower(trim($hote));
    $hote = preg_replace('/:\d+$/', '', $hote) ?? $hote;

    return trim($hote, '[]');
}

/** Hôte de développement : localhost, boucle locale, réseau privé, *.local, *.test. */
function hote_est_local(string $hote): bool
{
    if ($hote === '') {
        return true; // CLI : scripts, migrations, tests
    }

    if (in_array($hote, ['localhost', '::1'], true)) {
        return true;
    }

    if (str_ends_with($hote, '.local') || str_ends_with($hote, '.test')) {
        return true;
    }

    if (str_starts_with($hote, '127.')) {
        return true;
    }

    /* Réseaux privés : test depuis un téléphone sur le même Wi-Fi. */
    if (preg_match('/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/', $hote)) {
        return true;
    }
    if (preg_match('/^192\.168\.\d{1,3}\.\d{1,3}$/', $hote)) {
        return true;
    }
    if (preg_match('/^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/', $hote)) {
        return true;
    }

    return false;
}

function est_local(): bool
{
    return APP_ENV === 'local' && hote_est_local(hote_actuel());
}

/**
 * Base de l'API consommée par le front-end.
 *
 *  - local   : API Node du poste (http://localhost:4000/api)
 *  - distant : API Railway, appelée directement par le navigateur (HTTPS),
 *              sous réserve que CORS_ALLOWED_ORIGINS contienne le domaine.
 *
 * Ne jamais renvoyer une adresse localhost à un visiteur : elle désignerait
 * SA machine, pas le serveur.
 */
function api_base(): string
{
    return est_local() ? API_NODE_BASE : API_DISTANTE;
}
