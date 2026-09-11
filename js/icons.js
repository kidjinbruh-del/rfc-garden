/* icons.js — линейные SVG-иконки в стиле RFC Garden.
   Вызов: ICON.render(<name>) -> строка svg, ICON.inject(<name>) -> HTMLElement.
   Стиль: stroke=currentColor, stroke-width=2, stroke-linecap=round, stroke-linejoin=round. */
const ICON = {
  _cache: new Map(),
  _defs: {
    // --- навигация/действия ---
    enter: `<path d="M9 18l6-6-6-6"/><path d="M15 18l-6-6 6-6"/>`,
    guide: `<path d="M12 3v9"/><circle cx="12" cy="16" r="3"/>`,
    learn: `<path d="M12 3v9"/><path d="M8 18h8"/><path d="M8 14h8"/>`,
    contribute: `<path d="M12 5v14"/><path d="M5 12h14"/>`,
    timeline: `<path d="M3 12h18"/><path d="M12 3v18"/>`,
    garden: `<path d="M12 22V8M12 8c0-3 2-5 5-5s-2 5-5 5zm0 0c0-3-2-5-5-5s2 5 5 5z"/><path d="M12 22c4 0 7-3 7-7h-7z"/>`,

    // --- растения/типы ---
    tree: `<path d="M12 22V8"/><path d="M12 8c0-3 2-5 5-5s-2 5-5 5z"/><path d="M12 8c0-3-2-5-5-5s2 5 5 5z"/><path d="M12 22c4 0 7-3 7-7h-7z"/>`,
    vine: `<path d="M2 22c4 0 6-3 6-7s-2-7-6-7"/><path d="M12 22c4 0 6-3 6-7s-2-7-6-7"/><path d="M22 22c-4 0-6-3-6-7s2-7 6-7"/>`,
    flower: `<circle cx="12" cy="12" r="3"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5 5l3 3M16 16l3 3M16 5l-3 3M5 16l3-3"/>`,
    mushroom: `<path d="M12 2v4"/><path d="M6 14a6 6 0 0 1 12 0"/><path d="M8 14v8M16 14v8"/><path d="M10 22h4"/>`,
    sprout: `<path d="M12 22v-6"/><path d="M9 16l3-6 3 6"/><path d="M12 16v6"/>`,

    // --- слои OSI ---
    layerApp: `<path d="M3 12h18"/><path d="M3 6h18"/><path d="M3 18h18"/>`,
    layerTransport: `<path d="M3 12h18"/><path d="M3 6h18"/>`,
    layerNetwork: `<path d="M3 12h18"/>`,
    layerSecurity: `<path d="M12 22v-6"/><path d="M9 16l3-4 3 4"/>`,

    // --- UI кнопки ---
    quiz: `<circle cx="12" cy="12" r="3"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/>`,
    stats: `<path d="M3 21v-6"/><path d="M9 21v-10"/><path d="M15 21v-4"/><path d="M21 21v-12"/>`,
    cheatsheet: `<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M16 13h-6"/><path d="M16 17h-6"/><path d="M10 9h6"/>`,
    teacher: `<path d="M12 2v4"/><path d="M12 18v4"/><path d="M4.93 4.93l2.83 2.83"/><path d="M16.24 16.24l2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><circle cx="12" cy="12" r="3"/>`,
    print: `<path d="M6 9V2"/><path d="M6 18h12"/><rect x="6" y="14" width="12" height="8" rx="1"/>`,
    back: `<path d="M19 12H5"/><path d="M12 5l-7 7 7 7"/>`,
    compare: `<path d="M3 9h18"/><path d="M3 15h18"/><path d="M3 3h18"/><path d="M3 21h18"/>`,
    path: `<path d="M12 3v6"/><path d="M12 15v6"/><path d="M3 12h6"/><path d="M15 12h6"/>`,
    reveal: `<circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M10 12h4"/>`,
    favOn: `<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>`,
    favOff: `<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>`,
    recent: `<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>`,
    soundOn: `<path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>`,
    soundOff: `<path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>`,
    export: `<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>`,
    import: `<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 10 12 15 7 10"/><line x1="12" y1="15" x2="12" y2="3"/>`,
    reset: `<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>`,
    share: `<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>`,
    tour: `<polygon points="5 3 19 12 5 21 5 3"/>`,
    stop: `<rect x="6" y="6" width="12" height="12" rx="2"/>`,
    exam: `<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>`,
    search: `<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>`,
    close: `<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>`,
    menu: `<line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>`,
    theme: `<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>`,
    lang: `<path d="M5 22h14"/><path d="M5 14h14"/><path d="M5 6h14"/><path d="M17 22v-8"/><path d="M7 6v8"/>`,

    // --- карточка/статусы ---
    badgeActive: `<circle cx="12" cy="12" r="10"/>`,
    badgeUpdated: `<path d="M23 4v6"/><path d="M1 20v-6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36"/><path d="M20.49 15a9 9 0 0 1-14.85 3.36"/>`,
    badgeLegacy: `<circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>`,
    link: `<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>`,
    book: `<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>`,
    lightbulb: `<path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.4 1 2.3h6c0-.9.4-1.8 1-2.3A7 7 0 0 0 12 2z"/>`,

    // --- глоссарий/контент ---
    packet: `<rect x="4" y="6" width="16" height="12" rx="2"/><path d="M12 6v12"/>`,
    ip: `<circle cx="12" cy="12" r="10"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83"/>`,
    port: `<rect x="3" y="11" width="18" height="2" rx="1"/><rect x="3" y="7" width="18" height="2" rx="1"/><line x1="12" y1="13" x2="12" y2="17"/>`,
    handshake: `<path d="M4 11a4 4 0 0 1 6 0"/><path d="M20 11a4 4 0 0 0-6 0"/><path d="M12 3v8"/>`,
    stack: `<rect x="3" y="14" width="18" height="4" rx="1"/><rect x="5" y="10" width="14" height="4" rx="1"/><rect x="7" y="6" width="10" height="4" rx="1"/>`,
    nat: `<path d="M3 9l9-7 9 7"/><path d="M12 2v16"/><circle cx="12" cy="12" r="3"/>`,
    dns: `<path d="M12 22V8M12 8c0-3 2-5 5-5s-2 5-5 5z"/><path d="M12 8c0-3-2-5-5-5s2 5 5 5z"/>`,
    encrypt: `<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>`,
    token: `<circle cx="12" cy="12" r="4"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83"/>`,
    dependency: `<path d="M12 3v6"/><path d="M12 15v6"/><path d="M3 12h6"/><path d="M15 12h6"/>`,
    rfc: `<rect x="2" y="3" width="20" height="18" rx="2"/><path d="M8 13h8"/><path d="M8 17h8"/><path d="M8 9h12"/>`,
    mail: `<path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><polyline points="22,6 12,13 2,6"/>`,
    video: `<polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>`,
    call: `<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>`,
    sensor: `<path d="M12 2v6"/><circle cx="12" cy="16" r="4"/><path d="M8 16h8"/><path d="M12 12v4"/>`,
    news: `<path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2z"/><path d="M12 6v4"/><path d="M12 14h-6"/><path d="M12 18h-6"/>`,
    directory: `<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`,
    private: `<rect x="2" y="3" width="20" height="18" rx="2"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>`,
    domain: `<circle cx="12" cy="12" r="10"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83"/>`,
    website: `<circle cx="12" cy="12" r="10"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83"/>`,
    route: `<path d="M3 9l9-7 9 7"/><path d="M12 2v16"/><circle cx="12" cy="12" r="3"/>`,
    ping: `<path d="M12 22V8M12 8c0-3 2-5 5-5s-2 5-5 5z"/><path d="M12 8c0-3-2-5-5-5s2 5 5 5z"/>`,
    cookie: `<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>`,
  },
  // публичный API
  render(name, attrs = {}) {
    const path = this._defs[name];
    if (!path) return "";
    const a = Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(" ");
    return `<svg class="icon icon-${name}" ${a} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
  },
  inject(name, attrs = {}) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    el.setAttribute("viewBox", "0 0 24 24");
    el.setAttribute("fill", "none");
    el.setAttribute("stroke", "currentColor");
    el.setAttribute("stroke-width", "2");
    el.setAttribute("stroke-linecap", "round");
    el.setAttribute("stroke-linejoin", "round");
    el.classList.add("icon", "icon-" + name);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    el.innerHTML = this._defs[name] || "";
    return el;
  },
  // коллективный рендер: <span data-icon="name"></span>
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
// автоскан при загрузке
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => ICON.scan());
} else {
  ICON.scan();
}
window.ICON = ICON;