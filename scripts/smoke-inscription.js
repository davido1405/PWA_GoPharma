/* Test de fumée : parcours d'inscription (3 étapes, validation, appels API). */
const { VirtualConsole } = require('jsdom');
const { chargerPage } = require('./charger-page');

function attendre(condition, timeout = 20000) {
  const debut = Date.now();
  return new Promise((resolve, reject) => {
    const tic = () => {
      let ok = false;
      try {
        ok = condition();
      } catch (e) {
        return reject(e);
      }
      if (ok) return resolve();
      if (Date.now() - debut > timeout) return reject(new Error('délai dépassé'));
      setTimeout(tic, 40);
    };
    tic();
  });
}

const ASSURANCES = [
  { id_assurance: 1, nom_assurance: 'CNPS' },
  { id_assurance: 2, nom_assurance: 'NIMBA' },
  { id_assurance: 3, nom_assurance: 'ALLIANCE' },
];

function reponseJson(payload, ok = true, status = 200) {
  return {
    ok,
    status,
    headers: { get: () => null },
    text: async () => JSON.stringify(payload),
  };
}

async function scenario() {
  const erreurs = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (e) => {
    if (/navigation/i.test(e.message)) return; // redirections de fin de parcours
    erreurs.push(e.message);
  });

  const appels = { inscription: null, pharmacie: null, navigue: null };

  const dom = await chargerPage('inscription.php', {
    virtualConsole,
    beforeParse(window) {
      window.Element.prototype.animate = function () {
        return { onfinish: null, cancel() {} };
      };
      window.scrollTo = () => {};
      window.HTMLElement.prototype.scrollIntoView = () => {};

      window.addEventListener('unhandledrejection', () => {});

      const appelInitial = window.fetch;
      window.fetch = async (url, init = {}) => {
        const cible = typeof url === 'string' ? url : url.toString();

        if (cible.includes('/utilisateur/inscription')) {
          appels.inscription = JSON.parse(init.body);
          return reponseJson({
            success: true,
            data: {
              code_utilisateur: 'USER-TEST-00001',
              nom_utilisateur: 'KOUASSI',
              prenom_utilisateur: 'Aminata',
              numeros_utilisateur: '+2250701010101',
              type_utilisateur: appels.inscription.type_utilisateur,
              jwt_tokens: 'jwt-test',
            },
          });
        }

        if (cible.includes('/pharmacie/ajouterPharmacie')) {
          appels.pharmacie = init.body;
          return reponseJson({
            success: true,
            data: { code_pharmacie: 'PHARM-TEST-00001' },
          });
        }

        if (cible.includes('/assurance')) {
          return reponseJson({ success: true, data: ASSURANCES });
        }

        if (appelInitial && cible.includes('about:blank')) return appelInitial(url, init);

        return reponseJson({ success: false, message: 'route inconnue' }, false, 404);
      };
    },
  });

  const w = dom.window;
  const $ = (sel) => w.document.querySelector(sel);
  const visible = (sel) => !$(sel).classList.contains('hidden');
  const soumettre = () =>
    $('#inscription-form').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));

  const controles = [];
  const verifier = (libelle, ok, detail = '') => controles.push({ libelle, ok, detail });

  try {
    await attendre(() => $('#assurance').options.length > 1);
    verifier('Liste des assurances chargée', $('#assurance').options.length === ASSURANCES.length + 1);
    verifier('Case « gestionnaire » supprimée', $('#gestionnaire') === null);
    verifier(
      'Mention « réservé au gestionnaire de pharmacie »',
      /réservé au gestionnaire de pharmacie/i.test(w.document.body.textContent)
    );

    // Étape 1 : champs vides -> erreurs, aucun appel réseau.
    soumettre();
    await attendre(() => ! $('[data-error-for="nom"]').classList.contains('hidden'));
    verifier('Validation étape 1', appels.inscription === null);

    // Étape 1 : saisie valide -> passage à l'étape 2.
    $('#nom').value = 'KOUASSI';
    $('#prenom').value = 'Aminata';
    $('#numero').value = '0701010101';
    $('#ville').value = 'Abidjan';
    $('#adresse').value = 'Cocody, Angré 8e tranche';
    soumettre();
    await attendre(() => visible('[data-step="2"]'));
    verifier('Passage à l\'étape 2', visible('[data-step="2"]') && !visible('[data-step="1"]'));
    verifier('Étiquette de l\'étape 2',
      $('#step-subtitle').textContent.toLowerCase().includes('étape 2'),
      $('#step-subtitle').textContent);

    // Étape 2 : confirmation PIN erronée.
    $('#pin').value = '123456';
    $('#pin-confirmation').value = '12345';
    soumettre();
    await attendre(() => ! $('[data-error-for="pin-confirmation"]').classList.contains('hidden'));
    verifier('Confirmation PIN contrôlée', appels.inscription === null);

    // Étape 2 : création du compte.
    $('#pin-confirmation').value = '123456';
    soumettre();
    await attendre(() => appels.inscription !== null);
    verifier('Numéro normalisé (+225)', appels.inscription.numeroUtilisateur === '+2250701010101',
      JSON.stringify(appels.inscription));
    verifier('Code PIN transmis', appels.inscription.codePinUtilisateur === '123456');
    verifier(
      'Type d\'utilisateur transmis (gestionnaire)',
      appels.inscription.type_utilisateur === 'Gestionnaire de pharmacie',
      String(appels.inscription.type_utilisateur)
    );

    await attendre(() => visible('[data-step="3"]'));
    verifier('Passage à l\'étape pharmacie', visible('[data-step="3"]'));
    verifier('Session enregistrée', w.sessionStorage.getItem('gopharma.pharmacie.session') !== null);
    verifier('Assurances proposées', $('#assurances-liste').querySelectorAll('input').length === ASSURANCES.length);

    // Étape 3 : champs obligatoires.
    soumettre();
    await attendre(() => ! $('[data-error-for="nom-pharmacie"]').classList.contains('hidden'));
    verifier('Validation étape 3', appels.pharmacie === null);

    $('#nom-pharmacie').value = 'Pharmacie des Palmiers';
    $('#numero-pharmacie').value = '0542157865';
    soumettre();
    await attendre(() => appels.pharmacie !== null);

    verifier(
      'Code gérant transmis',
      appels.pharmacie.get('code_gerant') === 'USER-TEST-00001',
      String(appels.pharmacie.get('code_gerant'))
    );
    verifier(
      'Nom de pharmacie transmis',
      appels.pharmacie.get('nom_pharmacie') === 'Pharmacie des Palmiers',
      String(appels.pharmacie.get('nom_pharmacie'))
    );
    verifier('Horaires transmis', Boolean(appels.pharmacie.get('horaires_en_semaine')));
    verifier('Assurances cochées transmises', appels.pharmacie.get('liste_assurance_accepte') !== null);
    verifier('Aucune erreur JS', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    verifier('Exécution', false, e.message);
  }

  w.close();
  return controles;
}

(async () => {
  const tous = await scenario();

  const ko = tous.filter((c) => !c.ok);
  tous.forEach((c) => console.log(`${c.ok ? 'OK  ' : 'ECHEC'} ${c.libelle}${c.detail ? ` [${c.detail}]` : ''}`));
  console.log(`\n${tous.length - ko.length}/${tous.length} contrôles réussis`);
  process.exit(ko.length ? 1 : 0);
})();
