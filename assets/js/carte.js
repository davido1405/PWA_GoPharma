/* Carte interactive des pharmacies (Leaflet + OpenStreetMap). */
(function () {
  'use strict';

  function apiBase() {
    const base = (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL) ? CONFIG.API_BASE_URL : 'http://localhost:4000/api';
    return base.replace(/\/$/, '');
  }

  const conteneur = document.getElementById('carte-conteneur');
  const statut = document.getElementById('carte-status');
  const boutonGeo = document.getElementById('carte-geo');
  if (!conteneur || typeof L === 'undefined') return;

  const carte = L.map(conteneur).setView([5.36, -4.0], 11);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap',
  }).addTo(carte);

  const groupe = L.featureGroup().addTo(carte);

  /* Marqueur spécifique pour les pharmacies de garde (pin vert + classe dédiée). */
  const iconeGarde = L.divIcon({
    className: 'marqueur-garde',
    html: '<span style="display:inline-block;width:22px;height:22px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#1B8A5A;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></span>',
    iconSize: [22, 22],
    iconAnchor: [11, 22],
    popupAnchor: [0, -22],
  });

  function escapeHtml(v) {
    return String(v === null || v === undefined ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  let messageUtilisateur = false;

  /* Message d'état automatique : ne doit pas écraser un message issu d'une
     action de l'utilisateur (ex. refus de géolocalisation). */
  function majStatutAutomatique(texte) {
    if (messageUtilisateur) return;
    if (statut) statut.textContent = texte;
  }

  function majStatutUtilisateur(texte) {
    messageUtilisateur = true;
    if (statut) statut.textContent = texte;
  }

  async function charger() {
    majStatutAutomatique('Chargement des pharmacies…');
    try {
      const response = await fetch(apiBase() + '/pharmacie', { headers: { Accept: 'application/json' } });
      const texte = await response.text();
      const payload = texte ? JSON.parse(texte) : null;
      const pharmacies = (payload && (payload.data || payload)) || [];
      groupe.clearLayers();
      pharmacies.forEach(function (p) {
        const lat = parseFloat(p.latitude);
        const lon = parseFloat(p.longitude);
        if (!isFinite(lat) || !isFinite(lon)) return;
        const deGarde = Number(p.statut_garde ?? p.est_de_garde ?? 0) === 1;
        const marqueur = deGarde
          ? L.marker([lat, lon], { icon: iconeGarde }).addTo(groupe)
          : L.marker([lat, lon]).addTo(groupe);
        const itineraire = 'https://www.google.com/maps/dir/?api=1&destination=' + lat + ',' + lon;
        marqueur.bindPopup(
          (deGarde ? '<span style="color:#1B8A5A;font-weight:600">De garde</span><br/>' : '') +
          '<strong>' + escapeHtml(p.nom_pharmacie || 'Pharmacie') + '</strong><br/>' +
          escapeHtml(p.adresse_fournit || '') + (p.nom_ville ? ' — ' + escapeHtml(p.nom_ville) : '') + '<br/>' +
          (p.numeros_pharmacie ? 'Tél. ' + escapeHtml(p.numeros_pharmacie) + '<br/>' : '') +
          '<a href="' + itineraire + '" target="_blank" rel="noopener">Itinéraire Google Maps</a>'
        );
      });
      if (groupe.getLayers().length) {
        carte.fitBounds(groupe.getBounds().pad(0.1));
      }
      majStatutAutomatique(groupe.getLayers().length + ' pharmacie(s) affichée(s).');
    } catch (err) {
      majStatutAutomatique('Impossible de charger la carte : ' + err.message);
    }
  }

  if (boutonGeo) {
    boutonGeo.addEventListener('click', function () {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(function (pos) {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        L.circleMarker([lat, lon], { radius: 8, color: '#1B8A5A' }).addTo(carte).bindPopup('Votre position');
        carte.setView([lat, lon], 13);
        majStatutUtilisateur('Votre position est affichée sur la carte.');
      }, function () {
        majStatutUtilisateur('Position indisponible : autorisez la localisation ou choisissez une ville dans la liste.');
      }, { timeout: 10000 });
    });
  }

  charger();
})();