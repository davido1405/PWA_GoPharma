/* PWA : enregistrement du service worker, bandeau hors ligne, désactivation
   des écritures hors ligne et bouton « Installer l'application ». */
(function () {
  if (!('serviceWorker' in navigator)) return;

  function estEnLigne() {
    return navigator.onLine;
  }

  /* ------------------------------ Hors ligne ------------------------------ */

  function creerBandeauHorsLigne() {
    let bandeau = document.getElementById('pwa-offline-banner');
    if (estEnLigne()) {
      if (bandeau) bandeau.remove();
      return;
    }
    if (!bandeau) {
      bandeau = document.createElement('div');
      bandeau.id = 'pwa-offline-banner';
      bandeau.setAttribute('role', 'status');
      bandeau.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:9999;background:#b45309;color:#fff;padding:10px 14px;text-align:center;font-size:14px;';
      document.body.appendChild(bandeau);
    }
    bandeau.textContent = 'Hors ligne : les dernières données consultées restent disponibles. Les actions d\'écriture (inscription, enregistrement) sont désactivées jusqu\'au retour du réseau.';
  }

  /* Désactive les actions d'écriture hors ligne, avec explication accessible. */
  function majActionsHorsLigne() {
    const horsLigne = !estEnLigne();
    document.querySelectorAll('form button[type="submit"], [data-ecriture]').forEach(function (el) {
      if (horsLigne) {
        if (el.dataset.etatEnLigne === undefined) {
          el.dataset.etatEnLigne = el.disabled ? '1' : '0';
        }
        el.disabled = true;
        el.setAttribute('aria-disabled', 'true');
        el.setAttribute('title', 'Action indisponible hors ligne');
      } else if (el.dataset.etatEnLigne !== undefined) {
        el.disabled = el.dataset.etatEnLigne === '1';
        delete el.dataset.etatEnLigne;
        el.removeAttribute('aria-disabled');
        el.removeAttribute('title');
      }
    });
  }

  function majEtatReseau() {
    creerBandeauHorsLigne();
    majActionsHorsLigne();
  }

  window.addEventListener('online', majEtatReseau);
  window.addEventListener('offline', majEtatReseau);
  document.addEventListener('DOMContentLoaded', majEtatReseau);

  /* ----------------------------- Installation ----------------------------- */

  let inviteInstallation = null;

  window.addEventListener('beforeinstallprompt', function (event) {
    event.preventDefault();
    inviteInstallation = event;
    const bouton = document.getElementById('install-btn');
    if (bouton) bouton.hidden = false;
  });

  document.addEventListener('click', function (event) {
    const bouton = event.target && event.target.closest ? event.target.closest('#install-btn') : null;
    if (!bouton || !inviteInstallation) return;
    inviteInstallation.prompt();
    const invite = inviteInstallation;
    inviteInstallation = null;
    if (invite.userChoice && invite.userChoice.then) {
      invite.userChoice.then(function () { bouton.hidden = true; }).catch(function () { bouton.hidden = true; });
    }
  });

  window.addEventListener('appinstalled', function () {
    const bouton = document.getElementById('install-btn');
    if (bouton) bouton.hidden = true;
    const aide = document.getElementById('install-hint');
    if (aide) aide.textContent = 'Application installée. Merci !';
  });

  /* ---------------------------- Service worker ---------------------------- */

  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js').then(function (registration) {
      registration.addEventListener('updatefound', function () {
        const nouveau = registration.installing;
        if (!nouveau) return;
        nouveau.addEventListener('statechange', function () {
          if (nouveau.state === 'installed' && navigator.serviceWorker.controller) {
            const recharger = window.confirm('Nouvelle version disponible. Recharger l’application ?');
            if (recharger) window.location.reload();
          }
        });
      });
    }).catch(function () {});

    navigator.serviceWorker.addEventListener('controllerchange', function () {
      /* évite les doubles rechargements */
    });

    majActionsHorsLigne();
  });
})();
