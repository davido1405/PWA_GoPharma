/* Test de fumée : page d'accueil (structure, menu mobile, aucune erreur JS). */
const { JSDOM, VirtualConsole } = require('jsdom');
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

(async () => {
  const erreurs = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (e) => erreurs.push(e.message));

  const dom = await chargerPage('index.php', {
    virtualConsole,
    beforeParse(window) {
      window.Element.prototype.animate = function () {
        return { onfinish: null, cancel() {} };
      };
    },
  });

  const w = dom.window;
  const $ = (sel) => w.document.querySelector(sel);
  const nb = (sel) => w.document.querySelectorAll(sel).length;
  const controles = [];
  const verifier = (libelle, ok, detail = '') => controles.push({ libelle, ok, detail });

  try {
    await attendre(() => $('#year').textContent.trim() === String(new Date().getFullYear()));
    verifier('Année dynamique du pied de page', true);

    verifier('Logo présent', $('#header-logo') !== null || nb('img[alt="GoPharma"]') >= 1);
    verifier('Hero principal', $('h1').textContent.includes('Gérez votre pharmacie'), $('h1').textContent.trim().slice(0, 40));
    verifier('6 fonctionnalités', nb('#fonctionnalites article') === 6, String(nb('#fonctionnalites article')));
    verifier('3 étapes', nb('#fonctionnement .rounded-2xl') === 3, String(nb('#fonctionnement .rounded-2xl')));
    verifier('3 forfaits', nb('#forfaits .card') === 3, String(nb('#forfaits .card')));
    verifier('Lien connexion présent', nb('a[href="connexion.php"]') >= 2, String(nb('a[href="connexion.php"]')));
    verifier('Lien inscription présent', nb('a[href="inscription.php"]') >= 1, String(nb('a[href="inscription.php"]')));
    verifier('Liens d’ancre', nb('a[href^="#"]') >= 4, String(nb('a[href^="#"]')));

    const menu = $('#nav-mobile');
    verifier('Menu mobile masqué au départ', menu.classList.contains('hidden'));
    $('#nav-toggle').dispatchEvent(new w.Event('click', { bubbles: true }));
    verifier('Menu mobile ouvert au clic', !menu.classList.contains('hidden'));

    verifier('Aucune erreur JS', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    verifier('Exécution', false, e.message);
  }

  const ko = controles.filter((c) => !c.ok);
  controles.forEach((c) => console.log(`${c.ok ? 'OK  ' : 'ECHEC'} ${c.libelle}${c.detail ? ` [${c.detail}]` : ''}`));
  console.log(`\n${controles.length - ko.length}/${controles.length} contrôles réussis`);
  w.close();
  process.exit(ko.length ? 1 : 0);
})();
