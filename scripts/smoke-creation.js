/* Test de fumée : un gérant sans pharmacie doit pouvoir en créer une depuis le profil. */
const { VirtualConsole } = require('jsdom');
const { chargerPage } = require('./charger-page');

const ASSURANCES = [
  { id_assurance: 1, nom_assurance: 'CNPS' },
  { id_assurance: 2, nom_assurance: 'NIMBA' },
  { id_assurance: 3, nom_assurance: 'ALLIANCE' },
  { id_assurance: 4, nom_assurance: 'AXA ASSURANCE CI' },
  { id_assurance: 5, nom_assurance: 'SAAR' },
];

const FORFAITS = [
  { id_forfait: 1, nom_forfait: 'Gratuit', prix: 0, duree_jours: 365, fonctionnalites: [{ nom: 'Profil de base' }] },
  { id_forfait: 2, nom_forfait: 'Standard', prix: 15000, duree_jours: 30, fonctionnalites: [{ nom: 'Annonces', limite: 5 }] },
  { id_forfait: 3, nom_forfait: 'Premium', prix: 30000, duree_jours: 30, fonctionnalites: [{ nom: 'Statistiques avancées' }] },
];

/* La pharmacie n'existe pas au départ : elle naît pendant le test. */
let pharmacieCreee = null;
const appels = [];

function reponse(data) {
  return {
    ok: true,
    status: 200,
    headers: { get: () => null },
    text: async () => JSON.stringify({ success: true, data }),
  };
}

function reponseErreur(message, status = 404) {
  return {
    ok: false,
    status,
    headers: { get: () => null },
    text: async () => JSON.stringify({ success: false, message }),
  };
}

function router(url, init = {}) {
  const cible = typeof url === 'string' ? url : url.toString();
  appels.push({ url: cible, init });

  if (cible.includes('/pharmacie/profilPharmacie')) return reponse(pharmacieCreee);

  if (cible.includes('/pharmacie/ajouterPharmacie')) {
    const form = init.body;
    const champs = {};
    if (form && typeof form.get === 'function') {
      for (const [cle, valeur] of form.entries()) champs[cle] = valeur;
    }
    pharmacieCreee = {
      code_pharmacie: 'PHARM-TEST-CREEE',
      nom_pharmacie: champs.nom_pharmacie || '',
      photo_pharmacie: null,
      numeros_pharmacie: champs.numero_pharmacie || '',
      email_pharmacie: champs.email_pharmacie || '',
      adresse_fournit: champs.adresse_fournit || '',
      nom_ville: champs.ville_pharmacie || 'Abidjan',
      ville_pharmacie: champs.ville_pharmacie || 'Abidjan',
      libelle_statut: 'Actif',
      statut_garde: 0,
      horaire_semaine: champs.horaires_en_semaine || '08:00 - 20:00',
      horaire_samedi: champs.horaires_samedi || '08:00 - 14:00',
      horaire_dimanche: champs.horaires_dimanche || 'Fermée',
      assurances_acceptees: [],
    };
    return reponse(pharmacieCreee);
  }

  if (cible.includes('/assurance')) return reponse(ASSURANCES);
  if (cible.includes('/abonnements/forfaits')) return reponse(FORFAITS);
  if (cible.includes('/abonnements/actif')) return reponse(null);
  if (cible.includes('/abonnements/historique')) return reponse([]);
  if (cible.includes('/abonnements/utilisation')) return reponse([]);
  if (cible.includes('/abonnements/verifier-acces')) {
    return reponse({ acces: true, limite: null, utilise: 0, restant: null });
  }
  if (cible.includes('/annonces/pharmacie')) return reponse([]);
  if (cible.includes('abonnement')) return reponse([]);

  return reponseErreur('route inconnue : ' + cible);
}

const erreurs = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on('jsdomError', (e) => erreurs.push(`jsdomError: ${e.message}`));
virtualConsole.on('error', (...args) => erreurs.push(`console.error: ${args.join(' ')}`));

function attendre(condition, timeout = 20000) {
  const debut = Date.now();
  return new Promise((resolve, reject) => {
    const tic = () => {
      let resultat = false;
      try {
        resultat = condition();
      } catch (e) {
        return reject(e);
      }
      if (resultat) return resolve();
      if (Date.now() - debut > timeout) return reject(new Error('délai dépassé'));
      setTimeout(tic, 40);
    };
    tic();
  });
}

(async () => {
  const dom = await chargerPage('dashboard.php', {
    virtualConsole,
    beforeParse(window) {
      window.sessionStorage.setItem(
        'gopharma.pharmacie.session',
        JSON.stringify({
          jwt: 'jwt-test',
          codeUtilisateur: 'GERANT-SANS-PHARMACIE',
          nomUtilisateur: 'Soro',
          prenomUtilisateur: 'Kadi',
          typeUtilisateur: 'Gestionnaire de pharmacie',
          villeUtilisateur: 'Abidjan',
          adresseUtilisateur: 'Cocody, Angré 8e tranche',
          numeroUtilisateur: '+2250701010101',
        })
      );

      window.Element.prototype.animate = function () {
        const anim = { onfinish: null, cancel() {} };
        setTimeout(() => anim.onfinish && anim.onfinish(), 0);
        return anim;
      };
      window.scrollTo = () => {};
      window.HTMLElement.prototype.scrollIntoView = () => {};

      window.fetch = async (url, init = {}) => router(url, init);
    },
  });

  const w = dom.window;
  const $ = (sel) => w.document.querySelector(sel);
  const visible = (sel) => {
    const el = $(sel);
    return Boolean(el) && !el.classList.contains('hidden');
  };
  const controles = [];
  const verifier = (libelle, ok, detail = '') => controles.push({ libelle, ok, detail });

  try {
    // ---- État initial : compte gérant sans pharmacie ----
    await attendre(() => $('#save-profil-label').textContent === 'Créer ma pharmacie');
    verifier('Libellé « Créer ma pharmacie »', true);

    verifier('Bannière de création visible', visible('#profil-creation'));
    verifier('Carte de garde masquée', !visible('#garde-carte'));
    verifier('Invitation sur l’accueil visible', visible('#accueil-creation'));
    verifier(
      'Accueil sans pharmacie',
      $('[data-field="pharmacie-nom"]').textContent === 'Aucune pharmacie',
      $('[data-field="pharmacie-nom"]').textContent
    );

    // ---- Création depuis la section Profil ----
    w.location.hash = '#/profil';
    await attendre(() => visible('[data-view="profil"]'));
    verifier('Section profil ouverte', visible('[data-view="profil"]'));

    verifier('Ville préremplie depuis le compte', $('#ville').value === 'Abidjan', $('#ville').value);
    verifier(
      'Adresse préremplie depuis le compte',
      $('#adresse').value === 'Cocody, Angré 8e tranche',
      $('#adresse').value
    );
    verifier('Téléphone prérempli', $('#telephone').value === '+2250701010101', $('#telephone').value);
    verifier('Nom de pharmacie vide', $('#nom-pharmacie').value === '');

    $('#nom-pharmacie').value = 'Pharmacie du Plateau';
    $('#email').value = 'contact@plateau.ci';
    $('#latitude').value = '5.359951';
    $('#longitude').value = '-4.008256';
    $('#save-profil').dispatchEvent(new w.Event('click', { bubbles: true }));

    await attendre(() => appels.some((a) => a.url.includes('/pharmacie/ajouterPharmacie')));
    const appelCreation = appels.find((a) => a.url.includes('/pharmacie/ajouterPharmacie'));
    const corps = appelCreation.init.body;
    verifier(
      'Création envoyée au bon endpoint (POST)',
      appelCreation.init.method === undefined || appelCreation.init.method === 'POST',
      appelCreation.init.method
    );
    verifier('Code gérant transmis', corps.get('code_gerant') === 'GERANT-SANS-PHARMACIE',
      String(corps.get('code_gerant')));
    verifier('Nom de pharmacie transmis', corps.get('nom_pharmacie') === 'Pharmacie du Plateau',
      String(corps.get('nom_pharmacie')));
    verifier('Assurances cochées transmises', typeof corps.get('liste_assurance_accepte') === 'string',
      String(corps.get('liste_assurance_accepte')));
    verifier(
      'Coordonnées GPS transmises',
      corps.get('latitudePharmacie') === '5.359951' && corps.get('longitudePharmacie') === '-4.008256',
      `${corps.get('latitudePharmacie')} / ${corps.get('longitudePharmacie')}`
    );

    // ---- Après création : le mode création disparaît ----
    await attendre(() => $('#save-profil-label').textContent === 'Enregistrer les modifications');
    verifier('Retour au mode modification', true);
    verifier('Bannière de création masquée', !visible('#profil-creation'));
    verifier('Carte de garde réaffichée', visible('#garde-carte'));
    verifier('Invitation masquée sur l’accueil', !visible('#accueil-creation'));
    verifier(
      'Nom de la pharmacie créée affiché',
      $('#nom-pharmacie').value === 'Pharmacie du Plateau',
      $('#nom-pharmacie').value
    );
  } catch (e) {
    verifier('Exécution', false, e.message);
  }

  verifier('Aucune erreur JS', erreurs.length === 0, erreurs.join(' | '));

  const ko = controles.filter((c) => !c.ok);
  controles.forEach((c) => console.log(`${c.ok ? 'OK  ' : 'ECHEC'} ${c.libelle}${c.detail ? ` [${c.detail}]` : ''}`));
  console.log(`\n${controles.length - ko.length}/${controles.length} contrôles réussis`);
  w.close();
  process.exit(ko.length ? 1 : 0);
})();
