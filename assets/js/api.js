/* Client HTTP et gestion de session. */

class ApiError extends Error {
  constructor(message, status = 0, payload = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

const Api = (() => {
  /* Délai maximal d'attente d'une réponse. Configurable via
     window.GOPHARMA_API_TIMEOUT_MS (tests) — 15 s par défaut. */
  const TIMEOUT_MS =
    (typeof window !== 'undefined' && Number(window.GOPHARMA_API_TIMEOUT_MS)) || 15000;

  function buildUrl(path, query) {
    const base = CONFIG.API_BASE_URL.replace(/\/$/, '');
    const url = new URL(base + path, window.location.href);
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.set(key, value);
        }
      });
    }
    return url.toString();
  }

  async function request(method, path, { body, query, form } = {}) {
    const init = { method, headers: { Accept: 'application/json' } };

    if (form) {
      init.body = form;
    } else if (body !== undefined) {
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(body);
    }

    const token = Session.token();
    if (token) init.headers.Authorization = `Bearer ${token}`;

    const controleur = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const minuteur = controleur ? setTimeout(() => controleur.abort(), TIMEOUT_MS) : null;
    if (controleur) init.signal = controleur.signal;

    let response;
    try {
      response = await fetch(buildUrl(path, query), init);
    } catch (err) {
      if (err && err.name === 'AbortError') {
        throw new ApiError('Le serveur met trop de temps à répondre. Vérifiez votre connexion puis réessayez.', 0, null);
      }
      throw new ApiError('Impossible de joindre le serveur. Vérifiez votre connexion puis réessayez.', 0, null);
    } finally {
      if (minuteur) clearTimeout(minuteur);
    }

    const text = await response.text();
    let payload = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch (err) {
        payload = { message: text.slice(0, 200) };
      }
    }

    if (!response.ok) {
      const message =
        (payload && (payload.message || payload.error)) ||
        `Le serveur a répondu avec le statut ${response.status}.`;
      throw new ApiError(message, response.status, payload);
    }

    return payload;
  }

  return {
    get: (path, query) => request('GET', path, { query }),
    post: (path, body) => request('POST', path, { body }),
    put: (path, body) => request('PUT', path, { body }),
    del: (path, query) => request('DELETE', path, { query }),
    send: (path, form) => request('POST', path, { form }),
    update: (path, form) => request('PUT', path, { form }),
  };
})();

const Session = (() => {
  function read() {
    try {
      // Transition : la session est stockée dans sessionStorage. On lit aussi
      // l'ancienne clé localStorage (sessions existantes) puis on migre et on
      // la supprime, pour ne plus rien laisser traîner dans localStorage.
      const raw =
        sessionStorage.getItem(CONFIG.SESSION_KEY) ||
        localStorage.getItem(CONFIG.SESSION_KEY);
      if (!raw) return null;
      if (!sessionStorage.getItem(CONFIG.SESSION_KEY)) {
        sessionStorage.setItem(CONFIG.SESSION_KEY, raw);
      }
      localStorage.removeItem(CONFIG.SESSION_KEY);
      return JSON.parse(raw);
    } catch (err) {
      return null;
    }
  }

  function write(data) {
    sessionStorage.setItem(CONFIG.SESSION_KEY, JSON.stringify(data));
    // Aucune copie ne doit subsister dans localStorage.
    localStorage.removeItem(CONFIG.SESSION_KEY);
  }

  return {
    get: read,
    token() {
      const s = read();
      return s && s.jwt ? s.jwt : null;
    },
    code() {
      const s = read();
      return s ? s.codeUtilisateur : null;
    },
    save(data) {
      write(data);
    },
    patch(partial) {
      const s = read() || {};
      write(Object.assign({}, s, partial));
    },
    clear() {
      // Efface la clé dans les DEUX stockages (sessionStorage cible +
      // localStorage hérité) pour couvrir la période de transition.
      sessionStorage.removeItem(CONFIG.SESSION_KEY);
      localStorage.removeItem(CONFIG.SESSION_KEY);
    },
    require() {
      const s = read();
      if (!s || !s.codeUtilisateur) {
        window.location.replace('/connexion');
        return null;
      }
      return s;
    },
  };
})();

/* Endpoints du module pharmacie. */
const Endpoints = {
  connexion: '/utilisateur/connexion',
  inscription: '/utilisateur/inscription',
  profilPharmacie: '/pharmacie/profilPharmacie',
  ajouterPharmacie: '/pharmacie/ajouterPharmacie',
  assurances: '/assurance',
  modifierGarde: '/pharmacie/modifierstatutgarde',
  modifierPharmacie: '/pharmacie/modifierpharmacie',
  pharmacies: '/pharmacie',
  rechercherPharmacies: '/pharmacie/rechercher',
  uploadPhoto: '/pharmacie/upload-photo',
  forfaits: '/abonnements/forfaits',
  abonnementActif: '/abonnements/actif',
  historique: '/abonnements/historique',
  souscrire: '/abonnements/souscrire',
  verifierAcces: '/abonnements/verifier-acces',
  utilisation: '/abonnements/utilisation',
  limites: '/abonnements/limites',
  annonces: '/annonces/pharmacie',
  envoyerAnnonce: '/annonces/envoyer',
  supprimerAnnonce: '/annonces',
  abonnesNewsletter: '/newsLetters/abonnement',
  envoyerNewsletter: '/newsletters/envoyer',
};
