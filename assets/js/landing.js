/* Navigation et interactions de la page d'accueil. */

(function () {
  const toggle = document.getElementById('nav-toggle');
  const menu = document.getElementById('nav-mobile');

  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      menu.classList.toggle('hidden');
    });
    menu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => menu.classList.add('hidden'));
    });
  }

  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
})();
