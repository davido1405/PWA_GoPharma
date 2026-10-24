/* Partage du lien du site (Web Share API avec repli copie presse-papiers). */
(function () {
  'use strict';

  async function partagerSite() {
    const lien = window.location.origin + window.location.pathname;
    const donnees = {
      title: document.title || 'GoPharma',
      text: 'Découvrez GoPharma, l’espace pharmacie en ligne.',
      url: lien,
    };

    if (navigator.share) {
      try {
        await navigator.share(donnees);
        return;
      } catch (err) {
        /* annulation utilisateur ou erreur : on tente le repli */
      }
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(lien);
        alert('Lien du site copié dans le presse-papiers.');
        return;
      } catch (err) {
        /* ignore */
      }
    }

    window.prompt('Copiez le lien du site :', lien);
  }

  window.partagerSite = partagerSite;

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-share-site]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        partagerSite();
      });
    });
  });
})();