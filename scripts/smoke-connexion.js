/* Test de fumée : formulaire de connexion (validation, appel API, session, refus de profil). */
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

async function scenario(typeUtilisateur) {
  const erreurs = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (e) => {
    if (!/navigation/i.test(e.message)) erreurs.push(e.message);
  });

  let payloadEnvoye = null;

  const dom = await chargerPage('connexion.php', {
    virtualConsole,
    beforeParse(window) {
      window.Element.prototype.animate = function () {
        return { onfinish: null, cancel() {} };
      };
      window.fetch = async (url, init) => {
        payloadEnvoye = init && init.body ? JSON.parse(init.body) : null;
        return {
          ok: true,
          status: 200,
          headers: { get: () => null },
          text: async () =>
            JSON.stringify({
              success: true,
              data: {
                code_utilisateur: 'GERANT001',
                nom_utilisateur: 'Koné',
                prenom_utilisateur: 'Ibrahim',
                numeros_utilisateur: '+2250701010101',
                type_utilisateur: typeUtilisateur,
                jwt_tokens: 'jwt-test',
              },
            }),
        };
      };
    },
  });

  const w = dom.window;
  const $ = (sel) => w.document.querySelector(sel);
  const controles = [];
  const verifier = (libelle, ok, detail = '') => controles.push({ libelle, ok, detail });

  try {
    // Attendre l'exécution de connexion.js (remplissage de l'année)
    await attendre(() => $('#year-side').textContent.trim() === String(new Date().getFullYear()));

    // 1. Champs vides -> erreurs de validation, aucun appel réseau
    $('#login-form').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
    await attendre(() => !$('[data-error-for="numero"]').classList.contains('hidden'));
    verifier('Validation des champs vides', payloadEnvoye === null);

    // 2. Saisie valide -> appel API avec numéro normalisé
    $('#numero').value = '0701010101';
    $('#pin').value = '123456';
    $('#login-form').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
    await attendre(() => payloadEnvoye !== null);

    verifier(
      'Numéro normalisé en +225',
      payloadEnvoye.numeroUtilisateur === '+2250701010101',
      JSON.stringify(payloadEnvoye)
    );
    verifier('Code PIN transmis', payloadEnvoye.codePinUtilisateur === '123456');

    if (typeUtilisateur === 'Gestionnaire de pharmacie') {
      await attendre(() => w.sessionStorage.getItem('gopharma.pharmacie.session') !== null);
      const session = JSON.parse(w.sessionStorage.getItem('gopharma.pharmacie.session'));
      verifier('Session enregistrée', session.codeUtilisateur === 'GERANT001');
      verifier('Aucun message d’erreur', $('#form-error').classList.contains('hidden'));
    } else {
      await attendre(() => !$('#form-error').classList.contains('hidden'));
      verifier('Message de refus affiché', $('#form-error').textContent.includes('réservé'), $('#form-error').textContent);
      verifier('Session non enregistrée', w.sessionStorage.getItem('gopharma.pharmacie.session') === null);
    }
  } catch (e) {
    verifier('Exécution', false, e.message);
  }

  verifier('Aucune erreur JS', erreurs.length === 0, erreurs.join(' | '));
  w.close();
  return controles;
}

(async () => {
  const gestionnaire = await scenario('Gestionnaire de pharmacie');
  const client = await scenario('Client / Patient');

  const tous = [...gestionnaire.map((c) => ({ ...c, libelle: `[gérant] ${c.libelle}` })), ...client.map((c) => ({ ...c, libelle: `[client] ${c.libelle}` }))];
  const ko = tous.filter((c) => !c.ok);
  tous.forEach((c) => console.log(`${c.ok ? 'OK  ' : 'ECHEC'} ${c.libelle}${c.detail ? ` [${c.detail}]` : ''}`));
  console.log(`\n${tous.length - ko.length}/${tous.length} contrôles réussis`);
  process.exit(ko.length ? 1 : 0);
})();
