/* Paramètres globaux de l'espace pharmacie.
 *
 * Les valeurs sont injectées par la page PHP (window.GOPHARMA_CONFIG) :
 *   env     : 'local' (API PHP + MySQL locale) ou 'prod' (API distante)
 *   apiBase : base des routes API — toujours '/api', routée par PHP
 * En file:// (hors serveur), on retombe sur l'API distante.
 */

const REMOTE_API = 'https://apiassureappci-production.up.railway.app/api';

const GOPHARMA_CONFIG = (typeof window !== 'undefined' && window.GOPHARMA_CONFIG) || {};

const CONFIG = {
  ENV: GOPHARMA_CONFIG.env || 'local',
  /* '/api' est résolu côté PHP :
     - mode local  : la route est exécutée par api/index.php (MySQL locale)
     - mode prod   : la route est relayée vers l'API distante */
  API_BASE_URL:
    GOPHARMA_CONFIG.apiBase ||
    (typeof window !== 'undefined' && window.location.protocol === 'file:' ? REMOTE_API : '/api'),
  SESSION_KEY: 'gopharma.pharmacie.session',
  TYPE_GERANT: 'Gestionnaire de pharmacie',
  MODE_PAIEMENT_DEFAUT: 'Wave',
  FONCTIONNALITES: {
    NEWSLETTER: 'NEWSLETTER',
    ANNONCES: 'ANNONCES',
    STATS_BASE: 'STATS_BASE',
    STATS_AVANCEES: 'STATS_AVANCEES',
  },
};
