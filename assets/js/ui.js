/* Utilitaires d'affichage : icônes SVG, notifications, boîtes de dialogue, formats. */

const Icons = (() => {
  const paths = {
    home: 'M2.25 12l8.954-8.955a.75.75 0 011.061 0L21.75 12M4.5 9.75v10.125A1.125 1.125 0 005.625 21H9.75v-4.875a1.125 1.125 0 011.125-1.125h2.25a1.125 1.125 0 011.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75',
    user: 'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z',
    megaphone: 'M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m2.413 7.206V5.277a1.913 1.913 0 00-1.912-1.913H5.277a1.913 1.913 0 00-1.913 1.913v10.426a1.913 1.913 0 001.913 1.913h1.912m6.822-1.852V7.927a1.913 1.913 0 00-1.913-1.913H8.088a1.913 1.913 0 00-1.913 1.913v9.587',
    mail: 'M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75',
    star: 'M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z',
    logout: 'M15.75 9V5.25A2.25 2.25 0 0013.5 3h-7.5A2.25 2.25 0 003.75 5.25v13.5A2.25 2.25 0 006 21h7.5a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9',
    menu: 'M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5',
    close: 'M6 18L18 6M6 6l12 12',
    cog: 'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281zM15 12a3 3 0 11-6 0 3 3 0 016 0z',
    photo: 'M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21zm10.5-11.25h.008v.008h-.008V9.75z',
    clock: 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z',
    shield: 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z',
    check: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    plus: 'M12 4.5v15m7.5-7.5h-15',
    trash: 'M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0',
    eye: 'M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178zM15 12a3 3 0 11-6 0 3 3 0 016 0z',
    calendar: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5A2.25 2.25 0 015.25 5.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5',
    phone: 'M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z',
    pin: 'M15 10.5a3 3 0 11-6 0 3 3 0 016 0zM19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z',
    arrowRight: 'M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3',
    chevronDown: 'M19.5 8.25l-7.5 7.5-7.5-7.5',
    chevronLeft: 'M15.75 19.5L8.25 12l7.5-7.5',
    building: 'M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21',
    bell: 'M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0',
    moon: 'M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z',
    chart: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z',
    users: 'M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z',
    info: 'M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z',
    send: 'M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5',
    bolt: 'M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z',
    globe: 'M12 21a9 9 0 100-18 9 9 0 000 18zm0 0c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3 7.5 7.03 7.5 12s2.015 9 4.5 9zM3.6 9h16.8M3.6 15h16.8M12 3c2.5 3 3.5 6 3.5 9s-1 6-3.5 9c-2.5-3-3.5-6-3.5-9s1-6 3.5-9z',
    refresh: 'M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99',
  };

  function svg(name, className = 'h-5 w-5', filled = false) {
    const d = paths[name] || paths.info;
    return `<svg xmlns="http://www.w3.org/2000/svg" fill="${filled ? 'currentColor' : 'none'}" viewBox="0 0 24 24" stroke-width="1.6" stroke="currentColor" class="${className}" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="${d}"/></svg>`;
  }

  return { svg, paths };
})();

const Toast = (() => {
  let root;

  function ensureRoot() {
    if (!root) {
      root = document.createElement('div');
      root.className = 'pointer-events-none fixed inset-x-4 bottom-4 z-[80] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:items-end';
      document.body.appendChild(root);
    }
    return root;
  }

  const tones = {
    success: 'border-brand-200 bg-brand-50 text-brand-800',
    error: 'border-red-200 bg-red-50 text-red-700',
    info: 'border-slate-200 bg-white text-slate-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
  };
  const marks = {
    success: 'bg-brand-500',
    error: 'bg-red-500',
    info: 'bg-slate-500',
    warning: 'bg-amber-500',
  };

  function show(message, tone = 'info', duration = 4000) {
    const host = ensureRoot();
    const el = document.createElement('div');
    el.className = `pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-pop sm:w-auto ${tones[tone] || tones.info}`;
    el.innerHTML = `<span class="mt-0.5 h-2 w-2 shrink-0 rounded-full ${marks[tone] || marks.info}"></span><span>${escapeHtml(message)}</span>`;
    host.appendChild(el);

    el.animate(
      [
        { opacity: 0, transform: 'translateY(10px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      { duration: 220, easing: 'ease-out', fill: 'forwards' }
    );

    window.setTimeout(() => {
      const out = el.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(6px)' }], {
        duration: 200,
        easing: 'ease-in',
        fill: 'forwards',
      });
      out.onfinish = () => el.remove();
    }, duration);
  }

  return {
    success: (m, d) => show(m, 'success', d),
    error: (m, d) => show(m, 'error', d),
    info: (m, d) => show(m, 'info', d),
    warning: (m, d) => show(m, 'warning', d),
  };
})();

const Modal = (() => {
  function open({ title, body, footer, size = 'max-w-lg', dismissable = true }) {
    close();

    const wrap = document.createElement('div');
    wrap.id = 'app-modal';
    wrap.className = 'fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-6';
    wrap.innerHTML = `
      <div data-overlay class="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"></div>
      <div role="dialog" aria-modal="true" class="relative w-full ${size} rounded-t-2xl bg-white shadow-pop sm:rounded-2xl">
        <div class="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
          <h3 class="text-base font-semibold text-slate-900">${title}</h3>
          <button type="button" data-close class="-mr-1 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">${Icons.svg('close', 'h-5 w-5')}</button>
        </div>
        <div class="max-h-[70vh] overflow-y-auto px-6 py-5 text-sm text-slate-600">${body}</div>
        ${footer ? `<div class="flex flex-col-reverse gap-2 border-t border-slate-100 px-6 py-4 sm:flex-row sm:justify-end">${footer}</div>` : ''}
      </div>`;

    document.body.appendChild(wrap);
    document.body.style.overflow = 'hidden';

    wrap.querySelector('[data-close]').addEventListener('click', close);
    if (dismissable) {
      wrap.querySelector('[data-overlay]').addEventListener('click', close);
    }
    wrap.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && dismissable) close();
    });

    const first = wrap.querySelector('input, textarea, select, button:not([data-close])');
    if (first) first.focus();

    return wrap;
  }

  function confirm({ title, message, confirmLabel = 'Confirmer', tone = 'primary', cancelLabel = 'Annuler' }) {
    return new Promise((resolve) => {
      const btnClass = tone === 'danger' ? 'btn-danger' : 'btn-primary';
      const wrap = open({
        title,
        body: `<p class="leading-relaxed">${message}</p>`,
        footer: `
          <button type="button" data-cancel class="btn-ghost">${cancelLabel}</button>
          <button type="button" data-confirm class="${btnClass}">${confirmLabel}</button>`,
      });
      wrap.querySelector('[data-cancel]').addEventListener('click', () => {
        close();
        resolve(false);
      });
      wrap.querySelector('[data-confirm]').addEventListener('click', () => {
        close();
        resolve(true);
      });
    });
  }

  function close() {
    const existing = document.getElementById('app-modal');
    if (existing) existing.remove();
    document.body.style.overflow = '';
  }

  return { open, confirm, close };
})();

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const Format = {
  money(amount) {
    const n = Number(amount || 0);
    return `${new Intl.NumberFormat('fr-FR').format(n)} FCFA`;
  },
  date(value) {
    if (!value) return '—';
    const raw = String(value).split(' ')[0];
    const d = new Date(raw.includes('-') ? raw.replace(/-/g, '/') : raw);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  },
  dateLong(value) {
    if (!value) return '—';
    const d = new Date(String(value).replace(/-/g, '/'));
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  },
  timeRange(value) {
    if (!value) return '—';
    return String(value);
  },
  percent(value) {
    return `${Math.max(0, Math.round(Number(value) || 0))} %`;
  },
};
