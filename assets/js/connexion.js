/* Connexion à l'espace gérant. */

(function () {
  const form = document.getElementById('login-form');
  const numeroInput = document.getElementById('numero');
  const pinInput = document.getElementById('pin');
  const rememberInput = document.getElementById('remember');
  const errorBox = document.getElementById('form-error');
  const submitBtn = document.getElementById('submit-btn');
  const togglePin = document.getElementById('toggle-pin');

  if (Session.get() && Session.code()) {
    window.location.replace('dashboard.php');
    return;
  }

  const savedNumero = localStorage.getItem('gopharma.numero');
  if (savedNumero) {
    numeroInput.value = savedNumero;
    rememberInput.checked = true;
  }

  const yearSide = document.getElementById('year-side');
  if (yearSide) yearSide.textContent = new Date().getFullYear();

  // Message affiché après une inscription réussie (inscription.php).
  const succesBox = document.getElementById('form-success');
  const parametres = new URLSearchParams(window.location.search);
  const bienvenue = parametres.get('message') ||
    (parametres.get('bienvenue') === '1'
      ? 'Votre compte a été créé. Connectez-vous pour accéder à votre espace.'
      : '');
  if (bienvenue && succesBox) {
    succesBox.textContent = bienvenue;
    succesBox.classList.remove('hidden');
  }

  togglePin.addEventListener('click', () => {
    const hidden = pinInput.type === 'password';
    pinInput.type = hidden ? 'text' : 'password';
    togglePin.textContent = hidden ? 'Masquer' : 'Afficher';
  });

  function setError(name, message) {
    const field = form.querySelector(`[data-error-for="${name}"]`);
    if (!field) return;
    field.textContent = message || '';
    field.classList.toggle('hidden', !message);
  }

  function setLoading(loading) {
    submitBtn.disabled = loading;
    submitBtn.querySelector('[data-spinner]').hidden = !loading;
    submitBtn.querySelector('[data-label]').textContent = loading ? 'Connexion en cours' : 'Se connecter';
  }

  // Format ivoirien : +225 suivi des 10 chiffres. Le 0 initial est conservé,
  // c'est le format utilisé par la base et par l'application mobile.
  function normalizeNumero(value) {
    let digits = value.replace(/\D/g, '');
    if (digits.startsWith('225')) digits = digits.slice(3);
    return `+225${digits}`;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorBox.classList.add('hidden');
    setError('numero', '');
    setError('pin', '');

    const numero = normalizeNumero(numeroInput.value.trim());
    const pin = pinInput.value.trim();

    let valid = true;
    if (numero.replace(/\D/g, '').length < 8) {
      setError('numero', 'Saisissez un numéro de téléphone valide.');
      valid = false;
    }
    if (pin.length < 4) {
      setError('pin', 'Saisissez votre code PIN.');
      valid = false;
    }
    if (!valid) return;

    setLoading(true);

    try {
      const reponse = await Api.post(Endpoints.connexion, {
        numeroUtilisateur: numero,
        codePinUtilisateur: pin,
      });

      const data = reponse && reponse.data ? reponse.data : reponse;
      if (!data || !data.code_utilisateur) {
        throw new ApiError('Identifiants incorrects. Vérifiez votre numéro et votre code PIN.', 401);
      }

      if (data.type_utilisateur !== CONFIG.TYPE_GERANT) {
        throw new ApiError(
          `Ce compte est rattaché au profil « ${data.type_utilisateur || 'utilisateur'} ». L'espace pharmacie est réservé aux gestionnaires.`,
          403
        );
      }

      Session.save({
        jwt: data.jwt_tokens || '',
        codeUtilisateur: data.code_utilisateur,
        nomUtilisateur: data.nom_utilisateur || '',
        prenomUtilisateur: data.prenom_utilisateur || '',
        numeroUtilisateur: data.numeros_utilisateur || numero,
        typeUtilisateur: data.type_utilisateur || '',
        assuranceUtilisateur: data.assurance_utilisateur || '',
        adresseUtilisateur: data.adresse_utilisateur || '',
        villeUtilisateur: data.ville_utilisateur || '',
      });

      if (rememberInput.checked) {
        localStorage.setItem('gopharma.numero', numero);
      } else {
        localStorage.removeItem('gopharma.numero');
      }

      window.location.href = 'dashboard.php';
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Connexion impossible pour le moment. Réessayez dans quelques instants.';
      errorBox.textContent = message;
      errorBox.classList.remove('hidden');
      setLoading(false);
    }
  });
})();
