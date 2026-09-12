/* icons.js — профессиональные линейные SVG-иконки RFC Garden.
   Стиль: viewBox="0 0 24 24", fill="none", stroke="currentColor",
   stroke-width="1.5", stroke-linecap="round", stroke-linejoin="round".
   Использование: ICON.render(<name>) -> строка svg. */
const ICON = {
  _cache: new Map(),
  _defs: {
    /* ---- навигация / действия ---- */
    enter: `<path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="11 17 16 12 11 7"/><line x1="16" y1="12" x2="3" y2="12"/>`,
    guide: `<path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="13" y2="11"/>`,
    learn: `<path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12.5V17c0 .6.4 1 1 1h10c.6 0 1-.4 1-1v-4.5"/><line x1="12" y1="22" x2="12" y2="17"/>`,
    contribute: `<circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>`,
    timeline: `<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/><line x1="4" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="20" y2="12"/>`,
    garden: `<path d="M12 22V8"/><path d="M12 8c0-4 3-7 7-7"/><path d="M12 8c0-4-3-7-7-7"/><path d="M12 22c5 0 8-3 8-7"/><path d="M12 22c-5 0-8-3-8-7"/><circle cx="12" cy="8" r="2"/>`,

    /* ---- растения / типы ---- */
    tree: `<path d="M12 22V12"/><path d="M12 12L6 5l3 0 3-3 3 3 3 0-6 7z"/><line x1="10" y1="22" x2="14" y2="22"/><circle cx="12" cy="4" r="1"/>`,
    vine: `<path d="M7 22c0-5 3-7 3-12a3 3 0 016 0"/><path d="M16 22V10"/><path d="M19 17a2 2 0 11-2-2"/><path d="M4 22V14"/>`,
    flower: `<circle cx="12" cy="10" r="3"/><path d="M12 13v7"/><path d="M12 13l-4-2"/><path d="M12 13l4-2"/><path d="M12 13l-3 2"/><path d="M12 13l3 2"/><circle cx="12" cy="10" r="1"/>`,
    mushroom: `<path d="M4 12a8 8 0 0116 0z"/><line x1="9" y1="20" x2="9" y2="12"/><line x1="15" y1="20" x2="15" y2="12"/><circle cx="8" cy="9" r="1"/><circle cx="14" cy="7" r="1"/><circle cx="11" cy="5" r="1"/><circle cx="16" cy="11" r="1"/>`,
    sprout: `<path d="M12 22V12"/><path d="M12 12c-3 0-5-2-5-5"/><path d="M12 12c3 0 5-2 5-5"/><path d="M7 7l-2-2"/><path d="M17 7l2-2"/>`,

    /* ---- слои OSI ---- */
    layerApp: `<rect x="3" y="4" width="18" height="6" rx="2"/><rect x="3" y="14" width="18" height="6" rx="2"/><line x1="6" y1="7" x2="18" y2="7"/><line x1="6" y1="17" x2="18" y2="17"/>`,
    layerTransport: `<rect x="3" y="3" width="18" height="6" rx="2"/><rect x="3" y="15" width="18" height="6" rx="2"/><line x1="7" y1="6" x2="7" y2="6"/><line x1="17" y1="18" x2="17" y2="18"/>`,
    layerNetwork: `<circle cx="5" cy="6" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><line x1="7" y1="6" x2="17" y2="6"/><line x1="6" y1="8" x2="11" y2="16"/><line x1="18" y1="8" x2="13" y2="16"/>`,
    layerSecurity: `<path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z"/><polyline points="9 12 11 14 15 10"/>`,

    /* ---- UI кнопки ---- */
    quiz: `<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 115 0c0 2-2.5 2-2.5 4"/><line x1="12" y1="17" x2="12" y2="17"/>`,
    stats: `<line x1="4" y1="20" x2="4" y2="10"/><line x1="10" y1="20" x2="10" y2="4"/><line x1="16" y1="20" x2="16" y2="14"/><line x1="22" y1="20" x2="22" y2="8"/><rect x="2" y="18" width="22" height="2" rx="1"/>`,
    cheatsheet: `<path d="M14 2H7a2 2 0 00-2 2v16a2 2 0 002 2h10a2 2 0 002-2V7l-5-5z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/><line x1="9" y1="9" x2="12" y2="9"/>`,
    teacher: `<circle cx="12" cy="6" r="3"/><path d="M6 22v-2a6 6 0 0112 0v2"/><circle cx="12" cy="13" r="5"/>`,
    print: `<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>`,
    back: `<path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/>`,
    compare: `<rect x="3" y="3" width="7" height="18" rx="2"/><rect x="14" y="3" width="7" height="18" rx="2"/><line x1="7" y1="8" x2="7" y2="8"/>`,
    path: `<circle cx="6" cy="18" r="3"/><circle cx="18" cy="6" r="3"/><path d="M9 18h6"/><path d="M6 15V6a3 3 0 013-3h9"/>`,
    reveal: `<circle cx="12" cy="12" r="9"/><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/>`,
    favOn: `<path d="M12 21l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.18L12 21z"/>`,
    favOff: `<path d="M12 21l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.18L12 21z"/><line x1="3" y1="3" x2="21" y2="21"/>`,
    recent: `<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/>`,
    soundOn: `<path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 010 7.07"/><path d="M19.07 4.93a10 10 0 010 14.14"/>`,
    soundOff: `<path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>`,
    export: `<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>`,
    import: `<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 16 12 11 17 16"/><line x1="12" y1="11" x2="12" y2="3"/>`,
    reset: `<path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8"/><polyline points="3 3 3 8 8 8"/>`,
    share: `<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>`,
    tour: `<circle cx="12" cy="12" r="9"/><polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none"/>`,
    stop: `<rect x="6" y="6" width="12" height="12" rx="2"/>`,
    exam: `<path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>`,
    search: `<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>`,
    close: `<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>`,
    menu: `<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>`,
    theme: `<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>`,
    lang: `<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 010 20"/><path d="M12 2a15.3 15.3 0 000 20"/>`,

    /* ---- карточки / статусы ---- */
    badgeActive: `<circle cx="12" cy="12" r="9"/><polyline points="9 12 11 14 15 10"/>`,
    badgeUpdated: `<path d="M12 2a10 10 0 00-7.35 16.78"/><polyline points="12 6 12 12 16 14"/><polyline points="21 12 21 8 17 8"/>`,
    badgeLegacy: `<circle cx="12" cy="12" r="9"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/>`,
    link: `<path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>`,
    book: `<path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/><line x1="8" y1="7" x2="14" y2="7"/>`,
    lightbulb: `<path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 00-4 12.7c.6.5 1 1.4 1 2.3h6c0-.9.4-1.8 1-2.3A7 7 0 0012 2z"/><line x1="9" y1="14" x2="15" y2="14"/>`,

    /* ---- глоссарий / контент ---- */
    packet: `<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M2 10h20"/><path d="M7 14h10"/>`,
    ip: `<circle cx="12" cy="12" r="9"/><path d="M12 3v4"/><path d="M12 17v4"/><path d="M6.34 6.34l2.83 2.83"/><path d="M14.83 14.83l2.83 2.83"/>`,
    port: `<rect x="2" y="10" width="20" height="4" rx="2"/><rect x="2" y="5" width="20" height="3" rx="1"/><rect x="2" y="17" width="20" height="3" rx="1"/><circle cx="12" cy="12" r="1"/>`,
    handshake: `<path d="M4 11l4-4 4 2 4-4 4 2 2-2"/><path d="M4 11a4 4 0 004 4h8a4 4 0 004-4"/><circle cx="12" cy="19" r="1"/>`,
    stack: `<rect x="2" y="16" width="20" height="4" rx="1"/><rect x="4" y="11" width="16" height="4" rx="1"/><rect x="6" y="6" width="12" height="4" rx="1"/>`,
    nat: `<path d="M3 12h2l2-6 4 12 4-12 2 6h2"/><circle cx="12" cy="12" r="1"/>`,
    dns: `<rect x="3" y="3" width="18" height="6" rx="2"/><rect x="3" y="15" width="18" height="6" rx="2"/><path d="M12 9v6"/><line x1="8" y1="6" x2="8" y2="6"/><line x1="16" y1="18" x2="16" y2="18"/>`,
    encrypt: `<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/><circle cx="12" cy="16" r="1"/>`,
    token: `<rect x="3" y="8" width="18" height="8" rx="4"/><circle cx="12" cy="12" r="2"/>`,
    dependency: `<path d="M12 2v6"/><path d="M12 16v6"/><path d="M4 12h6"/><path d="M14 12h6"/><circle cx="12" cy="12" r="2"/>`,
    rfc: `<rect x="3" y="4" width="18" height="16" rx="2"/><line x1="7" y1="9" x2="17" y2="9"/><line x1="7" y1="13" x2="17" y2="13"/><line x1="7" y1="17" x2="14" y2="17"/>`,
    mail: `<path d="M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2z"/><polyline points="22 6 12 13 2 6"/>`,
    video: `<polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>`,
    call: `<path d="M22 16.92v3a2 2 0 01-2.18 2 19.8 19.8 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.8 19.8 0 012.18 4.11 2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0122 16.92z"/>`,
    sensor: `<circle cx="12" cy="12" r="3"/><path d="M12 9V3"/><path d="M12 21v-6"/><path d="M15 12h6"/><path d="M3 12h6"/><path d="M19.07 4.93l-4.24 4.24"/><path d="M9.17 14.83l-4.24 4.24"/><path d="M19.07 19.07l-4.24-4.24"/><path d="M9.17 9.17L4.93 4.93"/>`,
    news: `<path d="M4 22h16a2 2 0 002-2V4a2 2 0 00-2-2H4a2 2 0 00-2 2v16a2 2 0 002 2z"/><path d="M12 18v-4"/><path d="M12 10v.01"/><path d="M8 14h8"/>`,
    directory: `<path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/><circle cx="12" cy="13" r="2"/>`,
    private: `<rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/><circle cx="12" cy="16" r="1"/>`,
    domain: `<path d="M3 12c0-5 4-9 9-9s9 4 9 9"/><path d="M3 12c0 5 4 9 9 9s9-4 9-9"/><line x1="3" y1="12" x2="21" y2="12"/><circle cx="12" cy="12" r="2"/>`,
    website: `<circle cx="12" cy="12" r="9"/><line x1="3" y1="12" x2="21" y2="12"/><path d="M12 3c2.5 3 3.5 6 3.5 9s-1 6-3.5 9"/><path d="M12 3c-2.5 3-3.5 6-3.5 9s1 6 3.5 9"/>`,
    route: `<circle cx="6" cy="19" r="3"/><circle cx="18" cy="5" r="3"/><path d="M9 19h6a3 3 0 003-3V8"/><circle cx="12" cy="12" r="2"/>`,
    ping: `<path d="M12 22V8"/><path d="M12 8c0-4 3-7 7-7"/><path d="M12 8c0-4-3-7-7-7"/><circle cx="12" cy="8" r="2"/>`,
    cookie: `<circle cx="12" cy="12" r="9"/><circle cx="8" cy="9" r="1.5"/><circle cx="15" cy="8" r="1.5"/><circle cx="14" cy="15" r="1.5"/><circle cx="9" cy="15" r="1"/>`,
  },

  render(name, attrs = {}) {
    const path = this._defs[name];
    if (!path) return "";
    const a = Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(" ");
    return `<svg class="icon icon-${name}" ${a} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
  },
  inject(name, attrs = {}) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    el.setAttribute("viewBox", "0 0 24 24");
    el.setAttribute("fill", "none");
    el.setAttribute("stroke", "currentColor");
    el.setAttribute("stroke-width", "1.5");
    el.setAttribute("stroke-linecap", "round");
    el.setAttribute("stroke-linejoin", "round");
    el.classList.add("icon", "icon-" + name);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    el.innerHTML = this._defs[name] || "";
    return el;
  },
  scan(root = document) {
    root.querySelectorAll("[data-icon]").forEach((el) => {
      const name = el.getAttribute("data-icon");
      if (!this._defs[name]) return;
      const svg = this.inject(name);
      while (el.firstChild) el.removeChild(el.firstChild);
      el.appendChild(svg);
    });
  },
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => ICON.scan());
} else {
  ICON.scan();
}
window.ICON = ICON;
