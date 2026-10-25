/* Inscription : informations → code PIN → profil pharmacie. */

(function () {
  const form = document.getElementById('inscription-form');
  const erreurBox = document.getElementById('form-error');
  const succesBox = document.getElementById('form-success');
  const sousTitre = document.getElementById('step-subtitle');
  const bouton = document.getElementById('btn-suivant');
  const retour = document.getElementById('btn-retour');
  const plusTard = document.getElementById('btn-plus-tard');
  const togglePin = document.getElementById('toggle-pin');

  if (Session.get() && Session.code()) {
    window.location.replace('/dashboard');
    return;
  }

  const annee = document.getElementById('year-side');
  if (annee) annee.textContent = new Date().getFullYear();

  let etape = 1;
  let codeUtilisateur = null;
  let assurances = [];

  const SOUS_TITRES = {
    1: 'Étape 1 sur 3 — vos informations personnelles.',
    2: 'Étape 2 sur 3 — la sécurité de votre compte.',
    3: 'Étape 3 sur 3 (facultative) — le profil de votre pharmacie.',
  };

  /* ------------------------------ Utilitaires ----------------------------- */

  function setError(name, message) {
    const champ = form.querySelector(`[data-error-for="${name}"]`);
    if (!champ) return;
    champ.textContent = message || '';
    champ.classList.toggle('hidden', !message);
  }

  function effacerErreurs() {
    form.querySelectorAll('[data-error-for]').forEach((champ) => {
      champ.textContent = '';
      champ.classList.add('hidden');
    });
    erreurBox.classList.add('hidden');
    succesBox.classList.add('hidden');
  }

  function setChargement(activ) {
    bouton.disabled = activ;
    bouton.querySelector('[data-spinner]').hidden = !activ;
    bouton.querySelector('[data-label]').textContent = activ
      ? 'Traitement en cours'
      : labelBouton();
  }

  function labelBouton() {
    if (etape === 3) return 'Créer ma pharmacie';
    return 'Continuer';
  }

  function afficherErreur(message) {
    erreurBox.textContent = message;
    erreurBox.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Format ivoirien : +225 suivi des 10 chiffres. Le 0 initial est conservé,
  // c'est le format utilisé par la base et par l'application mobile.
  function normaliserNumero(valeur) {
    let chiffres = valeur.replace(/\D/g, '');
    if (chiffres.startsWith('225')) chiffres = chiffres.slice(3);
    return `+225${chiffres}`;
  }

  function valeur(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  /* ------------------------------ Localisation ----------------------------- */

  /* Renvoie null si aucun GPS n'est saisi, false si la saisie est incomplète ou
     invalide, sinon les deux valeurs à transmettre. */
  function coordonneesSaisies() {
    const latitude = valeur('latitude');
    const longitude = valeur('longitude');
    if (!latitude && !longitude) return null;
    if (!latitude || !longitude) return false;

    const lat = Number(latitude);
    const lon = Number(longitude);
    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lon) ||
      lat < -90 ||
      lat > 90 ||
      lon < -180 ||
      lon > 180
    ) {
      return false;
    }
    return { latitude, longitude };
  }

  function remplirPositionActuelle() {
    if (!navigator.geolocation) {
      afficherErreur("La géolocalisation n'est pas disponible sur ce navigateur.");
      return;
    }

    const bouton = document.getElementById('btn-position');
    bouton.disabled = true;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        document.getElementById('latitude').value = position.coords.latitude.toFixed(6);
        document.getElementById('longitude').value = position.coords.longitude.toFixed(6);
        bouton.disabled = false;
      },
      () => {
        bouton.disabled = false;
        afficherErreur('Impossible de récupérer votre position. Saisissez les coordonnées manuellement.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }

  /* -------------------------------- Photo --------------------------------- */

  const TAILLE_MAX_PHOTO = 5 * 1024 * 1024; // 5 Mo
  const DIMENSION_MAX_PHOTO = 1600; // px (côté le plus long)

  function formaterTaille(octets) {
    if (octets >= 1024 * 1024) return (octets / (1024 * 1024)).toFixed(1) + ' Mo';
    return Math.max(1, Math.round(octets / 1024)) + ' Ko';
  }

  // Redimensionne et recompresse l'image côté navigateur (canvas) pour limiter
  // le poids envoyé. En cas d'échec, le fichier d'origine est renvoyé tel quel.
  function compresserImage(fichier, dimensionMax) {
    return new Promise((resolve) => {
      if (!/^image\//.test(fichier.type) || typeof document.createElement('canvas').getContext !== 'function') {
        resolve(fichier);
        return;
      }
      const image = new Image();
      const url = URL.createObjectURL(fichier);
      image.onload = () => {
        try {
          const ratio = Math.min(1, dimensionMax / Math.max(image.width, image.height));
          const largeur = Math.max(1, Math.round(image.width * ratio));
          const hauteur = Math.max(1, Math.round(image.height * ratio));
          const canvas = document.createElement('canvas');
          canvas.width = largeur;
          canvas.height = hauteur;
          canvas.getContext('2d').drawImage(image, 0, 0, largeur, hauteur);
          canvas.toBlob(
            (blob) => {
              URL.revokeObjectURL(url);
              if (!blob) { resolve(fichier); return; }
              resolve(new File([blob], 'photo-pharmacie.jpg', { type: 'image/jpeg' }));
            },
            'image/jpeg',
            0.8
          );
        } catch (err) {
          URL.revokeObjectURL(url);
          resolve(fichier);
        }
      };
      image.onerror = () => { URL.revokeObjectURL(url); resolve(fichier); };
      image.src = url;
    });
  }

  /* -------------------------------- Étapes -------------------------------- */

  function definirEtape(numero) {
    etape = numero;

    form.querySelectorAll('[data-step]').forEach((section) => {
      section.classList.toggle('hidden', Number(section.dataset.step) !== numero);
    });

    document.querySelectorAll('[data-step-bar]').forEach((barre) => {
      const active = Number(barre.dataset.stepBar) <= numero;
      barre.classList.toggle('bg-brand-600', active);
      barre.classList.toggle('bg-slate-200', !active);
    });

    document.querySelectorAll('[data-aside-step]').forEach((item) => {
      const actif = Number(item.dataset.asideStep) === numero;
      item.classList.toggle('opacity-60', !actif);
      const pastille = item.firstElementChild;
      if (pastille) {
        pastille.className = actif
          ? 'flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-brand-800 text-xs font-bold'
          : 'flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/15 text-white text-xs font-bold';
      }
    });

    sousTitre.textContent = SOUS_TITRES[numero] || '';
    retour.hidden = numero === 1;
    if (plusTard) plusTard.hidden = numero !== 3;
    bouton.querySelector('[data-label]').textContent = labelBouton();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function majRecapEtat() {
    const boite = document.getElementById('recap-etat');
    if (!boite) return;
    /* L'inscription web est réservée aux gestionnaires de pharmacie. */
    const profil = 'Gestionnaire de pharmacie';
    boite.innerHTML =
      `<span class="font-semibold text-slate-900">${escapeHtml(valeur('prenom'))} ${escapeHtml(valeur('nom'))}</span> — ${profil}<br />` +
      `${escapeHtml(normaliserNumero(valeur('numero')))} · ${escapeHtml(valeur('ville') || 'Ville non renseignée')}` +
      (valeur('assurance') ? ` · ${escapeHtml(valeur('assurance'))}` : '');
  }

  /* ------------------------------- Assurances ----------------------------- */

  async function chargerAssurances() {
    const select = document.getElementById('assurance');
    const liste = document.getElementById('assurances-liste');
    try {
      const reponse = await Api.get(Endpoints.assurances);
      const data = reponse && reponse.data ? reponse.data : reponse;
      assurances = Array.isArray(data) ? data : [];
    } catch (err) {
      assurances = [];
    }

    const options = ['<option value="">Aucune assurance</option>']
      .concat(assurances.map((a) => `<option value="${escapeHtml(a.nom_assurance)}">${escapeHtml(a.nom_assurance)}</option>`));
    if (select) select.innerHTML = options.join('');

    if (liste) {
      if (!assurances.length) {
        liste.innerHTML = '<p class="text-sm text-slate-400">Aucune assurance disponible pour le moment.</p>';
      } else {
        liste.innerHTML = assurances
          .map(
            (a) => `
          <label class="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
            <input type="checkbox" name="assurances" value="${escapeHtml(a.nom_assurance)}"
                   class="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
            ${escapeHtml(a.nom_assurance)}
          </label>`
          )
          .join('');
      }
    }
  }

  /* ------------------------------ Validations ----------------------------- */

  function validerEtape1() {
    let valide = true;

    if (valeur('nom').length < 2) {
      setError('nom', 'Indiquez votre nom.');
      valide = false;
    }
    if (valeur('prenom').length < 2) {
      setError('prenom', 'Indiquez votre prénom.');
      valide = false;
    }
    if (normaliserNumero(valeur('numero')).replace(/\D/g, '').length < 8) {
      setError('numero', 'Saisissez un numéro de téléphone valide.');
      valide = false;
    }
    if (!valeur('ville')) {
      setError('ville', 'Indiquez votre ville.');
      valide = false;
    }
    if (valeur('adresse').length < 4) {
      setError('adresse', 'Indiquez votre adresse.');
      valide = false;
    }

    return valide;
  }

  function validerEtape2() {
    let valide = true;
    const pin = valeur('pin');
    const confirmation = valeur('pin-confirmation');

    if (!/^\d{4,6}$/.test(pin)) {
      setError('pin', 'Le code PIN doit comporter entre 4 et 6 chiffres.');
      valide = false;
    }
    if (confirmation !== pin) {
      setError('pin-confirmation', 'Les deux codes PIN ne correspondent pas.');
      valide = false;
    }

    return valide;
  }

  function validerEtape3() {
    let valide = true;

    if (valeur('nom-pharmacie').length < 2) {
      setError('nom-pharmacie', 'Indiquez le nom de la pharmacie.');
      valide = false;
    }
    if (normaliserNumero(valeur('numero-pharmacie')).replace(/\D/g, '').length < 8) {
      setError('numero-pharmacie', 'Indiquez le numéro de la pharmacie.');
      valide = false;
    }

    const email = valeur('email-pharmacie');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('email-pharmacie', 'Adresse email invalide.');
      valide = false;
    }

    if (coordonneesSaisies() === false) {
      setError('coordonnees', 'Renseignez une latitude et une longitude valides (ou laissez les deux champs vides).');
      valide = false;
    }

    return valide;
  }

  /* ------------------------------ Appels API ------------------------------ */

  async function creerCompte() {
    const reponse = await Api.post(Endpoints.inscription, {
      nomUtilisateur: valeur('nom'),
      prenomUtilisateur: valeur('prenom'),
      numeroUtilisateur: normaliserNumero(valeur('numero')),
      codePinUtilisateur: valeur('pin'),
      type_utilisateur: CONFIG.TYPE_GERANT,
      assuranceUtilisateur: valeur('assurance'),
      adresseUtilisateur: valeur('adresse'),
      ville_utilisateur: valeur('ville'),
    });

    const data = reponse && reponse.data ? reponse.data : reponse;
    if (!data || !data.code_utilisateur) {
      throw new ApiError(reponse.message || "L'inscription a échoué.", 400);
    }

    return data;
  }

  async function creerPharmacie() {
    const formulaire = new FormData();
    formulaire.append('code_gerant', codeUtilisateur);
    formulaire.append('nom_pharmacie', valeur('nom-pharmacie'));
    formulaire.append('numero_pharmacie', normaliserNumero(valeur('numero-pharmacie')));
    formulaire.append('email_pharmacie', valeur('email-pharmacie'));
    formulaire.append('ville_pharmacie', valeur('ville-pharmacie') || valeur('ville'));
    formulaire.append('adresse_fournit', valeur('adresse-pharmacie') || valeur('adresse'));
    formulaire.append('horaires_en_semaine', valeur('horaire-semaine') || '08:30 - 21:30');
    formulaire.append('horaires_samedi', valeur('horaire-samedi') || '08:30 - 15:30');
    formulaire.append('horaires_dimanche', valeur('horaire-dimanche') || 'Fermée');

    const coordonnees = coordonneesSaisies();
    if (coordonnees) {
      formulaire.append('latitudePharmacie', coordonnees.latitude);
      formulaire.append('longitudePharmacie', coordonnees.longitude);
    } else {
      /* Valeur par défaut attendue par l'API : coordonnées non renseignées. */
      formulaire.append('latitudePharmacie', '0');
      formulaire.append('longitudePharmacie', '0');
    }

    const choisies = Array.from(form.querySelectorAll('input[name="assurances"]:checked'))
      .map((case_) => case_.value);
    formulaire.append('liste_assurance_accepte', JSON.stringify(choisies));

    const photo = document.getElementById('photo');
    if (photo && photo.files && photo.files[0]) {
      const compressee = await compresserImage(photo.files[0], DIMENSION_MAX_PHOTO);
      formulaire.append('photo', compressee);
    }

    return Api.send(Endpoints.ajouterPharmacie, formulaire);
  }

  function enregistrerSession(data) {
    Session.save({
      jwt: data.jwt_tokens || '',
      refreshToken: data.refresh_token || '',
      codeUtilisateur: data.code_utilisateur,
      nomUtilisateur: data.nom_utilisateur || '',
      prenomUtilisateur: data.prenom_utilisateur || '',
      numeroUtilisateur: data.numeros_utilisateur || normaliserNumero(valeur('numero')),
      typeUtilisateur: data.type_utilisateur || '',
      assuranceUtilisateur: data.assurance_utilisateur || '',
      adresseUtilisateur: data.adresse_utilisateur || '',
      villeUtilisateur: data.ville_utilisateur || '',
    });
  }

  /* -------------------------------- Événements ---------------------------- */

  togglePin.addEventListener('click', () => {
    const cache = document.getElementById('pin').type === 'password';
    document.getElementById('pin').type = cache ? 'text' : 'password';
    togglePin.textContent = cache ? 'Masquer' : 'Afficher';
  });

  retour.addEventListener('click', () => {
    effacerErreurs();
    definirEtape(Math.max(1, etape - 1));
  });

  /* Le compte gérant est déjà créé à l'étape 2 : la pharmacie peut être
     renseignée plus tard depuis le tableau de bord. */
  if (plusTard) {
    plusTard.addEventListener('click', () => {
      window.location.href = '/dashboard#/profil';
    });
  }

  const champPhoto = document.getElementById('photo');
  const photoErreur = document.getElementById('photo-error');
  const photoApercu = document.getElementById('photo-preview');
  const photoApercuImg = document.getElementById('photo-preview-img');
  const photoApercuNom = document.getElementById('photo-preview-nom');
  const photoApercuTaille = document.getElementById('photo-preview-taille');
  let apercuUrl = null;

  function reinitialiserPhoto() {
    if (champPhoto) champPhoto.value = '';
    if (apercuUrl) { URL.revokeObjectURL(apercuUrl); apercuUrl = null; }
    if (photoApercu) { photoApercu.classList.add('hidden'); photoApercu.classList.remove('flex'); }
    if (photoApercuImg) photoApercuImg.removeAttribute('src');
    const libelle = document.getElementById('photo-label');
    if (libelle) libelle.textContent = 'JPEG, PNG ou WEBP — 5 Mo maximum';
  }

  function afficherErreurPhoto(message) {
    if (!photoErreur) return;
    photoErreur.textContent = message || '';
    photoErreur.classList.toggle('hidden', !message);
  }

  if (champPhoto) {
    champPhoto.addEventListener('change', () => {
      afficherErreurPhoto('');
      const fichier = champPhoto.files && champPhoto.files[0];
      if (!fichier) { reinitialiserPhoto(); return; }

      if (!/^image\//.test(fichier.type)) {
        afficherErreurPhoto('Choisissez un fichier image (JPEG, PNG ou WEBP).');
        reinitialiserPhoto();
        return;
      }
      if (fichier.size > TAILLE_MAX_PHOTO) {
        afficherErreurPhoto(
          'Fichier trop volumineux (' + formaterTaille(fichier.size) + '). La taille maximale est de 5 Mo.'
        );
        reinitialiserPhoto();
        return;
      }

      const libelle = document.getElementById('photo-label');
      if (libelle) libelle.textContent = fichier.name;

      if (apercuUrl) URL.revokeObjectURL(apercuUrl);
      apercuUrl = URL.createObjectURL(fichier);
      if (photoApercuImg) photoApercuImg.src = apercuUrl;
      if (photoApercuNom) photoApercuNom.textContent = fichier.name;
      if (photoApercuTaille) {
        photoApercuTaille.textContent = formaterTaille(fichier.size) + ' — compressée avant l\'envoi';
      }
      if (photoApercu) { photoApercu.classList.remove('hidden'); photoApercu.classList.add('flex'); }
    });
  }

  const boutonRetirerPhoto = document.getElementById('photo-retirer');
  if (boutonRetirerPhoto) {
    boutonRetirerPhoto.addEventListener('click', () => {
      afficherErreurPhoto('');
      reinitialiserPhoto();
    });
  }

  const boutonPosition = document.getElementById('btn-position');
  if (boutonPosition) {
    boutonPosition.addEventListener('click', remplirPositionActuelle);
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    effacerErreurs();

    if (etape === 1) {
      if (!validerEtape1()) return;
      majRecapEtat();
      definirEtape(2);
      return;
    }

    if (etape === 2) {
      if (!validerEtape2()) return;

      setChargement(true);
      try {
        const data = await creerCompte();
        codeUtilisateur = data.code_utilisateur;

        enregistrerSession(data);
        definirEtape(3);
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : 'Inscription impossible pour le moment. Réessayez dans quelques instants.';
        if (err instanceof ApiError && err.status === 409) {
          afficherErreur(`${message} Connectez-vous avec ce numéro.`);
        } else {
          afficherErreur(message);
        }
      } finally {
        setChargement(false);
      }
      return;
    }

    // Étape 3 : création de la pharmacie
    if (!validerEtape3()) return;

    setChargement(true);
    try {
      await creerPharmacie();
      Toast.success('Votre pharmacie a été créée.');
      window.location.href = '/dashboard#/profil';
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'La création de la pharmacie a échoué.';
      afficherErreur(message);
      setChargement(false);
    }
  });

  definirEtape(1);
  chargerAssurances();
})();
