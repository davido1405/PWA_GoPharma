/* Vérification statique : chaque sélecteur #id utilisé en JS existe dans le HTML correspondant. */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const pairs = [
  ['connexion.php', ['assets/js/connexion.js']],
  ['inscription.php', ['assets/js/inscription.js']],
  ['dashboard.php', ['assets/js/dashboard.js']],
  ['index.php', ['assets/js/landing.js']],
  ['pharmacies.php', ['assets/js/pharmacies.js']],
  ['carte.php', ['assets/js/carte.js']],
];

let erreur = 0;

for (const [htmlFile, jsFiles] of pairs) {
  const html = fs.readFileSync(path.join(root, htmlFile), 'utf8');
  for (const jsFile of jsFiles) {
    const js = fs.readFileSync(path.join(root, jsFile), 'utf8');
    const ids = new Set();
    const re = /['"]#([A-Za-z][\w-]*)/g;
    let m;
    while ((m = re.exec(js))) ids.add(m[1]);
    const reGet = /getElementById\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((m = reGet.exec(js))) ids.add(m[1]);
    const manquants = [...ids]
      // ignorer les couleurs hexadécimales ('#1B8A5A') qui ne sont pas des sélecteurs
      .filter((id) => !/^[0-9A-Fa-f]{3,8}$/.test(id))
      .filter((id) => !html.includes(`id="${id}"`) && !js.includes(`id="${id}"`));
    if (manquants.length) {
      erreur += manquants.length;
      console.log(`[${htmlFile}] IDs introuvables : ${manquants.join(', ')}`);
    } else {
      console.log(`[${htmlFile}] ${ids.size} IDs vérifiés`);
    }
  }
}

process.exit(erreur ? 1 : 0);
