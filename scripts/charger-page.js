/*
 * Chargement d'une page PHP servie par le serveur local, dans jsdom.
 * Les pages contenant du PHP doivent être rendues par le serveur :
 * on les récupère donc en HTTP plutôt qu'en lisant le fichier sur disque.
 *
 * Le serveur doit tourner :  npm start   (php -S localhost:8080 router.php)
 *
 * Seules les ressources du serveur local sont chargées : les polices Google
 * et les autres hôtes externes reçoivent une réponse vide, pour que les
 * tests restent rapides et ne dépendent pas du réseau.
 */
const { JSDOM, requestInterceptor } = require('jsdom');

const BASE = process.env.BASE_URL || 'http://localhost:8080';

const intercepteurLocal = requestInterceptor((request, context) => {
  const url = String(request.url);
  if (url.startsWith(BASE) || url.startsWith('data:')) return undefined;

  // Réponse vide adaptée au type d'objet demandé (feuille de style, script…).
  const element = context && context.element;
  const estCss =
    (element && element.localName === 'link') || /\.css(\?|$)/.test(url);
  const type = estCss
    ? 'text/css; charset=utf-8'
    : 'application/javascript; charset=utf-8';
  return new Response('', { status: 200, headers: { 'Content-Type': type } });
});

async function chargerPage(page, options = {}) {
  const url = `${BASE}/${page}`;

  let html;
  try {
    const reponse = await fetch(url);
    if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`);
    html = await reponse.text();
  } catch (err) {
    throw new Error(
      `Impossible de charger ${url} (${err.message}).\n` +
        "Lancez d'abord le serveur : npm start"
    );
  }

  return new JSDOM(html, {
    url,
    runScripts: 'dangerously',
    resources: { interceptors: [intercepteurLocal] },
    pretendToBeVisual: true,
    ...options,
  });
}

module.exports = { chargerPage, BASE };
