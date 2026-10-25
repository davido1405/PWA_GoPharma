/* Tableau de bord de l'espace pharmacie. */

(function () {
  const VIEWS = {
    accueil: { title: 'Accueil', subtitle: "Vue d'ensemble de votre pharmacie" },
    profil: { title: 'Profil pharmacie', subtitle: 'Informations, horaires et assurances' },
    annonces: { title: 'Annonces', subtitle: 'Publiez vos actualités' },
    newsletter: { title: 'Newsletter', subtitle: 'Vos abonnés' },
    statistiques: { title: 'Statistiques', subtitle: 'Annonces et newsletters' },
    abonnement: { title: 'Abonnement', subtitle: 'Forfaits et consommation' },
  };

  /* Modules dont l'ouverture dépend du forfait (vérifié auprès de l'API :
     /abonnements/verifier-acces). Aucune donnée n'est inventée côté front :
     tant que le module n'est pas ouvert, l'écran affiche une explication. */
  const ACCESS_ROUTES = {
    annonces: CONFIG.FONCTIONNALITES.ANNONCES,
    newsletter: CONFIG.FONCTIONNALITES.NEWSLETTER,
    statistiques: CONFIG.FONCTIONNALITES.STATS_BASE,
  };

  /* Écran des modules non encore ouverts (voir rendreModuleIndisponible). */
  const MODULES_FERMES = {
    annonces: {
      nom: 'Annonces',
      icone: 'megaphone',
      fonction: 'publicité des promotions, informations et urgences',
      selecteurs: { contenu: '#annonces-contenu', verrou: '#annonces-verrouille', action: '#new-annonce' },
    },
    newsletter: {
      nom: 'Newsletter',
      icone: 'mail',
      fonction: 'message envoyé aux patients abonnés',
      selecteurs: { contenu: '#newsletter-contenu', verrou: '#newsletter-verrouille', action: '#new-newsletter' },
    },
    statistiques: {
      nom: 'Statistiques',
      icone: 'chart',
      fonction: 'suivi des annonces et des abonnés',
      selecteurs: { contenu: '#stats-contenu', verrou: '#stats-verrouille-module', action: '#periode-stats' },
    },
  };

  const state = {
    session: Session.get(),
    pharmacie: null,
    abonnement: null,
    forfaits: [],
    annonces: [],
    abonnes: [],
    assurances: [],
    acces: {},
    historique: [],
    utilisation: [],
    periode: 7,
    photoSelectionnee: null,
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function setField(name, value) {
    $$(`[data-field="${name}"]`).forEach((el) => {
      el.textContent = value;
    });
  }

  function setStat(name, value) {
    $$(`[data-stat="${name}"]`).forEach((el) => {
      el.textContent = value;
    });
  }

  function hydrateIcons(root = document) {
    $$('[data-icon]', root).forEach((el) => {
      if (el.dataset.iconDone) return;
      el.innerHTML = Icons.svg(el.dataset.icon, el.className || 'h-5 w-5');
      el.dataset.iconDone = '1';
      el.classList.add('inline-flex');
    });
  }

  function initials(nom, prenom) {
    const a = (nom || '').trim().charAt(0);
    const b = (prenom || '').trim().charAt(0);
    return (a + b).toUpperCase() || 'GP';
  }

  function code() {
    return state.session ? state.session.codeUtilisateur : null;
  }

  function payloadData(reponse) {
    if (!reponse) return null;
    if (reponse.data !== undefined) return reponse.data;
    return reponse;
  }

  /* L'API renvoie tantôt un tableau, tantôt un objet d'erreur (ex.
     `{success:false, message:'…'}`) ou une liste au format texte. On normalise
     pour ne jamais appeler une méthode de tableau sur autre chose. */
  function tableau(valeur) {
    return Array.isArray(valeur) ? valeur : [];
  }

  /* Liste des assurances acceptées : tableau ou chaîne « A, B, C ». */
  function listeAssurances(pharmacie) {
    const brut =
      (pharmacie || {}).assurances_acceptees !== undefined
        ? pharmacie.assurances_acceptees
        : (pharmacie || {}).assurance_acceptees;

    if (Array.isArray(brut)) return brut.filter(Boolean);
    if (typeof brut === 'string') {
      return brut.split(',').map((nom) => nom.trim()).filter(Boolean);
    }
    return [];
  }

  /* ------------------------------ Navigation ------------------------------ */

  async function naviguer(hash) {
    const cible = (hash || '').replace('#/', '');
    const vue = VIEWS[cible] ? cible : 'accueil';

    /* L'ouverture des modules dépendants du forfait est demandée à l'API au
       premier affichage (aucune donnée n'est inventée si l'accès est refusé). */
    if (ACCESS_ROUTES[vue] && state.acces[vue] === undefined) {
      state.acces[vue] = await verifierAcces(vue, ACCESS_ROUTES[vue]);
    }

    $$('[data-view]').forEach((section) => {
      section.classList.toggle('hidden', section.dataset.view !== vue);
    });

    $$('[data-nav]').forEach((lien) => {
      lien.classList.toggle('is-active', lien.dataset.nav === vue);
    });

    $('#page-title').textContent = VIEWS[vue].title;
    $('#page-subtitle').textContent = VIEWS[vue].subtitle;

    fermerSidebar();
    appliquerOuvertureModules();

    if (vue === 'annonces') renderAnnonces();
    if (vue === 'newsletter') renderNewsletter();
    if (vue === 'abonnement') renderForfaits();
    if (vue === 'profil') renderProfil();
    if (vue === 'statistiques') renderStatistiques();

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function verifierAcces(feature, codeFonctionnalite) {
    // Le contrôle d'accès porte sur la pharmacie, pas sur l'utilisateur :
    // code_pharmacie (PHARM…) et code_utilisateur (GERANT…) sont distincts.
    if (!state.pharmacie && !state.profilEnErreur) await chargerProfil();
    const codePharmacie = state.pharmacie && state.pharmacie.code_pharmacie;
    if (!codePharmacie) {
      state.acces[feature] = false;
      return false;
    }
    try {
      const reponse = await Api.post(Endpoints.verifierAcces, {
        code_pharmacie: codePharmacie,
        code_fonctionnalite: codeFonctionnalite,
      });

      const data = reponse && reponse.data ? reponse.data : reponse;
      const acces = data && data.acces !== undefined ? data.acces : reponse.success === true;

      state.acces[feature] = acces;
      if (data && data.restant !== undefined && data.limite) {
        const badge = $(`[data-badge="${feature}"]`);
        if (badge) {
          badge.textContent = data.restant;
          badge.classList.toggle('hidden', data.restant > 2);
        }
      }
      return acces;
    } catch (err) {
      if (err.status === 403 || (err.payload && err.payload.upgrade_required)) {
        state.acces[feature] = false;
        return false;
      }
      state.acces[feature] = true;
      return true;
    }
  }

  /**
   * Affiche (une seule fois) l'écran d'un module dont le forfait actuel
   * n'ouvre pas encore l'accès. Aucune donnée n'est affichée : on explique
   * simplement ce que le module apportera.
   */
  function rendreModuleIndisponible(conteneur, vue) {
    if (!conteneur || conteneur.dataset.pret === '1') return;
    const module = MODULES_FERMES[vue] || { nom: 'Module', icone: 'star', fonction: '' };

    conteneur.innerHTML = `
      <div class="card border-dashed p-10 text-center">
        <span class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
          ${Icons.svg(module.icone, 'h-7 w-7')}
        </span>
        <h3 class="mt-5 text-lg font-semibold text-slate-900">${escapeHtml(module.nom)} : bientôt disponible</h3>
        <p class="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
          Ce module n'est pas encore ouvert sur votre forfait actuel : rien n'est affiché ici
          pour le moment, aucune donnée n'est simulée.
        </p>
        <p class="mx-auto mt-3 max-w-md text-xs leading-relaxed text-slate-400">
          Fonction prévue : ${escapeHtml(module.fonction)}.
        </p>
        <a href="#/abonnement" class="btn-ghost mt-6">Voir les forfaits</a>
      </div>`;
    conteneur.dataset.pret = '1';
  }

  /** Bascule chaque module entre son contenu réel et son écran d'attente. */
  function appliquerOuvertureModules() {
    Object.keys(MODULES_FERMES).forEach((vue) => {
      const sels = MODULES_FERMES[vue].selecteurs;
      const ouvert = state.acces[vue] === true;
      const contenu = $(sels.contenu);
      const verrou = $(sels.verrou);
      const action = $(sels.action);

      if (contenu) contenu.classList.toggle('hidden', !ouvert);
      if (action) action.classList.toggle('hidden', !ouvert);
      if (verrou) {
        verrou.classList.toggle('hidden', ouvert);
        if (!ouvert) rendreModuleIndisponible(verrou, vue);
      }
    });

    const note = $('#accueil-modules-indisponibles');
    if (note) {
      const tousOuverts = Object.keys(ACCESS_ROUTES).every((vue) => state.acces[vue] === true);
      note.classList.toggle('hidden', tousOuverts);
    }
  }

  /* ------------------------------ Chargements ----------------------------- */

  async function chargerProfil() {
    state.profilEnErreur = false;
    try {
      const reponse = await Api.post(Endpoints.profilPharmacie, { code_gerant: code() });
      state.pharmacie = payloadData(reponse);
    } catch (err) {
      state.pharmacie = null;
      state.profilEnErreur = true;
      Toast.warning('Profil pharmacie indisponible pour le moment.');
    }
  }

  async function chargerAbonnement() {
    // L'abonnement est rattaché à la pharmacie (code_pharmacie), pas au gérant.
    if (!state.pharmacie && !state.profilEnErreur) await chargerProfil();
    const codePharmacie = state.pharmacie && state.pharmacie.code_pharmacie;
    if (!codePharmacie) {
      state.abonnement = null;
      return;
    }
    try {
      const reponse = await Api.get(Endpoints.abonnementActif, { code_pharmacie: codePharmacie });
      const data = payloadData(reponse);
      state.abonnement = data && data.id_abonnement ? data : null;
    } catch (err) {
      state.abonnement = null;
    }
  }

  async function chargerForfaits() {
    try {
      const reponse = await Api.get(Endpoints.forfaits);
      state.forfaits = tableau(payloadData(reponse));
    } catch (err) {
      state.forfaits = [];
    }
  }

  async function chargerAnnonces() {
    try {
      const reponse = await Api.get(Endpoints.annonces, { code_gerant: code() });
      state.annonces = tableau(reponse && reponse.data);
    } catch (err) {
      state.annonces = [];
    }
  }

  async function chargerAbonnes() {
    try {
      const reponse = await Api.post(Endpoints.abonnesNewsletter, { codeUtilisateur: code() });
      state.abonnes = tableau(payloadData(reponse));
    } catch (err) {
      state.abonnes = [];
    }
  }

  async function chargerAssurances() {
    try {
      const reponse = await Api.get(Endpoints.assurances);
      state.assurances = tableau(payloadData(reponse));
    } catch (err) {
      state.assurances = [];
    }
  }

  async function chargerHistorique() {
    try {
      const reponse = await Api.get(`${Endpoints.historique}/${code()}`);
      state.historique = tableau(payloadData(reponse));
    } catch (err) {
      state.historique = [];
    }
  }

  /* Consommation du forfait : la route n'est appelée que lorsqu'un abonnement
     est en cours (sinon il n'y a rien à mesurer et l'API ne fournit pas encore
     la donnée pour le forfait gratuit). */
  async function chargerUtilisation() {
    if (!state.abonnement) {
      state.utilisation = [];
      return;
    }
    try {
      const reponse = await Api.get(`${Endpoints.utilisation}/${code()}`);
      state.utilisation = tableau(payloadData(reponse));
    } catch (err) {
      state.utilisation = [];
    }
  }

  async function chargerTout() {
    await Promise.all([
      chargerProfil(),
      chargerForfaits(),
      chargerAnnonces(),
      chargerAbonnes(),
      chargerAssurances(),
      chargerHistorique(),
    ]);
    // L'abonnement dépend du code pharmacie : on le charge après le profil.
    await chargerAbonnement();
    await chargerUtilisation();
    renderGlobal();
    renderAccueil();
    renderProfil();
    renderAssurances();
    renderAnnonces();
    renderNewsletter();
    renderForfaits();
    renderStatistiques();
  }

  /* ------------------------------- Rendus -------------------------------- */

  function nomForfait() {
    return state.abonnement && state.abonnement.nom_forfait
      ? state.abonnement.nom_forfait
      : 'Gratuit';
  }

  function renderGlobal() {
    const s = state.session || {};
    setField('prenom-gerant', s.prenomUtilisateur || s.nomUtilisateur || 'Gérant');
    setField('aujourdhui', new Date().toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }));

    $('#user-name').textContent = [s.prenomUtilisateur, s.nomUtilisateur]
      .filter(Boolean)
      .join(' ') || 'Gérant';
    $('#user-avatar').textContent = initials(s.nomUtilisateur, s.prenomUtilisateur);
    $('#user-plan').textContent = nomForfait();

    $$('[data-plan-name]').forEach((el) => {
      el.textContent = nomForfait();
    });

    const annee = $('#year');
    if (annee) annee.textContent = new Date().getFullYear();
  }

  function renderAccueil() {
    const p = state.pharmacie;

    if (p) {
      setField('pharmacie-nom', p.nom_pharmacie || 'Votre pharmacie');
      setField('pharmacie-adresse', [p.adresse_fournit, p.nom_ville || p.ville_pharmacie]
        .filter(Boolean)
        .join(', ') || 'Adresse non renseignée');
      setField('pharmacie-tel', p.numeros_pharmacie || '—');
      setField('pharmacie-email', p.email_pharmacie || '—');
      setField('pharmacie-statut', p.libelle_statut || 'Actif');

      const deGarde = Number(p.statut_garde ?? p.est_de_garde ?? 0) === 1;
      const chip = $('[data-field="garde-chip"]');
      chip.textContent = deGarde ? 'De garde' : 'Hors garde';
      chip.className = `chip self-start sm:self-auto ${deGarde ? 'bg-accent-500 text-white' : 'bg-white/15 text-white'}`;

      const photo = $('[data-field="pharmacie-photo"]');
      const placeholder = $('[data-field="pharmacie-photo-placeholder"]');
      if (p.photo_pharmacie) {
        photo.src = p.photo_pharmacie;
        photo.classList.remove('hidden');
        placeholder.classList.add('hidden');
        /* Une photo distante peut ne plus répondre : on revient à l'icône
           plutôt que d'afficher une image cassée. */
        photo.onerror = () => {
          photo.classList.add('hidden');
          placeholder.classList.remove('hidden');
        };
      }
    } else {
      const indisponible = state.profilEnErreur === true;
      setField('pharmacie-nom', indisponible ? 'Profil indisponible' : 'Aucune pharmacie');
      setField(
        'pharmacie-adresse',
        indisponible ? 'Connexion au serveur impossible' : 'Créez votre fiche pour apparaître aux patients'
      );
      setField('pharmacie-tel', '—');
      setField('pharmacie-email', '—');
      setField('pharmacie-statut', 'Non renseignée');
    }

    const invitation = $('#accueil-creation');
    if (invitation) {
      invitation.classList.toggle('hidden', Boolean(p) || state.profilEnErreur === true);
    }

    const ab = state.abonnement;
    setField('plan-nom', nomForfait());
    setField('plan-prix', ab && ab.prix !== undefined ? Format.money(ab.prix) : '0 FCFA');

    if (ab && ab.date_debut && ab.date_fin) {
      const debut = new Date(String(ab.date_debut).replace(/-/g, '/'));
      const fin = new Date(String(ab.date_fin).replace(/-/g, '/'));
      const total = Math.max(1, Math.round((fin - debut) / 86400000));
      const restant = ab.jours_restants !== undefined ? ab.jours_restants : Math.max(0, Math.round((fin - Date.now()) / 86400000));
      const pourcentage = Math.min(100, Math.max(0, Math.round((restant / total) * 100)));

      setField('plan-jours', restant > 0 ? `${restant} jours restants` : 'Forfait expiré');
      setField('plan-periode', `${Format.date(ab.date_debut)} — ${Format.date(ab.date_fin)}`);
      $('[data-field="plan-progress"]').style.width = `${pourcentage}%`;
    } else {
      setField('plan-jours', 'Forfait gratuit');
      setField('plan-periode', 'Sans engagement');
      $('[data-field="plan-progress"]').style.width = '100%';
    }

    const vues = state.annonces.reduce((total, a) => total + (Number(a.nombreVue) || 0), 0);
    setStat('annonces', state.annonces.length);
    setStat('abonnes', state.abonnes.length);
    setStat('vues', state.annonces.length ? new Intl.NumberFormat('fr-FR').format(vues) : '—');
    setStat('assurances', state.pharmacie ? listeAssurances(state.pharmacie).length : '—');
  }

  function renderProfil() {
    const p = state.pharmacie;
    appliquerModeCreation(!p);

    if (!p) {
      // Pas encore de pharmacie : on préremplit avec les données du compte.
      $('#nom-pharmacie').value = '';
      $('#ville').value = (state.session && state.session.villeUtilisateur) || '';
      $('#adresse').value = (state.session && state.session.adresseUtilisateur) || '';
      $('#telephone').value = (state.session && state.session.numeroUtilisateur) || '';
      $('#email').value = '';

      const preview = $('#photo-preview');
      const placeholder = $('#photo-placeholder');
      if (state.photoSelectionnee) {
        preview.src = URL.createObjectURL(state.photoSelectionnee);
        preview.classList.remove('hidden');
        placeholder.classList.add('hidden');
      } else {
        preview.classList.add('hidden');
        placeholder.classList.remove('hidden');
      }

      renderAssurances();
      return;
    }

    $('#nom-pharmacie').value = p.nom_pharmacie || '';
    $('#ville').value = p.nom_ville || p.ville_pharmacie || '';
    $('#adresse').value = p.adresse_fournit || '';
    $('#telephone').value = p.numeros_pharmacie || '';
    $('#email').value = p.email_pharmacie || '';

    const preview = $('#photo-preview');
    const placeholder = $('#photo-placeholder');
    const source = state.photoSelectionnee
      ? URL.createObjectURL(state.photoSelectionnee)
      : p.photo_pharmacie;
    if (source) {
      preview.src = source;
      preview.classList.remove('hidden');
      placeholder.classList.add('hidden');
      /* Photo distante indisponible : on revient à l'icône de repli. */
      preview.onerror = () => {
        preview.classList.add('hidden');
        placeholder.classList.remove('hidden');
      };
    }

    appliquerHoraires(p);

    const deGarde = Number(p.statut_garde ?? p.est_de_garde ?? 0) === 1;
    majToggleGarde(deGarde);
    setField('garde-maj', p.derniere_maj_garde
      ? `Dernière mise à jour : ${Format.dateLong(p.derniere_maj_garde)}`
      : 'Dernière mise à jour : —');
    setField('garde-libelle', deGarde
      ? 'Votre pharmacie est actuellement de garde.'
      : 'Activez le mode garde pour être visible en priorité.');

    renderAssurances();
  }

  function extrairePlage(valeur) {
    const brut = String(valeur || '').trim();
    if (!brut || /ferm/i.test(brut)) return ['', ''];
    const parts = brut.split(/\s*[-–]\s*/);
    return [parts[0] || '', parts[1] || ''];
  }

  function appliquerHoraires(p) {
    const sem = extrairePlage(p.horaire_semaine || p.horaires_en_semaine);
    const sam = extrairePlage(p.horaire_samedi || p.horaires_samedi);
    const dim = extrairePlage(p.horaire_dimanche || p.horaires_dimanche);

    $('#h-sem-ouverture').value = sem[0];
    $('#h-sem-fermeture').value = sem[1];
    $('#h-sam-ouverture').value = sam[0];
    $('#h-sam-fermeture').value = sam[1];
    $('#h-dim-ouverture').value = dim[0];
    $('#h-dim-fermeture').value = dim[1];

    const ouvert = Boolean(dim[0] && dim[1]);
    $('#ouvert-dimanche').checked = ouvert;
    $('#dimanche-horaires').classList.toggle('hidden', !ouvert);
  }

  /**
   * Bascule l'affichage de la section profil entre « modification » et
   * « création » (compte gérant sans pharmacie enregistrée).
   */
  function appliquerModeCreation(creation) {
    state.modeCreation = creation;

    const bandeau = $('#profil-creation');
    if (bandeau) bandeau.classList.toggle('hidden', !creation);

    const carteGarde = $('#garde-carte');
    if (carteGarde) carteGarde.classList.toggle('hidden', creation);

    const libelle = $('#save-profil-label');
    if (libelle) libelle.textContent = creation ? 'Créer ma pharmacie' : 'Enregistrer les modifications';
  }

  function majToggleGarde(actif) {
    $$('[data-garde]').forEach((btn) => {
      const selectionne = (btn.dataset.garde === '1') === actif;
      btn.classList.toggle('bg-white', selectionne);
      btn.classList.toggle('text-brand-800', selectionne);
      btn.classList.toggle('shadow-sm', selectionne);
      btn.classList.toggle('text-slate-500', !selectionne);
    });
  }

  function renderAssurances() {
    const conteneur = $('#assurances-list');
    if (!state.assurances.length) {
      conteneur.innerHTML = '<p class="text-sm text-slate-500">Aucune assurance disponible.</p>';
      return;
    }

    const selectionnees = new Set(
      listeAssurances(state.pharmacie).map((nom) => String(nom).toLowerCase())
    );

    conteneur.innerHTML = state.assurances
      .map((assurance) => {
        const cochee = selectionnees.has(String(assurance.nom_assurance).toLowerCase());
        return `
          <label class="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 transition hover:border-brand-300 hover:bg-brand-50/40">
            <input type="checkbox" name="assurance" value="${escapeHtml(assurance.nom_assurance)}"
                   ${cochee ? 'checked' : ''}
                   class="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
            <span class="text-sm text-slate-700">${escapeHtml(assurance.nom_assurance)}</span>
          </label>`;
      })
      .join('');

    majCompteurAssurances();
  }

  function majCompteurAssurances() {
    const total = $$('#assurances-list input[name="assurance"]:checked').length;
    setField('assurances-count', `${total} assurance(s) sélectionnée(s)`);
  }

  function renderAnnonces() {
    const conteneur = $('#annonces-list');
    setStat('annonces', state.annonces.length);

    if (!state.annonces.length) {
      conteneur.innerHTML = `
        <div class="card col-span-full flex flex-col items-center px-6 py-14 text-center">
          <span class="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            ${Icons.svg('megaphone', 'h-8 w-8')}
          </span>
          <h3 class="mt-5 text-lg font-semibold text-slate-900">Aucune annonce</h3>
          <p class="mt-1 text-sm text-slate-500">Créez votre première annonce pour informer vos patients.</p>
          <button type="button" data-open-annonce class="btn-primary mt-6">
            ${Icons.svg('plus', 'h-4 w-4')} Créer une annonce
          </button>
        </div>`;
      $('[data-open-annonce]', conteneur).addEventListener('click', ouvrirModalAnnonce);
      return;
    }

    const tones = {
      Promotion: 'bg-accent-50 text-accent-600',
      Information: 'bg-sky-50 text-sky-600',
      Urgence: 'bg-red-50 text-red-600',
      Newsletter: 'bg-violet-50 text-violet-600',
    };

    conteneur.innerHTML = state.annonces
      .map((a) => {
        const type = a.libelle_type_annonce || 'Information';
        const ton = tones[type] || 'bg-slate-100 text-slate-600';
        return `
          <article class="card flex flex-col p-5">
            <div class="flex items-start justify-between gap-3">
              <span class="chip ${ton}">${escapeHtml(type)}</span>
              <button type="button" data-supprimer="${a.id_annonce}"
                      class="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                      aria-label="Supprimer l'annonce">
                ${Icons.svg('trash', 'h-5 w-5')}
              </button>
            </div>
            <h3 class="mt-3 text-base font-semibold text-slate-900">${escapeHtml(a.titre)}</h3>
            <p class="mt-1.5 line-clamp-3 text-sm leading-relaxed text-slate-600">${escapeHtml(a.contenu)}</p>
            <div class="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500">
              <span class="inline-flex items-center gap-1.5">${Icons.svg('calendar', 'h-4 w-4')} ${Format.date(a.date_publication)}</span>
              <span class="inline-flex items-center gap-1.5">${Icons.svg('eye', 'h-4 w-4')} ${Number(a.nombreVue) || 0} vues</span>
            </div>
          </article>`;
      })
      .join('');

    $$('[data-supprimer]', conteneur).forEach((btn) => {
      btn.addEventListener('click', () => supprimerAnnonce(btn.dataset.supprimer));
    });
  }

  function renderNewsletter() {
    const conteneur = $('#newsletter-list');
    setStat('abonnes', state.abonnes.length);

    const actifs = state.abonnes.filter(
      (n) => String(n.statut_abonnement || '').toLowerCase() !== 'désactivé'
    ).length;
    setStat('abonnes-actifs', state.abonnes.length ? actifs : '—');

    const dernier = state.abonnes
      .map((n) => n.date_abonnement)
      .filter(Boolean)
      .sort()
      .pop();
    setField('dernier-abonnement', dernier ? Format.date(dernier) : '—');

    if (!state.abonnes.length) {
      conteneur.innerHTML = `
        <div class="card col-span-full flex flex-col items-center px-6 py-14 text-center">
          <span class="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            ${Icons.svg('mail', 'h-8 w-8')}
          </span>
          <h3 class="mt-5 text-lg font-semibold text-slate-900">Aucun abonné</h3>
          <p class="mt-1 text-sm text-slate-500">
            Vos patients peuvent s'abonner depuis l'application mobile.
          </p>
        </div>`;
      return;
    }

    conteneur.innerHTML = state.abonnes
      .slice(0, 60)
      .map((n) => {
        const actif = String(n.statut_abonnement || 'Actif').toLowerCase() !== 'désactivé';
        return `
          <article class="card flex items-center justify-between gap-4 p-4">
              <div class="flex items-center gap-3">
              <span class="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                ${Icons.svg('user', 'h-5 w-5')}
              </span>
              <div>
                <p class="text-sm font-semibold text-slate-900">${escapeHtml(n.code_utilisateur || n.nom_pharmacie || 'Abonné')}</p>
                <p class="text-xs text-slate-500">Depuis le ${Format.date(n.date_abonnement)}</p>
              </div>
            </div>
            <span class="chip ${actif ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-500'}">
              ${actif ? 'Actif' : 'Inactif'}
            </span>
          </article>`;
      })
      .join('');
  }

  function renderForfaits() {
    const conteneur = $('#forfaits-list');
    const actuel = nomForfait();

    if (!state.forfaits.length) {
      conteneur.innerHTML = '<p class="text-sm text-slate-500 lg:col-span-3">Aucun forfait disponible pour le moment.</p>';
      return;
    }

    conteneur.innerHTML = state.forfaits
      .map((f) => {
        const recommande = f.nom_forfait === 'Standard';
        const estActuel = f.nom_forfait === actuel;
        const avantages = (f.fonctionnalites || [])
          .map((fonc) => {
            const limite = fonc.limite !== null && fonc.limite !== undefined
              ? ` <span class="text-slate-400">(${fonc.limite}/mois)</span>`
              : '';
            return `<li class="flex gap-3">${Icons.svg('check', 'h-4 w-4 shrink-0 text-brand-500')}<span>${escapeHtml(fonc.nom)}${limite}</span></li>`;
          })
          .join('');

        /* Aucun paiement en ligne n'est ouvert : le forfait en cours est
           signalé, les autres restent consultables mais non souscriptibles. */
        return `
          <article class="card relative flex flex-col p-6 ${recommande ? 'border-2 border-brand-800' : ''}">
            ${recommande ? '<span class="chip absolute -top-3 left-6 bg-brand-800 text-white">Recommandé</span>' : ''}
            <h4 class="text-lg font-semibold text-slate-900">${escapeHtml(f.nom_forfait)}</h4>
            <p class="mt-3 text-3xl font-extrabold text-slate-900">${Format.money(f.prix)}</p>
            <p class="mt-1 text-sm text-slate-500">pour ${f.duree_jours} jours</p>
            ${f.description ? `<p class="mt-3 text-sm text-slate-600">${escapeHtml(f.description)}</p>` : ''}
            <ul class="mt-5 space-y-2.5 text-sm text-slate-600">${avantages || '<li class="text-slate-400">Aucun détail disponible</li>'}</ul>
            <button type="button" data-souscrire="${escapeHtml(f.nom_forfait)}"
                    class="btn ${recommande ? 'btn-primary' : 'btn-ghost'} btn-block mt-6" disabled>
              ${estActuel ? 'Forfait en cours' : 'Bientôt disponible'}
            </button>
          </article>`;
      })
      .join('');

    renderHistorique();
  }

  function renderHistorique() {
    const conteneur = $('#historique-list');
    if (!state.historique.length) {
      conteneur.innerHTML = '<p class="text-sm text-slate-500">Aucun abonnement enregistré à ce jour.</p>';
      return;
    }

    conteneur.innerHTML = state.historique
      .map(
        (h) => `
        <div class="card flex flex-wrap items-center justify-between gap-4 p-4">
          <div class="flex items-center gap-3">
            <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              ${Icons.svg('star', 'h-5 w-5')}
            </span>
            <div>
              <p class="text-sm font-semibold text-slate-900">${escapeHtml(h.nom_forfait)}</p>
              <p class="text-xs text-slate-500">${Format.date(h.date_debut)} — ${Format.date(h.date_fin)}</p>
            </div>
          </div>
          <div class="flex items-center gap-4">
            <span class="text-sm font-semibold text-slate-900">${Format.money(h.prix)}</span>
            <span class="chip bg-brand-50 text-brand-700">${escapeHtml(h.libelle_statut || 'Actif')}</span>
          </div>
        </div>`
      )
      .join('');
  }

  /* ------------------------- Statistiques --------------------------------- */

  function dateValide(valeur) {
    if (!valeur) return null;
    const d = new Date(String(valeur).replace(/-/g, '/'));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function dansPeriode(valeur) {
    if (!state.periode) return true;
    const d = dateValide(valeur);
    if (!d) return false;
    return d.getTime() >= Date.now() - state.periode * 86400000;
  }

  function estAbonneActif(abonne) {
    return String(abonne.statut_abonnement || 'Actif').toLowerCase() !== 'désactivé';
  }

  function nombre(value) {
    return new Intl.NumberFormat('fr-FR').format(Number(value) || 0);
  }

  function renderStatistiques() {
    const libelle = state.periode
      ? `Période analysée : ${state.periode} derniers jours`
      : 'Période analysée : tout l\'historique';
    setField('st-periode-libelle', libelle);
    majBoutonsPeriode();

    const annonces = state.annonces || [];
    const abonnes = state.abonnes || [];
    const annoncesPeriode = annonces.filter((a) => dansPeriode(a.date_publication));
    const abonnesPeriode = abonnes.filter((n) => dansPeriode(n.date_abonnement));
    const vuesTotales = annonces.reduce((total, a) => total + (Number(a.nombreVue) || 0), 0);
    const actifs = abonnes.filter(estAbonneActif).length;

    setStat('st-annonces', nombre(annoncesPeriode.length));
    setStat('st-vues', nombre(vuesTotales));
    setStat('st-vues-moy', annonces.length ? (vuesTotales / annonces.length).toFixed(1) : '0');
    setStat('st-abonnes', nombre(abonnes.length));
    setStat('st-abonnes-periode', nombre(abonnesPeriode.length));
    setStat('st-actifs', abonnes.length ? nombre(actifs) : '—');
    setStat('st-taux', abonnes.length ? Format.percent((actifs / abonnes.length) * 100) : '—');

    const dernier = abonnes
      .map((n) => n.date_abonnement)
      .filter(Boolean)
      .sort()
      .pop();
    setField('st-dernier-abonnement', dernier ? Format.date(dernier) : '—');

    renderClassementAnnonces();
    renderGraphiques(annonces, abonnes, actifs);
    renderQuotas();
    verifierStatistiquesAvancees();
  }

  function majBoutonsPeriode() {
    $$('[data-periode]').forEach((btn) => {
      const active = Number(btn.dataset.periode) === state.periode;
      btn.classList.toggle('bg-white', active);
      btn.classList.toggle('text-brand-800', active);
      btn.classList.toggle('shadow-sm', active);
      btn.classList.toggle('text-slate-500', !active);
    });
  }

  function renderClassementAnnonces() {
    const conteneur = $('#stats-classement');
    if (!conteneur) return;

    const meilleures = [...state.annonces]
      .sort((a, b) => (Number(b.nombreVue) || 0) - (Number(a.nombreVue) || 0))
      .slice(0, 6);

    if (!meilleures.length) {
      conteneur.innerHTML =
        '<tr><td colspan="4" class="px-6 py-8 text-center text-sm text-slate-400">Aucune annonce publiée</td></tr>';
      return;
    }

    conteneur.innerHTML = meilleures
      .map(
        (a) => `
        <tr class="transition hover:bg-slate-50/70">
          <td class="max-w-xs px-6 py-3.5">
            <p class="truncate font-medium text-slate-900">${escapeHtml(a.titre)}</p>
          </td>
          <td class="px-4 py-3.5">
            <span class="chip bg-slate-100 text-slate-600">${escapeHtml(a.libelle_type_annonce || 'Information')}</span>
          </td>
          <td class="whitespace-nowrap px-4 py-3.5 text-slate-500">${Format.date(a.date_publication)}</td>
          <td class="px-6 py-3.5 text-right font-semibold text-slate-900">${nombre(a.nombreVue)}</td>
        </tr>`
      )
      .join('');
  }

  function evolutionAbonnes(abonnes) {
    const maintenant = new Date();
    const mois = [];

    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(maintenant.getFullYear(), maintenant.getMonth() - i, 1);
      mois.push({
        annee: d.getFullYear(),
        index: d.getMonth(),
        label: d.toLocaleDateString('fr-FR', { month: 'short' }),
        valeur: 0,
      });
    }

    abonnes.forEach((n) => {
      const d = dateValide(n.date_abonnement);
      if (!d) return;
      const cible = mois.find((m) => m.annee === d.getFullYear() && m.index === d.getMonth());
      if (cible) cible.valeur += 1;
    });

    return mois.map((m) => ({ label: m.label, valeur: m.valeur }));
  }

  function publicationsParPeriode(annonces) {
    const parJour = new Map();

    [...annonces]
      .sort((a, b) => {
        const ga = dateValide(a.date_publication);
        const gb = dateValide(b.date_publication);
        return (ga ? ga.getTime() : 0) - (gb ? gb.getTime() : 0);
      })
      .forEach((a) => {
        const d = dateValide(a.date_publication);
        if (!d) return;
        const cle = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
        parJour.set(cle, (parJour.get(cle) || 0) + 1);
      });

    let entrees = [...parJour.entries()].map(([label, valeur]) => ({ label, valeur }));

    if (entrees.length > 31) {
      const parMois = new Map();
      entrees.forEach((e) => {
        const cle = e.label.split(' ')[1] || e.label;
        parMois.set(cle, (parMois.get(cle) || 0) + e.valeur);
      });
      entrees = [...parMois.entries()].map(([label, valeur]) => ({ label, valeur }));
    }

    return entrees;
  }

  function renderGraphiques(annonces, abonnes, actifs) {
    const top = [...annonces]
      .sort((a, b) => (Number(b.nombreVue) || 0) - (Number(a.nombreVue) || 0))
      .slice(0, 6)
      .map((a) => ({ label: a.titre, valeur: Number(a.nombreVue) || 0 }));

    const couleursTypes = {
      Promotion: '#F57C00',
      Information: '#1976D2',
      Urgence: '#E11D48',
      Newsletter: '#7C3AED',
      Annonce: '#1B8A5A',
    };
    const parType = {};
    annonces.forEach((a) => {
      const type = a.libelle_type_annonce || 'Information';
      parType[type] = (parType[type] || 0) + 1;
    });
    const parts = Object.entries(parType).map(([label, valeur], i) => ({
      label,
      valeur,
      couleur: couleursTypes[label] || Charts.PALETTE[i % Charts.PALETTE.length],
    }));

    $('#chart-vues-annonces').innerHTML = Charts.barresHorizontales(top, { couleur: '#1B8A5A' });
    $('#chart-types').innerHTML = Charts.anneau(parts, {
      centre: annonces.length,
      sousTitre: 'annonces',
    });
    $('#chart-abonnes').innerHTML = Charts.aire(evolutionAbonnes(abonnes), { couleur: '#1B8A5A' });
    $('#chart-statut-abonnes').innerHTML = Charts.anneau(
      [
        { label: 'Actifs', valeur: actifs, couleur: '#1B8A5A' },
        { label: 'Inactifs', valeur: Math.max(0, abonnes.length - actifs), couleur: '#CBD5E1' },
      ],
      { centre: abonnes.length, sousTitre: 'abonnés' }
    );
    $('#chart-publications').innerHTML = Charts.barresVerticales(
      publicationsParPeriode(annonces.filter((a) => dansPeriode(a.date_publication))),
      { couleur: '#F57C00' }
    );
  }

  function renderQuotas() {
    const conteneur = $('#stats-quotas');
    if (!conteneur) return;

    if (!state.utilisation.length) {
      conteneur.innerHTML =
        '<p class="text-sm text-slate-400 sm:col-span-2 lg:col-span-4">Aucune donnée de consommation disponible pour le moment.</p>';
      return;
    }

    conteneur.innerHTML = state.utilisation
      .map((u, i) => {
        const utilise = Number(u.nb_utilisations) || 0;
        const limite = u.limite === undefined ? null : u.limite;
        return `
          <div class="flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
            ${Charts.jauge(utilise, limite, { couleur: Charts.PALETTE[i % Charts.PALETTE.length] })}
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold text-slate-900">${escapeHtml(
                u.nom_fonctionnalite || 'Fonctionnalité'
              )}</p>
              <p class="text-xs text-slate-500">${
                limite ? `${utilise} / ${limite} utilisations` : `${utilise} utilisation(s)`
              }</p>
            </div>
          </div>`;
      })
      .join('');
  }

  async function verifierStatistiquesAvancees() {
    if (state.acces.statsAvancees !== undefined) {
      appliquerAccesAvances(state.acces.statsAvancees);
      return;
    }
    const autorise = await verifierAcces('statsAvancees', CONFIG.FONCTIONNALITES.STATS_AVANCEES);
    appliquerAccesAvances(autorise);
  }

  function appliquerAccesAvances(autorise) {
    const graphiques = $('#stats-graphiques');
    const verrou = $('#stats-verrouille');
    if (graphiques) graphiques.classList.toggle('hidden', !autorise);
    if (verrou) verrou.classList.toggle('hidden', autorise);
  }

  /* ------------------------------ Actions -------------------------------- */

  async function basculerGarde(valeur) {
    if (!state.pharmacie) {
      Toast.error('Profil pharmacie non chargé.');
      return;
    }

    const confirmation = Modal.open({
      title: valeur ? 'Activation du mode garde' : 'Désactivation du mode garde',
      body: '<div class="flex items-center gap-3"><span class="h-5 w-5 animate-spin rounded-full border-2 border-brand-200 border-t-brand-700"></span><span>Traitement en cours…</span></div>',
      dismissable: false,
    });

    try {
      const reponse = await Api.put(Endpoints.modifierGarde, {
        code_pharmacie: state.pharmacie.code_pharmacie,
        est_de_garde: valeur,
      });

      if (reponse && reponse.success === false) {
        throw new ApiError(reponse.message || ' mise à jour impossible', 400);
      }

      state.pharmacie.statut_garde = valeur ? 1 : 0;
      state.pharmacie.est_de_garde = valeur ? 1 : 0;
      state.pharmacie.derniere_maj_garde = new Date().toISOString().slice(0, 19).replace('T', ' ');

      confirmation.remove();
      document.body.style.overflow = '';
      renderProfil();
      renderAccueil();

      Toast.success(
        valeur
          ? 'Pharmacie de garde activée. Vous êtes visible en priorité.'
          : 'Mode garde désactivé.'
      );
    } catch (err) {
      confirmation.remove();
      document.body.style.overflow = '';
      majToggleGarde(!valeur);
      Toast.error(err.message || 'Impossible de modifier le statut de garde.');
    }
  }

  function construireHoraire(ouverture, fermeture, actif) {
    if (!actif) return 'Fermée';
    if (!ouverture || !fermeture) return 'Fermée';
    return `${ouverture} - ${fermeture}`;
  }

  async function enregistrerProfil() {
    const nom = $('#nom-pharmacie').value.trim();
    const adresse = $('#adresse').value.trim();
    const telephone = $('#telephone').value.trim();

    if (!nom || !adresse || !telephone) {
      Toast.error('Veuillez remplir les champs obligatoires : nom, adresse et téléphone.');
      return;
    }

    if (!state.pharmacie) {
      await creerPharmacie();
      return;
    }

    const assurances = $$('#assurances-list input[name="assurance"]:checked').map(
      (input) => input.value
    );

    const dimancheActif = $('#ouvert-dimanche').checked;
    const form = new FormData();
    form.append('code_pharmacie', state.pharmacie.code_pharmacie);
    form.append('nom_pharmacie', nom);
    form.append('ville_pharmacie', $('#ville').value.trim() || 'Abidjan');
    form.append('adresse_fournit', adresse);
    form.append('numero_pharmacie', telephone);
    form.append('email_pharmacie', $('#email').value.trim());
    form.append(
      'horaires_en_semaine',
      construireHoraire($('#h-sem-ouverture').value, $('#h-sem-fermeture').value, true)
    );
    form.append(
      'horaires_samedi',
      construireHoraire($('#h-sam-ouverture').value, $('#h-sam-fermeture').value, true)
    );
    form.append(
      'horaires_dimanche',
      construireHoraire($('#h-dim-ouverture').value, $('#h-dim-fermeture').value, dimancheActif)
    );
    form.append('liste_assurance_accepte', JSON.stringify(assurances));
    if (state.photoSelectionnee) form.append('photo', state.photoSelectionnee);

    const bouton = $('#save-profil');
    bouton.disabled = true;

    try {
      const reponse = await Api.update(Endpoints.modifierPharmacie, form);
      if (reponse && reponse.success === false) {
        throw new ApiError(reponse.message || 'Enregistrement impossible', 400);
      }

      state.photoSelectionnee = null;
      $('#photo-input').value = '';
      $('#photo-upload').hidden = true;

      await chargerProfil();
      renderAccueil();
      renderProfil();
      Toast.success('Modifications enregistrées avec succès.');
    } catch (err) {
      Toast.error(err.message || "L'enregistrement a échoué.");
    } finally {
      bouton.disabled = false;
    }
  }

  /** Création du profil pharmacie (compte gérant sans pharmacie). */
  async function creerPharmacie() {
    const nom = $('#nom-pharmacie').value.trim();
    const adresse = $('#adresse').value.trim();
    const telephone = $('#telephone').value.trim();

    if (!nom || !adresse || !telephone) {
      Toast.error('Veuillez remplir les champs obligatoires : nom, adresse et téléphone.');
      return;
    }

    const assurances = $$('#assurances-list input[name="assurance"]:checked').map(
      (input) => input.value
    );
    const dimancheActif = $('#ouvert-dimanche').checked;

    const form = new FormData();
    form.append('code_gerant', code());
    form.append('nom_pharmacie', nom);
    form.append('ville_pharmacie', $('#ville').value.trim() || 'Abidjan');
    form.append('adresse_fournit', adresse);
    form.append('numero_pharmacie', telephone);
    form.append('email_pharmacie', $('#email').value.trim());
    form.append(
      'horaires_en_semaine',
      construireHoraire($('#h-sem-ouverture').value, $('#h-sem-fermeture').value, true)
    );
    form.append(
      'horaires_samedi',
      construireHoraire($('#h-sam-ouverture').value, $('#h-sam-fermeture').value, true)
    );
    form.append(
      'horaires_dimanche',
      construireHoraire($('#h-dim-ouverture').value, $('#h-dim-fermeture').value, dimancheActif)
    );
    form.append('liste_assurance_accepte', JSON.stringify(assurances));
    form.append('latitudePharmacie', '0');
    form.append('longitudePharmacie', '0');
    if (state.photoSelectionnee) form.append('photo', state.photoSelectionnee);

    const bouton = $('#save-profil');
    bouton.disabled = true;

    try {
      const reponse = await Api.send(Endpoints.ajouterPharmacie, form);
      if (reponse && reponse.success === false) {
        throw new ApiError(reponse.message || 'Création impossible', 400);
      }

      state.photoSelectionnee = null;
      $('#photo-input').value = '';
      $('#photo-upload').hidden = true;

      await chargerProfil();
      appliquerModeCreation(!state.pharmacie);
      renderAccueil();
      renderProfil();
      Toast.success('Votre pharmacie a été créée avec succès.');
    } catch (err) {
      Toast.error(err.message || 'La création de la pharmacie a échoué.');
    } finally {
      bouton.disabled = false;
    }
  }

  async function publierPhoto() {
    if (!state.photoSelectionnee || !state.pharmacie) {
      Toast.warning('Sélectionnez d\'abord une photo.');
      return;
    }

    const form = new FormData();
    form.append('code_pharmacie', state.pharmacie.code_pharmacie);
    form.append('photo_pharmacie', state.photoSelectionnee);

    const bouton = $('#photo-upload');
    bouton.disabled = true;

    try {
      const reponse = await Api.send(Endpoints.uploadPhoto, form);
      if (reponse && reponse.success === false) {
        throw new ApiError(reponse.message || 'Upload impossible', 400);
      }
      await chargerProfil();
      renderProfil();
      renderAccueil();
      Toast.success('Photo mise à jour avec succès.');
    } catch (err) {
      Toast.error(err.message || "L'envoi de la photo a échoué.");
    } finally {
      bouton.disabled = false;
    }
  }

  function ouvrirModalAnnonce() {
    const modal = Modal.open({
      title: 'Nouvelle annonce',
      size: 'max-w-xl',
      body: `
        <form id="form-annonce" class="space-y-5">
          <div>
            <span class="label">Type d'annonce</span>
            <div class="flex flex-wrap gap-2" id="type-annonce">
              ${['Information', 'Promotion', 'Urgence']
                .map(
                  (type, index) => `
                  <button type="button" data-type="${type}"
                          class="chip border ${index === 0 ? 'border-brand-800 bg-brand-800 text-white' : 'border-slate-200 bg-white text-slate-600'}">
                    ${type}
                  </button>`
                )
                .join('')}
            </div>
          </div>
          <div>
            <label class="label" for="annonce-titre">Titre</label>
            <input id="annonce-titre" class="input" type="text" maxlength="120" placeholder="Ex : Promotion sur les vitamines" />
            <p class="mt-1.5 hidden text-xs font-medium text-red-600" data-error="titre"></p>
          </div>
          <div>
            <label class="label" for="annonce-contenu">Description</label>
            <textarea id="annonce-contenu" class="input" rows="5" maxlength="800" placeholder="Décrivez votre annonce…"></textarea>
            <p class="mt-1.5 hidden text-xs font-medium text-red-600" data-error="contenu"></p>
          </div>
        </form>`,
      footer: `
        <button type="button" data-cancel class="btn-ghost">Annuler</button>
        <button type="button" data-publish class="btn-primary">Publier</button>`,
    });

    let type = 'Information';
    $$('[data-type]', modal).forEach((chip) => {
      chip.addEventListener('click', () => {
        type = chip.dataset.type;
        $$('[data-type]', modal).forEach((autre) => {
          const selectionne = autre === chip;
          autre.className = `chip border ${selectionne ? 'border-brand-800 bg-brand-800 text-white' : 'border-slate-200 bg-white text-slate-600'}`;
        });
      });
    });

    $('[data-cancel]', modal).addEventListener('click', Modal.close);
    $('[data-publish]', modal).addEventListener('click', async () => {
      const titre = $('#annonce-titre').value.trim();
      const contenu = $('#annonce-contenu').value.trim();
      const erreurTitre = $('[data-error="titre"]', modal);
      const erreurContenu = $('[data-error="contenu"]', modal);

      erreurTitre.classList.add('hidden');
      erreurContenu.classList.add('hidden');

      if (!titre) {
        erreurTitre.textContent = 'Veuillez entrer un titre.';
        erreurTitre.classList.remove('hidden');
        return;
      }
      if (!contenu) {
        erreurContenu.textContent = 'Veuillez entrer une description.';
        erreurContenu.classList.remove('hidden');
        return;
      }

      const bouton = $('[data-publish]', modal);
      bouton.disabled = true;
      bouton.textContent = 'Publication…';

      try {
        const reponse = await Api.post(Endpoints.envoyerAnnonce, {
          titre,
          contenu,
          code_gerant: code(),
          type_annonce: type,
        });
        if (reponse && reponse.success === false) {
          throw new ApiError(reponse.message || 'Publication impossible', 400);
        }

        Modal.close();
        await chargerAnnonces();
        renderAnnonces();
        setStat('annonces', state.annonces.length);
        Toast.success('Annonce publiée avec succès.');
      } catch (err) {
        bouton.disabled = false;
        bouton.textContent = 'Publier';
        Toast.error(err.message || "La publication a échoué.");
      }
    });
  }

  async function supprimerAnnonce(id) {
    const confirme = await Modal.confirm({
      title: 'Confirmer la suppression',
      message: 'Voulez-vous vraiment supprimer cette annonce ? Cette action est définitive.',
      confirmLabel: 'Supprimer',
      tone: 'danger',
    });

    if (!confirme) return;

    try {
      await Api.del(Endpoints.supprimerAnnonce, { id_annonce: id });
      await chargerAnnonces();
      renderAnnonces();
      setStat('annonces', state.annonces.length);
      Toast.success('Annonce supprimée.');
    } catch (err) {
      Toast.error(err.message || 'La suppression a échoué.');
    }
  }

  function ouvrirModalNewsletter() {
    const modal = Modal.open({
      title: 'Envoyer une newsletter',
      size: 'max-w-xl',
      body: `
        <div class="mb-5 flex items-start gap-3 rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-800">
          ${Icons.svg('info', 'h-5 w-5 shrink-0')}
          <span>Cette newsletter sera diffusée aux <strong>${state.abonnes.length}</strong> abonné(s) de votre pharmacie.</span>
        </div>
        <form id="form-newsletter" class="space-y-5">
          <div>
            <label class="label" for="newsletter-titre">Titre</label>
            <input id="newsletter-titre" class="input" type="text" maxlength="120" placeholder="Ex : Nouveautés du mois" />
            <p class="mt-1.5 hidden text-xs font-medium text-red-600" data-error="titre"></p>
          </div>
          <div>
            <label class="label" for="newsletter-contenu">Contenu</label>
            <textarea id="newsletter-contenu" class="input" rows="7" maxlength="2000" placeholder="Écrivez votre message…"></textarea>
            <p class="mt-1.5 hidden text-xs font-medium text-red-600" data-error="contenu"></p>
          </div>
        </form>`,
      footer: `
        <button type="button" data-cancel class="btn-ghost">Annuler</button>
        <button type="button" data-send class="btn-primary">Envoyer</button>`,
    });

    $('[data-cancel]', modal).addEventListener('click', Modal.close);
    $('[data-send]', modal).addEventListener('click', async () => {
      const titre = $('#newsletter-titre').value.trim();
      const contenu = $('#newsletter-contenu').value.trim();
      const erreurTitre = $('[data-error="titre"]', modal);
      const erreurContenu = $('[data-error="contenu"]', modal);

      erreurTitre.classList.add('hidden');
      erreurContenu.classList.add('hidden');

      if (!titre) {
        erreurTitre.textContent = 'Veuillez entrer un titre.';
        erreurTitre.classList.remove('hidden');
        return;
      }
      if (!contenu) {
        erreurContenu.textContent = 'Veuillez entrer un contenu.';
        erreurContenu.classList.remove('hidden');
        return;
      }

      const bouton = $('[data-send]', modal);
      bouton.disabled = true;
      bouton.textContent = 'Envoi en cours…';

      try {
        let reponse;
        try {
          // Route dédiée : enregistre l'envoi dans `envoi_newsletter` (statistiques).
          reponse = await Api.post(Endpoints.envoyerNewsletter, {
            code_pharmacie: state.pharmacie ? state.pharmacie.code_pharmacie : code(),
            code_gerant: code(),
            titre,
            contenu,
          });
        } catch (errRoute) {
          // Fallback : l'API ne expose pas encore la route dédiée.
          if (errRoute.status !== 404 && errRoute.status !== 405) throw errRoute;
          reponse = await Api.post(Endpoints.envoyerAnnonce, {
            titre,
            contenu,
            code_gerant: code(),
            type_annonce: 'Newsletter',
          });
        }

        if (reponse && reponse.success === false) {
          throw new ApiError(reponse.message || 'Envoi impossible', 400);
        }

        Modal.close();
        Toast.success(`Newsletter envoyée à ${state.abonnes.length} abonné(s).`);
      } catch (err) {
        bouton.disabled = false;
        bouton.textContent = 'Envoyer';
        Toast.error(err.message || "L'envoi a échoué.");
      }
    });
  }

  /* ------------------------------ Interface ------------------------------ */

  function ouvrirSidebar() {
    $('#sidebar').classList.remove('-translate-x-full');
    $('#sidebar-overlay').classList.remove('hidden');
  }

  function fermerSidebar() {
    if (window.innerWidth < 1024) {
      $('#sidebar').classList.add('-translate-x-full');
      $('#sidebar-overlay').classList.add('hidden');
    }
  }

  async function deconnecter() {
    const confirme = await Modal.confirm({
      title: 'Déconnexion',
      message: 'Voulez-vous vraiment vous déconnecter ?',
      confirmLabel: 'Déconnexion',
      tone: 'danger',
    });
    if (confirme) {
      Session.clear();
      window.location.href = '/connexion';
    }
  }

  function binder() {
    $('#sidebar-open').addEventListener('click', ouvrirSidebar);
    $('#sidebar-close').addEventListener('click', fermerSidebar);
    $('#sidebar-overlay').addEventListener('click', fermerSidebar);
    $('#logout-btn').addEventListener('click', deconnecter);
    $('#topbar-logout').addEventListener('click', deconnecter);

    $$('[data-action="go"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        window.location.hash = btn.dataset.target;
      });
    });

    $$('[data-garde]').forEach((btn) => {
      btn.addEventListener('click', () => basculerGarde(btn.dataset.garde === '1'));
    });

    $('#ouvert-dimanche').addEventListener('change', (event) => {
      $('#dimanche-horaires').classList.toggle('hidden', !event.target.checked);
    });

    $('#assurances-list').addEventListener('change', majCompteurAssurances);
    $('#save-profil').addEventListener('click', enregistrerProfil);
    $('#new-annonce').addEventListener('click', ouvrirModalAnnonce);
    $('#new-newsletter').addEventListener('click', ouvrirModalNewsletter);

    $$('[data-periode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.periode = Number(btn.dataset.periode);
        renderStatistiques();
      });
    });

    $('#photo-input').addEventListener('change', (event) => {
      const fichier = event.target.files && event.target.files[0];
      if (!fichier) return;
      state.photoSelectionnee = fichier;
      const preview = $('#photo-preview');
      preview.src = URL.createObjectURL(fichier);
      preview.classList.remove('hidden');
      $('#photo-placeholder').classList.add('hidden');
      $('#photo-upload').hidden = false;
    });
    $('#photo-upload').addEventListener('click', publierPhoto);

    window.addEventListener('hashchange', () => {
      naviguer(window.location.hash);
    });
  }

  async function init() {
    hydrateIcons();

    if (!state.session || !state.session.codeUtilisateur) {
      window.location.replace('/connexion');
      return;
    }

    binder();
    renderGlobal();
    await chargerTout();
    renderGlobal();
    naviguer(window.location.hash || '#/accueil');
  }

  init().catch((err) => {
    console.error(err);
    Toast.error('Le tableau de bord n\'a pas pu être initialisé.');
  });
})();
