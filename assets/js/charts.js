/* Graphiques légers (HTML/SVG) pour les statistiques, sans dépendance externe. */

const Charts = (() => {
  const PALETTE = ['#0B5D3B', '#1B8A5A', '#45BE8B', '#F57C00', '#1976D2', '#7C3AED', '#E11D48'];

  function vide(message = 'Aucune donnée sur la période') {
    return `<div class="flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 text-sm text-slate-400">${message}</div>`;
  }

  function barresHorizontales(items, { couleur = '#1B8A5A', suffixe = '' } = {}) {
    if (!items.length) return vide();
    const max = Math.max(...items.map((i) => i.valeur), 1);

    return `<div class="space-y-4">${items
      .map(
        (item) => `
      <div>
        <div class="flex items-baseline justify-between gap-3 text-sm">
          <span class="truncate text-slate-700">${escapeHtml(item.label)}</span>
          <span class="shrink-0 font-semibold text-slate-900">${item.valeur}${suffixe}</span>
        </div>
        <div class="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div class="h-2.5 rounded-full transition-all duration-700" style="width:${Math.max(
            3,
            (item.valeur / max) * 100
          ).toFixed(1)}%;background:${item.couleur || couleur}"></div>
        </div>
      </div>`
      )
      .join('')}</div>`;
  }

  function barresVerticales(items, { hauteur = 170, couleur = '#1B8A5A' } = {}) {
    if (!items.length) return vide();
    const max = Math.max(...items.map((i) => i.valeur), 1);

    return `
      <div class="flex items-end gap-1" style="height:${hauteur}px">
        ${items
          .map(
            (item) => `
          <div class="group flex h-full flex-1 flex-col justify-end" title="${escapeHtml(item.label)} : ${item.valeur}">
            <span class="mb-1 text-center text-[10px] font-semibold text-slate-500 opacity-0 transition group-hover:opacity-100">${item.valeur}</span>
            <div class="w-full rounded-t-md transition-all duration-700" style="height:${Math.max(
              3,
              (item.valeur / max) * 100
            ).toFixed(1)}%;background:${item.couleur || couleur}"></div>
          </div>`
          )
          .join('')}
      </div>
      <div class="mt-2 flex gap-1 border-t border-slate-100 pt-2">
        ${items
          .map(
            (item) =>
              `<span class="flex-1 truncate text-center text-[10px] text-slate-400">${escapeHtml(item.label)}</span>`
          )
          .join('')}
      </div>`;
  }

  function aire(items, { couleur = '#1B8A5A', hauteur = 190 } = {}) {
    if (!items.length) return vide();

    const n = items.length;
    const max = Math.max(...items.map((i) => i.valeur), 1);
    const W = 640;
    const H = 200;
    const padX = 8;
    const padY = 16;

    const points = items.map((item, i) => {
      const x = n === 1 ? W / 2 : padX + (i * (W - 2 * padX)) / (n - 1);
      const y = H - padY - (item.valeur / max) * (H - 2 * padY);
      return [x, y];
    });

    const ligne = points.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
    const surface = `${ligne} L${points[n - 1][0].toFixed(1)} ${H - padY} L${points[0][0].toFixed(
      1
    )} ${H - padY} Z`;
    const id = `grad-${Math.random().toString(36).slice(2, 8)}`;

    const grille = [0.25, 0.5, 0.75]
      .map(
        (r) =>
          `<line x1="0" x2="${W}" y1="${(H * r).toFixed(0)}" y2="${(H * r).toFixed(0)}" stroke="#EEF2F6" stroke-width="1" vector-effect="non-scaling-stroke"/>`
      )
      .join('');

    const pas = Math.max(1, Math.ceil(n / 6));
    const labels = items
      .map((item, i) =>
        i % pas === 0 || i === n - 1
          ? `<span class="flex-1 truncate text-center">${escapeHtml(item.label)}</span>`
          : '<span class="flex-1"></span>'
      )
      .join('');

    return `
      <div>
        <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="width:100%;height:${hauteur}px" role="img" aria-label="Évolution">
          <defs>
            <linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="${couleur}" stop-opacity="0.30"/>
              <stop offset="100%" stop-color="${couleur}" stop-opacity="0.02"/>
            </linearGradient>
          </defs>
          ${grille}
          <path d="${surface}" fill="url(#${id})"/>
          <path d="${ligne}" fill="none" stroke="${couleur}" stroke-width="2.5" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/>
        </svg>
        <div class="mt-2 flex border-t border-slate-100 pt-2 text-[10px] text-slate-400">${labels}</div>
      </div>`;
  }

  function anneau(parts, { centre = '', sousTitre = '' } = {}) {
    const total = parts.reduce((somme, p) => somme + Number(p.valeur || 0), 0);
    if (!total) return vide();

    const rayon = 42;
    const circonference = 2 * Math.PI * rayon;
    let cumul = 0;

    const segments = parts
      .map((part) => {
        const fraction = Number(part.valeur) / total;
        const dash = fraction * circonference;
        const seg = `<circle cx="50" cy="50" r="${rayon}" fill="none" stroke="${
          part.couleur || PALETTE[0]
        }" stroke-width="14" stroke-dasharray="${dash.toFixed(2)} ${(circonference - dash).toFixed(
          2
        )}" stroke-dashoffset="${(-cumul).toFixed(2)}"/>`;
        cumul += dash;
        return seg;
      })
      .join('');

    const legende = parts
      .map(
        (part) => `
        <li class="flex items-center justify-between gap-3 text-sm">
          <span class="flex min-w-0 items-center gap-2 text-slate-600">
            <span class="h-2.5 w-2.5 shrink-0 rounded-full" style="background:${part.couleur || PALETTE[0]}"></span>
            <span class="truncate">${escapeHtml(part.label)}</span>
          </span>
          <span class="shrink-0 font-semibold text-slate-900">${part.valeur}</span>
        </li>`
      )
      .join('');

    return `
      <div class="flex flex-col items-center gap-6 sm:flex-row">
        <div class="relative h-40 w-40 shrink-0">
          <svg viewBox="0 0 100 100" class="h-40 w-40 -rotate-90" aria-hidden="true">${segments}</svg>
          <div class="absolute inset-0 flex flex-col items-center justify-center">
            <span class="text-2xl font-bold text-slate-900">${escapeHtml(centre || total)}</span>
            <span class="text-[11px] text-slate-500">${escapeHtml(sousTitre)}</span>
          </div>
        </div>
        <ul class="w-full space-y-3">${legende}</ul>
      </div>`;
  }

  function jauge(valeur, max, { couleur = '#1B8A5A' } = {}) {
    const illimite = max === null || max === undefined || max === 0;
    const rapport = illimite ? 1 : Math.min(1, Number(valeur) / Math.max(Number(max), 1));
    const rayon = 26;
    const circonference = 2 * Math.PI * rayon;
    const dash = rapport * circonference;

    return `
      <div class="relative h-24 w-24 shrink-0">
        <svg viewBox="0 0 64 64" class="h-24 w-24 -rotate-90" aria-hidden="true">
          <circle cx="32" cy="32" r="${rayon}" fill="none" stroke="#EEF2F6" stroke-width="8"/>
          <circle cx="32" cy="32" r="${rayon}" fill="none" stroke="${couleur}" stroke-width="8"
                  stroke-linecap="round" stroke-dasharray="${dash.toFixed(2)} ${(
      circonference - dash
    ).toFixed(2)}"/>
        </svg>
        <div class="absolute inset-0 flex flex-col items-center justify-center">
          <span class="text-sm font-bold text-slate-900">${illimite ? valeur : `${valeur}`}</span>
          <span class="text-[10px] text-slate-400">${illimite ? 'illimité' : `/${max}`}</span>
        </div>
      </div>`;
  }

  return { PALETTE, vide, barresHorizontales, barresVerticales, aire, anneau, jauge };
})();
