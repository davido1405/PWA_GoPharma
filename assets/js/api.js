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

  /* Renouvellement silencieux : une seule requête de refresh à la fois, même
     si plusieurs appels échouent en parallèle. */
  let rafraichissementEnCours = null;

  async function executer(method, path, { body, query, form, sansAuth } = {}) {
    const init = { method, headers: { Accept: 'application/json' } };

    if (form) {
      init.body = form;
    } else if (body !== undefined) {
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(body);
    }

    if (!sansAuth) {
      const token = Session.token();
      if (token) init.headers.Authorization = `Bearer ${token}`;
    }

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

  /* Un jeton d'accès expiré (ou absent) justifie une tentative de refresh.
     Un 403 « Accès non autorisé » (propriété d'une ressource) ne la justifie
     PAS : renouveler le jeton ne changerait rien. */
  function doitRafraichir(err) {
    if (!(err instanceof ApiError)) return false;
    if (!Session.refreshToken()) return false;
    if (err.status === 401) return true;
    return err.status === 403 && /token invalide ou expir/i.test(err.message || '');
  }

  function expirerSession() {
    Session.clear();
    try {
      if (typeof window !== 'undefined' && window.location && !/\/connexion(\.php)?$/.test(window.location.pathname)) {
        window.location.replace('/connexion?expire=1');
      }
    } catch (err) {
      /* navigation indisponible (tests) : la session est déjà effacée. */
    }
  }

  function rafraichirJeton() {
    if (rafraichissementEnCours) return rafraichissementEnCours;

    const refreshToken = Session.refreshToken();
    if (!refreshToken) return Promise.resolve({ ok: false, definitif: true });

    rafraichissementEnCours = (async () => {
      try {
        const reponse = await executer('POST', Endpoints.refresh, {
          body: { refresh_token: refreshToken },
          sansAuth: true,
        });
        const data = reponse && reponse.data ? reponse.data : reponse;
        if (!data || !data.jwt_tokens) return { ok: false, definitif: true };

        Session.patch({
          jwt: data.jwt_tokens,
          refreshToken: data.refresh_token || refreshToken,
        });
        return { ok: true };
      } catch (err) {
        const statut = err instanceof ApiError ? err.status : 0;
        // 400/401/403 : le refresh token est réellement invalide -> session
        // terminée. Réseau, 429 ou 5xx : incident passager -> on garde la
        // session et on laisse remonter l'erreur d'origine.
        const definitif = statut >= 400 && statut < 500 && statut !== 429;
        return { ok: false, definitif };
      } finally {
        rafraichissementEnCours = null;
      }
    })();

    return rafraichissementEnCours;
  }

  async function request(method, path, options = {}) {
    try {
      return await executer(method, path, options);
    } catch (err) {
      if (path === Endpoints.refresh || !doitRafraichir(err)) throw err;

      const resultat = await rafraichirJeton();

      if (resultat.ok) {
        try {
          // Rejeu unique de la requête initiale avec le nouveau jeton.
          return await executer(method, path, options);
        } catch (err2) {
          if (doitRafraichir(err2)) expirerSession();
          throw err2;
        }
      }

      if (resultat.definitif) {
        expirerSession();
        throw new ApiError(
          'Votre session a expiré. Veuillez vous reconnecter.',
          401,
          err.payload
        );
      }

      throw err;
    }
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
    refreshToken() {
      const s = read();
      return s && s.refreshToken ? s.refreshToken : null;
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
  refresh: '/utilisateur/refresh',
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
