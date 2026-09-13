// motion.js — единая motion-система всех страниц, кроме главной (там main.js).
// Только querySelector*: невидим для check-ids. Везде guards — безопасен в стабах.
(function () {
"use strict";

let page = "";
try { page = (location.pathname || "").split("/").pop() || "index.html"; } catch (e) { return; }
if (!page || page === "index.html") return; // главная — за main.js

const VARIANTS = {
    "explore.html": "deck",
    "encyclopedia.html": "bloom",
    "timeline.html": "axis",
    "quiz.html": "pop",
    "stats.html": "bars",
    "article.html": "reading",
    "cheatsheet.html": "sheet",
    "guide.html": "steps",
};
const GRID_SEL = ".grid-cards,.layer-row,.stat-grid,.fam-grid,.fmt-grid,.timeline,#topBars,#layerBars,table.sheet tbody";
const SOLO_SEL = "main > h1,main > p.sec-sub,main > section,main > .demo-card,main > .step-card,main > .ency-tools,main > .art-nav,#quizBox,#protoCard,#compareCard";
const FALLBACK_NAMES = ["TCP", "UDP", "QUIC", "HTTP/3", "DNS", "TLS 1.3", "IPv6", "SSH", "BGP", "WebSocket"];

let reduced = false, fine = false;
try {
    const mm = window.matchMedia ? window.matchMedia.bind(window) : null;
    reduced = mm ? mm("(prefers-reduced-motion: reduce)").matches : false;
    fine = mm ? mm("(pointer: fine)").matches : true;
} catch (e) {}
const hasRaf = typeof requestAnimationFrame === "function";
const hasIO = typeof IntersectionObserver !== "undefined";
const hasMO = typeof MutationObserver !== "undefined";

try { document.documentElement.classList.add("js"); } catch (e) {}

// вариант страницы → body[data-motion]
const variant = VARIANTS[page] || "";
try {
    if (variant && document.body) document.body.setAttribute("data-motion", variant);
} catch (e) {}

// верхняя полоса (пропускаем, если страница построила свою)
(function strip() {
    let nav = null, mq = null;
    try { nav = document.querySelector(".navbar"); } catch (e) {}
    try { mq = document.querySelector("#mqInner"); } catch (e) {}
    if (!nav || !nav.parentElement || mq) return;
    try {
        let names = null;
        try { names = (typeof protocolsData !== "undefined") ? protocolsData.protocols.map((p) => p.name) : null; }
        catch (e) { names = null; }
        if (!names || !names.length) names = FALLBACK_NAMES;
        const half = names.map((n) => "<span>" + n + "</span>").join('<span class="mq-dot">·</span>');
        const el = document.createElement("div");
        el.className = "marquee marquee-top";
        el.setAttribute("aria-hidden", "true");
        el.innerHTML = '<div class="marquee-inner"><div class="mq-group">' + half + "</div>" +
            '<div class="mq-group" aria-hidden="true">' + half + "</div></div>";
        nav.parentElement.insertBefore(el, nav.nextSibling);
    } catch (e) {}
})();

// зерно поверх (кинематографичность)
try {
    if (!document.querySelector(".grain")) {
        const gr = document.createElement("div");
        gr.className = "grain";
        gr.setAttribute("aria-hidden", "true");
        document.body.appendChild(gr);
    }
} catch (e) {}

// прогресс скролла
(function progress() {
    let bar = null;
    try { bar = document.querySelector("#scrollbar"); } catch (e) {}
    if (!bar) {
        try {
            bar = document.createElement("div");
            bar.id = "scrollbar";
            bar.setAttribute("aria-hidden", "true");
            document.body.appendChild(bar);
        } catch (e) { return; }
    }
    const upd = () => {
        try {
            const h = document.documentElement;
            const max = h.scrollHeight - h.clientHeight;
            bar.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + "%";
        } catch (e) {}
    };
    try {
        document.addEventListener("scroll", upd, { passive: true });
        window.addEventListener("resize", upd);
        upd();
    } catch (e) {}
})();

// glow-курсор
(function glowCursor() {
    let glow = null;
    try { glow = document.querySelector("#cursorGlow"); } catch (e) {}
    if (!glow) {
        try {
            glow = document.createElement("div");
            glow.id = "cursorGlow";
            glow.setAttribute("aria-hidden", "true");
            document.body.appendChild(glow);
        } catch (e) { return; }
    }
    if (reduced || !fine || !hasRaf) {
        try { glow.style.display = "none"; } catch (e) {}
        return;
    }
    let mx = -9999, my = -9999, gx = -9999, gy = -9999;
    try {
        document.addEventListener("mousemove", (e) => { mx = e.clientX; my = e.clientY; });
    } catch (e) { return; }
    (function loop() {
        if (gx < -1000 && mx > -1000) { gx = mx; gy = my; }
        gx += (mx - gx) * 0.12; gy += (my - gy) * 0.12;
        try { glow.style.transform = "translate(" + gx + "px," + gy + "px)"; } catch (e) {}
        requestAnimationFrame(loop);
    })();
})();

// клик-ripple на кнопках (на главной — свой в main.js)
(function () {
    try {
        document.addEventListener("click", (e) => {
            const b = e.target && e.target.closest ? e.target.closest(".btn") : null;
            if (!b || !b.getBoundingClientRect) return;
            try {
                const r = b.getBoundingClientRect();
                const s = document.createElement("span");
                s.className = "btn-ripple";
                const d = Math.max(r.width, r.height) * 1.1;
                s.style.width = s.style.height = d + "px";
                s.style.left = (e.clientX - r.left - d / 2) + "px";
                s.style.top = (e.clientY - r.top - d / 2) + "px";
                b.appendChild(s);
                setTimeout(() => { try { s.remove(); } catch (err) {} }, 650);
            } catch (err) {}
        });
    } catch (e) {}
})();

// ---- маркировка + reveal ----
let io = null;
const finalize = (el) => {
    // снимаем только маркеры скрытия, .in оставляем:
    // так hover-переходы становятся нативными, а .in-зависимые правила (бары) живут
    setTimeout(() => {
        try { el.classList.remove("rv", "rv-stagger"); } catch (e) {}
    }, 1400);
};
if (hasIO && !reduced) {
    try {
        io = new IntersectionObserver((entries) => {
            entries.forEach((en) => {
                if (en.isIntersecting) {
                    try { en.target.classList.add("in"); } catch (e) {}
                    try { io.unobserve(en.target); } catch (e) {}
                    finalize(en.target);
                }
            });
        }, { threshold: 0, rootMargin: "0px 0px -40px 0px" });
    } catch (e) { io = null; }
}
function markEl(el, cls) {
    try {
        if (!el || !el.classList) return;
        if (el.classList.contains("rv") || el.classList.contains("rv-stagger") || el._motionSeen) return;
        el._motionSeen = true;
        el.classList.add(cls);
        if (reduced || !io) {
            el.classList.add("in");
            finalize(el);
        } else io.observe(el);
    } catch (e) {}
}
function markAll(root) {
    try {
        const doc = root || document;
        const solos = doc.querySelectorAll ? doc.querySelectorAll(SOLO_SEL) : [];
        for (let i = 0; i < solos.length; i++) markEl(solos[i], "rv");
        const grids = doc.querySelectorAll ? doc.querySelectorAll(GRID_SEL) : [];
        for (let i = 0; i < grids.length; i++) markEl(grids[i], "rv-stagger");
    } catch (e) {}
}
markAll(document);
try {
    document.addEventListener("DOMContentLoaded", () => markAll(document));
} catch (e) {}
// догоняем поздно вставленные узлы (квиз-опции и т.п.)
if (hasMO) {
    try {
        const mo = new MutationObserver((muts) => {
            muts.forEach((mu) => {
                (mu.addedNodes || []).forEach((nd) => {
                    if (!nd || nd.nodeType !== 1) return;
                    try {
                        if (nd.matches) {
                            if (nd.matches(SOLO_SEL)) markEl(nd, "rv");
                            else if (nd.matches(GRID_SEL)) markEl(nd, "rv-stagger");
                        }
                    } catch (e) {}
                    markAll(nd);
                });
            });
        });
        if (document.body) mo.observe(document.body, { childList: true, subtree: true });
    } catch (e) {}
}
})();
