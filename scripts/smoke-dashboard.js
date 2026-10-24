/* Test de fumée : charge dashboard.php dans jsdom avec des données simulées. */
const { VirtualConsole } = require('jsdom');
const { chargerPage } = require('./charger-page');

const fixtures = {
  '/api/pharmacie/profilPharmacie': {
    code_pharmacie: 'PHARM-20260304-O9NH2',
    nom_pharmacie: 'Pharmacie test',
    photo_pharmacie: null,
    numeros_pharmacie: '0542157865',
    email_pharmacie: 'test.pharmacie@gmail.com',
    adresse_fournit: 'Cocody, Abidjan',
    nom_ville: 'Abidjan',
    libelle_statut: 'Actif',
    statut_garde: 1,
    derniere_maj_garde: '2026-03-29 18:19:46',
    horaire_semaine: '10:30 - 21:30',
    horaire_samedi: '08:30 - 15:30',
    horaire_dimanche: 'Fermée',
    assurances_acceptees: ['CNPS', 'NIMBA'],
  },
  '/api/assurance': [
    { id_assurance: 1, nom_assurance: 'CNPS' },
    { id_assurance: 2, nom_assurance: 'NIMBA' },
    { id_assurance: 3, nom_assurance: 'ALLIANCE' },
    { id_assurance: 4, nom_assurance: 'AXA ASSURANCE CI' },
    { id_assurance: 5, nom_assurance: 'SAAR' },
  ],
  '/api/abonnements/actif': {
    id_abonnement: 3,
    nom_forfait: 'Standard',
    prix: 15000,
    date_debut: '2026-09-10 00:00:00',
    date_fin: '2026-10-10 00:00:00',
    jours_restants: 14,
    libelle_statut: 'Actif',
  },
  '/api/abonnements/forfaits': [
    {
      id_forfait: 1,
      nom_forfait: 'Gratuit',
      prix: 0,
      duree_jours: 365,
      description: 'Présence de base',
      fonctionnalites: [
        { nom: 'Profil de base' },
        { nom: "Horaires d'ouverture" },
        { nom: 'Localisation' },
      ],
    },
    {
      id_forfait: 2,
      nom_forfait: 'Standard',
      prix: 15000,
      duree_jours: 30,
      description: 'Pour les officines actives',
      fonctionnalites: [
        { nom: 'Annonces', limite: 5 },
        { nom: 'Newsletter', limite: 10 },
      ],
    },
    {
      id_forfait: 3,
      nom_forfait: 'Premium',
      prix: 30000,
      duree_jours: 30,
      description: 'Toutes les fonctionnalités',
      fonctionnalites: [{ nom: 'Statistiques avancées' }],
    },
  ],
  '/api/annonces/pharmacie': [
    {
      id_annonce: 41,
      titre: 'Promotion vitamines',
      contenu: '-20 % sur toute la gamme vitamines jusqu à vendredi.',
      date_publication: '2026-09-20 10:00:00',
      nombreVue: 12,
      libelle_type_annonce: 'Promotion',
    },
    {
      id_annonce: 42,
      titre: 'Fermeture exceptionnelle',
      contenu: 'La pharmacie sera fermée lundi matin.',
      date_publication: '2026-09-22 08:30:00',
      nombreVue: 3,
      libelle_type_annonce: 'Urgence',
    },
  ],
  '/api/newsLetters/abonnement': [
    { id_newsletter: 1, code_utilisateur: 'USER-001', date_abonnement: '2026-09-01 12:00:00', statut_abonnement: 'Actif' },
    { id_newsletter: 2, code_utilisateur: 'USER-002', date_abonnement: '2026-09-12 09:15:00', statut_abonnement: 'Désactivé' },
  ],
  '/api/abonnements/historique/GERANT001': [
    { id_abonnement: 3, nom_forfait: 'Standard', prix: 15000, date_debut: '2026-09-10', date_fin: '2026-10-10', libelle_statut: 'Actif' },
  ],
  '/api/abonnements/verifier-acces': { acces: true, limite: 5, utilise: 2, restant: 3 },
  '/api/abonnements/utilisation': [
    { nom_fonctionnalite: 'Annonces', nb_utilisations: 2, limite: 5 },
    { nom_fonctionnalite: 'Newsletter', nb_utilisations: 1, limite: 10 },
    { nom_fonctionnalite: 'Statistiques de base', nb_utilisations: 3, limite: null },
  ],
};

function reponse(data) {
  return {
    ok: true,
    status: 200,
    headers: { get: () => null },
    text: async () => JSON.stringify({ success: true, data }),
  };
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
          codeUtilisateur: 'GERANT001',
          nomUtilisateur: 'Koné',
          prenomUtilisateur: 'Ibrahim',
          typeUtilisateur: 'Gestionnaire de pharmacie',
        })
      );

      window.Element.prototype.animate = function () {
        const anim = { onfinish: null, cancel() {} };
        setTimeout(() => anim.onfinish && anim.onfinish(), 0);
        return anim;
      };
      window.scrollTo = () => {};
      window.HTMLElement.prototype.scrollIntoView = () => {};

      window.fetch = async (url) => {
        const cible = typeof url === 'string' ? url : url.toString();
        const cle = Object.keys(fixtures).find((k) => cible.includes(k));
        if (cle) return reponse(fixtures[cle]);
        return {
          ok: false,
          status: 404,
          headers: { get: () => null },
          text: async () => JSON.stringify({ success: false, message: 'route inconnue' }),
        };
      };
    },
  });

  const w = dom.window;
  const $ = (sel) => w.document.querySelector(sel);
  const nb = (sel) => w.document.querySelectorAll(sel).length;
  const controles = [];
  const verifier = (libelle, ok, detail = '') => controles.push({ libelle, ok, detail });

  try {
    await attendre(() => $('#user-name').textContent.includes('Ibrahim'));
    verifier('Nom du gérant affiché', true);

    verifier('Forfait dans le bandeau', $('#user-plan').textContent === 'Standard', $('#user-plan').textContent);
    verifier('Nom pharmacie sur l’accueil', $('[data-field="pharmacie-nom"]').textContent === 'Pharmacie test', $('[data-field="pharmacie-nom"]').textContent);
    verifier('Statut garde', $('[data-field="garde-chip"]').textContent === 'De garde', $('[data-field="garde-chip"]').textContent);
    verifier('Stat annonces', $('[data-stat="annonces"]').textContent === '2', $('[data-stat="annonces"]').textContent);
    verifier('Stat abonnés', $('[data-stat="abonnes"]').textContent === '2', $('[data-stat="abonnes"]').textContent);

    await attendre(() => nb('#assurances-list label') === 5);
    verifier('5 assurances listées', nb('#assurances-list label') === 5);
    verifier('2 assurances pré-cochées', nb('#assurances-list input:checked') === 2, String(nb('#assurances-list input:checked')));

    await attendre(() => nb('#forfaits-list article') === 3);
    verifier('3 forfaits affichés', nb('#forfaits-list article') === 3);
    verifier('Forfait en cours désactivé', Boolean($('#forfaits-list [data-souscrire="Standard"]')?.disabled));

    verifier('Horaire semaine renseigné', $('#h-sem-ouverture').value === '10:30' && $('#h-sem-fermeture').value === '21:30', `${$('#h-sem-ouverture').value}-${$('#h-sem-fermeture').value}`);
    verifier('Dimanche fermé', $('#ouvert-dimanche').checked === false);

    w.location.hash = '#/annonces';
    await attendre(() => !w.document.querySelector('[data-view="annonces"]').classList.contains('hidden'));
    await attendre(() => nb('#annonces-list article') === 2);
    verifier('2 annonces affichées', nb('#annonces-list article') === 2);
    verifier('Titre annonce', $('#annonces-list h3').textContent === 'Promotion vitamines', $('#annonces-list h3').textContent);

    w.location.hash = '#/newsletter';
    await attendre(() => !w.document.querySelector('[data-view="newsletter"]').classList.contains('hidden'));
    await attendre(() => nb('#newsletter-list article') === 2);
    verifier('2 abonnés affichés', nb('#newsletter-list article') === 2);

    w.location.hash = '#/abonnement';
    await attendre(() => !w.document.querySelector('[data-view="abonnement"]').classList.contains('hidden'));
    verifier('Historique affiché', nb('#historique-list .card') === 1, String(nb('#historique-list .card')));
    verifier('Titre de page mis à jour', $('#page-title').textContent === 'Abonnement', $('#page-title').textContent);
    verifier('Lien de navigation actif', $('[data-nav="abonnement"]').classList.contains('is-active'));

    // ---- Statistiques ----
    w.location.hash = '#/statistiques';
    await attendre(() => !w.document.querySelector('[data-view="statistiques"]').classList.contains('hidden'));
    verifier('Entrée Statistiques active', $('[data-nav="statistiques"]').classList.contains('is-active'));

    // Période « Tout » pour ne pas dépendre de la date d'exécution
    $('[data-periode="0"]').dispatchEvent(new w.Event('click', { bubbles: true }));
    await attendre(() => $('[data-stat="st-annonces"]').textContent === '2');
    verifier('KPI annonces (période)', $('[data-stat="st-annonces"]').textContent === '2', $('[data-stat="st-annonces"]').textContent);
    verifier('KPI vues cumulées', $('[data-stat="st-vues"]').textContent === '15', $('[data-stat="st-vues"]').textContent);
    verifier('KPI abonnés', $('[data-stat="st-abonnes"]').textContent === '2', $('[data-stat="st-abonnes"]').textContent);
    verifier('Classement des annonces', nb('#stats-classement tr') === 2, String(nb('#stats-classement tr')));
    verifier('Bouton de période actif', $('[data-periode="0"]').classList.contains('bg-white'));

    await attendre(() => $('#chart-vues-annonces').innerHTML.length > 0);
    verifier('Graphique vues/annonce', $('#chart-vues-annonces').innerHTML.includes('rounded-full'));
    verifier('Anneau des types', $('#chart-types').innerHTML.includes('<svg'));
    verifier('Courbe des abonnements', $('#chart-abonnes').innerHTML.includes('<path'));
    verifier('Rythme de publication', $('#chart-publications').innerHTML.includes('rounded-t-md'));
    verifier('Quotas du forfait', nb('#stats-quotas .rounded-xl') === 3, String(nb('#stats-quotas .rounded-xl')));
    verifier('Graphiques débloqués', !$('#stats-graphiques').classList.contains('hidden'));
    verifier('Carte Premium masquée', $('#stats-verrouille').classList.contains('hidden'));
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
