/* Page publique de consultation des pharmacies disponibles. */
(function () {
  'use strict';

  function apiBase() {
    const base = (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL) ? CONFIG.API_BASE_URL : 'http://localhost:4000/api';
    return base.replace(/\/$/, '');
  }

  function buildUrl(path, query) {
    const url = new URL(apiBase() + path, window.location.href);
    if (query) {
      Object.entries(query).forEach(function (entry) {
        const key = entry[0];
        const value = entry[1];
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.set(key, value);
        }
      });
    }
    return url.toString();
  }

  const statut = document.getElementById('pharmacies-status');
  const liste = document.getElementById('pharmacies-list');
  const champRecherche = document.getElementById('pharmacies-search');
  /* Filtre « de garde » (ex-page de-garde.php, ramenée dans les options de filtres). */
  const champGarde = document.getElementById('filtre-garde');

  let coords = null;
  let pharmaciesCourantes = [];
  let toutesPharmacies = [];

  function escapeHtml(valeur) {
    return String(valeur === null || valeur === undefined ? '' : valeur)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* L'API expose le statut de garde sous « statut_garde » (0/1) ; « est_de_garde »
     reste toléré pour compatibilité (même logique que dashboard.js). */
  function estDeGarde(pharmacie) {
    if (!pharmacie) return false;
    return Number(pharmacie.statut_garde ?? pharmacie.est_de_garde ?? 0) === 1;
  }

  function badgeHtml(pharmacie) {
    if (estDeGarde(pharmacie)) {
      return '<span class="chip bg-brand-50 text-brand-700">De garde</span>';
    }
    return '<span class="chip bg-slate-100 text-slate-600">' + escapeHtml(pharmacie.libelle_statut || 'Disponible') + '</span>';
  }

  function carteHtml(pharmacie) {
    const photo = pharmacie.photo_pharmacie
      ? '<img src="' + escapeHtml(pharmacie.photo_pharmacie) + '" alt="" class="h-24 w-full rounded-xl object-cover" />'
      : '<div class="flex h-24 items-center justify-center rounded-xl bg-slate-100 text-slate-400">Pharmacie</div>';

    const horaires = [
      pharmacie.horaire_semaine ? 'Lun–Ven : ' + escapeHtml(pharmacie.horaire_semaine) : '',
      pharmacie.horaire_samedi ? 'Sam : ' + escapeHtml(pharmacie.horaire_samedi) : '',
      pharmacie.horaire_dimanche ? 'Dim : ' + escapeHtml(pharmacie.horaire_dimanche) : '',
    ].filter(Boolean).join('<br />');

    let distanceTexte = '';
    if (pharmacie.distance !== undefined) {
      distanceTexte = pharmacie.distance >= 1000
        ? (pharmacie.distance / 1000).toFixed(1) + ' km'
        : pharmacie.distance + ' m';
    }
    const distance = distanceTexte
      ? '<p class="text-xs text-brand-700 font-semibold">À ' + escapeHtml(distanceTexte) + '</p>'
      : '';

    return '' +
      '<article class="card overflow-hidden">' +
      photo +
      '<div class="space-y-3 p-5">' +
      '<div class="flex items-start justify-between gap-3">' +
      '<h2 class="text-base font-semibold text-slate-900">' + escapeHtml(pharmacie.nom_pharmacie || 'Pharmacie') + '</h2>' +
      badgeHtml(pharmacie) +
      '</div>' +
      '<p class="text-sm text-slate-500">' + escapeHtml(pharmacie.adresse_fournit || '') +
      (pharmacie.nom_ville ? ' — ' + escapeHtml(pharmacie.nom_ville) : '') + '</p>' +
      (pharmacie.numeros_pharmacie ? '<p class="text-sm font-medium text-slate-700">Tél. ' + escapeHtml(pharmacie.numeros_pharmacie) + ' <a href="tel:' + escapeHtml(String(pharmacie.numeros_pharmacie).replace(/\s+/g, '')) + '" class="text-brand-700 underline">Appeler</a></p>' : '') +
      (pharmacie.email_pharmacie ? '<p class="text-xs text-slate-500">' + escapeHtml(pharmacie.email_pharmacie) + '</p>' : '') +
      (horaires ? '<p class="text-xs text-slate-600">' + horaires + '</p>' : '') +
      (function () {
        const propres = String(pharmacie.assurances_acceptees || '')
          .split(',')
          .map(function (x) { return x.trim(); })
          .filter(function (x) { return x && x.toLowerCase() !== 'aucune assurance'; });
        return propres.length ? '<p class="text-xs text-slate-500">Assurances : ' + escapeHtml(propres.join(', ')) + '</p>' : '';
      })() +
      distance +
      '<div class="flex flex-wrap gap-2 mt-2">' +
      '<button type="button" class="btn-ghost flex-1 sm:flex-1" data-details-code="' + escapeHtml(pharmacie.code_pharmacie) + '">Détails</button>' +
      '<button type="button" class="btn-primary flex-1 sm:flex-1" data-itineraire-code="' + escapeHtml(pharmacie.code_pharmacie) + '">Itinéraire</button>' +
      '</div>' +
      '</div>' +
      '</article>';
  }

  /* Délai d'attente maximal de l'API (15 s par défaut, surchargeable en test). */
  const TIMEOUT_MS = (typeof window !== 'undefined' && Number(window.GOPHARMA_API_TIMEOUT_MS)) || 15000;

  function squeletteHtml() {
    return '<div class="skeleton h-48"></div><div class="skeleton h-48"></div><div class="skeleton h-48"></div>';
  }

  function afficherErreurChargement(message) {
    if (statut) statut.textContent = message;
    if (!liste) return;
    liste.innerHTML =
      '<div class="col-span-full flex flex-col items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">' +
      '<span>' + escapeHtml(message) + '</span>' +
      '<button type="button" id="pharmacies-retry" class="btn-primary">Réessayer</button>' +
      '</div>';
    const bouton = document.getElementById('pharmacies-retry');
    if (bouton) bouton.addEventListener('click', function () { charger(); });
  }

  async function charger() {
    if (statut) statut.textContent = 'Chargement des pharmacies…';
    if (liste) liste.innerHTML = squeletteHtml();

    const query = {};
    const terme = champRecherche ? champRecherche.value.trim() : '';
    if (terme) query.terme_saisi = terme;
    if (coords) {
      query.latitude = coords.latitude;
      query.longitude = coords.longitude;
    }
    const url = buildUrl('/pharmacie/rechercher', query);

    const controleur = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const minuteur = controleur ? setTimeout(function () { controleur.abort(); }, TIMEOUT_MS) : null;

    try {
      const init = { headers: { Accept: 'application/json' } };
      if (controleur) init.signal = controleur.signal;

      const response = await fetch(url, init);
      const texte = await response.text();
      let payload = null;
      if (texte) {
        try { payload = JSON.parse(texte); } catch (e) { payload = null; }
      }
      if (!response.ok) {
        throw new Error((payload && payload.message) || ('Erreur ' + response.status));
      }
      let donnees = (payload && (payload.data || payload)) || [];
      if (!Array.isArray(donnees) && donnees && typeof donnees === 'object') {
        for (const cle of ['pharmacies', 'items', 'resultats', 'results', 'list']) {
          if (Array.isArray(donnees[cle])) {
            donnees = donnees[cle];
            break;
          }
        }
      }
      toutesPharmacies = Array.isArray(donnees) ? donnees : [];
      peuplerFiltres();
      appliquerFiltres();
      if (statut) statut.textContent = pharmaciesCourantes.length + ' pharmacie(s) trouvée(s).';
    } catch (erreur) {
      const expire = erreur && erreur.name === 'AbortError';
      const message = expire
        ? 'Le serveur met trop de temps à répondre. Vérifiez votre connexion, puis réessayez.'
        : 'Impossible de charger les pharmacies : ' + (erreur && erreur.message ? erreur.message : 'erreur inconnue');
      afficherErreurChargement(message);
    } finally {
      if (minuteur) clearTimeout(minuteur);
    }
  }

  function peuplerFiltres() {
    const selectVille = document.getElementById('filtre-ville');
    const selectAssurance = document.getElementById('filtre-assurance');
    if (!selectVille || !selectAssurance) return;

    const villes = Array.from(new Set(toutesPharmacies.map(function (p) { return p.nom_ville || ''; }).filter(Boolean))).sort();
    const assurances = Array.from(new Set(
      toutesPharmacies.flatMap(function (p) {
        return String(p.assurances_acceptees || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean);
      })
    )).sort();

    const villeActive = selectVille.value;
    const assuranceActive = selectAssurance.value;
    selectVille.innerHTML = '<option value="">Toutes les villes</option>' + villes.map(function (v) { return '<option value="' + escapeHtml(v) + '">' + escapeHtml(v) + '</option>'; }).join('');
    selectAssurance.innerHTML = '<option value="">Toutes les assurances</option>' + assurances.map(function (a) { return '<option value="' + escapeHtml(a) + '">' + escapeHtml(a) + '</option>'; }).join('');
    if (villeActive) selectVille.value = villeActive;
    if (assuranceActive) selectAssurance.value = assuranceActive;
  }

  function appliquerFiltres() {
    const terme = champRecherche ? champRecherche.value.trim().toLowerCase() : '';
    const ville = (document.getElementById('filtre-ville') || {}).value || '';
    const assurance = (document.getElementById('filtre-assurance') || {}).value || '';
    const gardeSeulement = champGarde ? champGarde.checked : false;

    pharmaciesCourantes = toutesPharmacies.filter(function (p) {
      if (terme) {
        const haystack = String((p.nom_pharmacie || '') + ' ' + (p.adresse_fournit || '') + ' ' + (p.nom_ville || '') + ' ' + (p.assurances_acceptees || '')).toLowerCase();
        if (!haystack.includes(terme)) return false;
      }
      if (gardeSeulement && !estDeGarde(p)) return false;
      if (ville && String(p.nom_ville || '') !== ville) return false;
      if (assurance && !String(p.assurances_acceptees || '').toLowerCase().includes(String(assurance).toLowerCase())) return false;
      return true;
    });

    if (liste) {
      if (pharmaciesCourantes.length === 0) {
        if (gardeSeulement) {
          liste.innerHTML = '<p class="col-span-full text-sm text-slate-500">Aucune pharmacie de garde enregistrée pour le moment.</p>';
        } else {
          liste.innerHTML = '<p class="col-span-full text-sm text-slate-500">Aucune pharmacie trouvée pour ces critères. Modifiez votre recherche ou réinitialisez les filtres.</p>';
        }
      } else {
        liste.innerHTML = pharmaciesCourantes.map(carteHtml).join('');
      }
    }

    const actifs = document.getElementById('pharmacies-active-filters');
    if (actifs) {
      const parts = [];
      if (terme) parts.push('recherche : « ' + terme + ' »');
      if (ville) parts.push('ville : ' + ville);
      if (assurance) parts.push('assurance : ' + assurance);
      if (gardeSeulement) parts.push('de garde uniquement');
      actifs.textContent = parts.length ? 'Filtres actifs — ' + parts.join(' ; ') : '';
    }
  }

  function trouverPharmacie(code) {
    return toutesPharmacies.find(function (p) { return p.code_pharmacie === code; });
  }

  function ouvrirDetails(code) {
    const p = trouverPharmacie(code);
    if (!p) return;

    const titre = document.getElementById('details-title');
    const body = document.getElementById('details-body');
    const modal = document.getElementById('pharmacie-details-modal');

    if (titre) titre.textContent = p.nom_pharmacie || 'Détails';

    const assurances = String(p.assurances_acceptees || '')
      .split(',')
      .map(function (x) { return x.trim(); })
      .filter(function (x) { return x && x.toLowerCase() !== 'aucune assurance'; });

    let html = '';
    html += '<p><strong>Adresse :</strong> ' + escapeHtml(p.adresse_fournit || '') +
      (p.nom_ville ? ' — ' + escapeHtml(p.nom_ville) : '') + '</p>';
    if (p.numeros_pharmacie) {
      html += '<p><strong>Tél. :</strong> <a href="tel:' + escapeHtml(String(p.numeros_pharmacie).replace(/\s+/g, '')) + '" class="text-brand-700 underline">' + escapeHtml(p.numeros_pharmacie) + '</a></p>';
    }
    if (p.email_pharmacie) html += '<p><strong>Email :</strong> ' + escapeHtml(p.email_pharmacie) + '</p>';
    if (p.horaire_semaine) html += '<p><strong>Semaine :</strong> ' + escapeHtml(p.horaire_semaine) + '</p>';
    if (p.horaire_samedi) html += '<p><strong>Samedi :</strong> ' + escapeHtml(p.horaire_samedi) + '</p>';
    if (p.horaire_dimanche) html += '<p><strong>Dimanche :</strong> ' + escapeHtml(p.horaire_dimanche) + '</p>';
    html += '<p><strong>Statut :</strong> ' + (estDeGarde(p) ? 'De garde' : 'Actif') + '</p>';
    if (assurances.length) html += '<p><strong>Assurances :</strong> ' + escapeHtml(assurances.join(', ')) + '</p>';

    if (body) body.innerHTML = html;
    if (modal) modal.classList.remove('hidden');
  }

  function ouvrirItineraire(code) {
    const p = trouverPharmacie(code);
    if (!p) return;
    const lat = p.latitude;
    const lon = p.longitude;
    if (lat !== null && lon !== null) {
      window.open('https://www.google.com/maps/dir/?api=1&destination=' + lat + ',' + lon, '_blank');
    } else {
      const adresse = encodeURIComponent((p.adresse_fournit || '') + ' ' + (p.nom_ville || ''));
      window.open('https://www.google.com/maps/search/?api=1&query=' + adresse, '_blank');
    }
  }

  function fermerDetails() {
    const modal = document.getElementById('pharmacie-details-modal');
    if (modal) modal.classList.add('hidden');
  }

  document.addEventListener('DOMContentLoaded', function () {
    const btn = document.getElementById('pharmacies-btn');
    const reset = document.getElementById('pharmacies-reset');
    const geo = document.getElementById('pharmacies-geo');
    const selectVille = document.getElementById('filtre-ville');
    const selectAssurance = document.getElementById('filtre-assurance');
    if (btn) btn.addEventListener('click', appliquerFiltres);
    if (champRecherche) {
      champRecherche.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') charger();
      });
    }
    if (selectVille) selectVille.addEventListener('change', appliquerFiltres);
    if (selectAssurance) selectAssurance.addEventListener('change', appliquerFiltres);
    if (champGarde) {
      /* État initial partageable : pharmacies.php?garde=1 */
      try {
        const valeurGarde = new URLSearchParams(window.location.search).get('garde');
        if (valeurGarde === '1' || valeurGarde === 'true') champGarde.checked = true;
      } catch (e) { /* paramètre absent ou invalide : filtre laissé décoché */ }
      champGarde.addEventListener('change', appliquerFiltres);
    }
    if (reset) reset.addEventListener('click', function () {
      if (champRecherche) champRecherche.value = '';
      if (selectVille) selectVille.value = '';
      if (selectAssurance) selectAssurance.value = '';
      if (champGarde) champGarde.checked = false;
      coords = null;
      charger();
    });
    if (geo) {
      geo.addEventListener('click', function () {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(function (pos) {
          coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
          charger();
        });
      });
    }
    if (liste) {
      liste.addEventListener('click', function (e) {
        const cibleItineraire = e.target && e.target.closest ? e.target.closest('[data-itineraire-code]') : null;
        if (cibleItineraire) {
          ouvrirItineraire(cibleItineraire.getAttribute('data-itineraire-code'));
          return;
        }
        const cible = e.target && e.target.closest ? e.target.closest('[data-details-code]') : null;
        if (cible) ouvrirDetails(cible.getAttribute('data-details-code'));
      });
    }
    const fermer = document.getElementById('details-close');
    if (fermer) fermer.addEventListener('click', fermerDetails);
    charger().then(function () {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('pharmacie');
      if (code) ouvrirDetails(code);
    });
  });
})();
