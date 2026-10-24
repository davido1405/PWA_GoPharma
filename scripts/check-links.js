/* Vérifie que tous les liens locaux (src/href) des pages pointent vers des fichiers existants.
   Les pages sont servies sans extension par router.php : « /pharmacies » résout
   vers « pharmacies.php ». On applique la même résolution ici. */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const pages = ['index.php', 'connexion.php', 'inscription.php', 'dashboard.php'];
const manquants = [];

function existe(cible) {
  if (!cible) return true;
  const candidats = [cible];
  if (!path.extname(cible)) candidats.push(cible + '.php');
  return candidats.some((c) => fs.existsSync(path.join(root, c)));
}

for (const page of pages) {
  const fichierPage = path.join(root, page);
  if (!fs.existsSync(fichierPage)) {
    manquants.push(`page absente : ${page}`);
    continue;
  }
  const html = fs.readFileSync(fichierPage, 'utf8');
  const re = /(?:src|href)="([^"]+)"/g;
  let m;
  while ((m = re.exec(html))) {
    const url = m[1];
    if (/^(https?:|#|mailto:|data:)/.test(url)) continue;
    const fichier = url.split('#')[0].split('?')[0];
    if (!existe(fichier)) {
      manquants.push(`${page} -> ${url}`);
    }
  }
}

/* Les redirections JavaScript doivent aussi viser les pages PHP. */
for (const script of fs.readdirSync(path.join(root, 'assets', 'js'))) {
  if (!script.endsWith('.js')) continue;
  const contenu = fs.readFileSync(path.join(root, 'assets', 'js', script), 'utf8');
  const re = /['"]([^'"]+\.html)['"]/g;
  let m;
  while ((m = re.exec(contenu))) {
    manquants.push(`assets/js/${script} -> lien HTML obsolète ${m[1]}`);
  }
}

if (manquants.length) {
  console.log(manquants.join('\n'));
  process.exit(1);
}
console.log('Tous les liens locaux existent.');
