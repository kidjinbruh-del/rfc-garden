// main.js — логика главной страницы
(function () {
"use strict";

try { document.documentElement.classList.add("js"); } catch (e) {}

// ворота entrance: ждём РЕАЛЬНЫЕ начертания замером (техника FontFaceObserver).
// document.fonts.ready/load резолвятся вхолостую, пока таблица не распарсена,
// поэтому меряем ширину строки своим canvas: совпала с фолбэком — ждём.
(function () {
    let done = false;
    const ready = () => {
        if (done) return; done = true;
        try { document.documentElement.classList.add("ready"); } catch (e) {}
    };
    const TEST = "Сад сетевых 0123456789";
    const isFallback = () => {
        try {
            const c = document.createElement("canvas");
            const ctx = c.getContext ? c.getContext("2d") : null;
            if (!ctx || !ctx.measureText) return false; // нечем мерить — ворота не держим
            ctx.font = '800 76px Inter, "__rfc_probe__"';
            const a = ctx.measureText(TEST).width;
            ctx.font = '800 76px "__rfc_probe__"';
            const b = ctx.measureText(TEST).width;
            return a === b;
        } catch (e) { return false; }
    };
    try {
        if (document.fonts && typeof document.fonts.load === "function") {
            document.fonts.load("800 76px Inter").catch(() => {});
            document.fonts.load('600 30px "JetBrains Mono"').catch(() => {});
        }
    } catch (e) {}
    try {
        if (isFallback()) {
            const t0 = Date.now();
            const iv = setInterval(() => {
                try {
                    if (!isFallback() || Date.now() - t0 > 2000) {
                        clearInterval(iv);
                        ready();
                    }
                } catch (e) { try { clearInterval(iv); } catch (e2) {} ready(); }
            }, 100);
        } else ready();
    } catch (e) { ready(); }
})();

if (document.getElementById('gardenCanvas') && typeof ProtocolGarden !== 'undefined') {
    const garden = new ProtocolGarden('gardenCanvas');
    window.rfcGarden = garden;
    garden.loadProtocols(protocolsData);

    // ручной тир качества: ?perf=low|med|high (для слабых устройств и тестов)
    try {
        const q = new URLSearchParams(location.search);
        const perf = q.get("perf");
        if (perf && garden.setQuality) garden.setQuality(perf, true);
    } catch (e) {}

    // сад живой сразу: интро-оверлея больше нет, текст появляется CSS-анимацией
    garden.start();

    // при сворачивании/прокрутке страницы останавливаем hero-сад, чтобы не тратить CPU
    if (typeof IntersectionObserver !== "undefined") {
        const hero = document.getElementById('gardenCanvas');
        if (hero) {
            const io = new IntersectionObserver((entries) => {
                const visible = entries.some((e) => e.isIntersecting);
                if (visible && !garden.animationId) garden.start();
                else if (!visible && garden.animationId) garden.stop();
            }, { rootMargin: "200px" });
            io.observe(hero);
            garden._io = io;
        }
    }
}

// появление блоков при прокрутке (.rv / .rv-stagger получают .in)
(function () {
    let els = [];
    try { els = Array.prototype.slice.call(document.querySelectorAll('.rv,.rv-stagger')); } catch (e) {}
    if (!els.length) return;
    // после проявления классы-маркеры снимаются (.in остаётся):
    // hover-переходы возвращаются к быстрым нативным, reveal уже отыгран
    const finalize = (el) => {
        setTimeout(() => {
            try { el.classList.remove('rv', 'rv-stagger'); } catch (e) {}
        }, 1400);
    };
    const showAll = () => els.forEach((el) => {
        try { el.classList.add('in'); } catch (e) {}
        finalize(el);
    });
    let reduced = false;
    try { reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    if (reduced || typeof IntersectionObserver === "undefined") { showAll(); return; }
    const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
            if (en.isIntersecting) {
                try { en.target.classList.add('in'); } catch (e) {}
                io.unobserve(en.target);
                finalize(en.target);
            }
        });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    els.forEach((el) => io.observe(el));
})();

function animateValue(el, end, duration) {
    const t0 = performance.now();
    (function step(t) {
        const k = Math.min((t - t0) / duration, 1);
        el.textContent = Math.floor(k * end);
        if (k < 1) requestAnimationFrame(step);
    })(performance.now());
}

let _pc = null, _cc = null;
try {
    _pc = document.getElementById('protocolCount');
    _cc = document.getElementById('connectionCount');
    // нули сразу, чтобы не мигало «72 → 0 → 72» перед count-up
    if (_pc) _pc.textContent = "0";
    if (_cc) _cc.textContent = "0";
} catch (e) {}
setTimeout(() => {
    const pc = _pc, cc = _cc;
    if (!pc || !cc) return;
    let conn = 0;
    try { protocolsData.protocols.forEach((p) => (conn += (p.dependsOn?.length || 0))); } catch (e) {}
    const total = protocolsData.protocols.length;
    let reduced = false;
    try { reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    if (reduced) { pc.textContent = total; cc.textContent = conn; return; }
    animateValue(pc, total, 1400);
    animateValue(cc, conn, 1400);
}, 350);

document.querySelectorAll('.layer-card').forEach((card) => {
    const url = new URL(card.href);
    const layer = url.searchParams.get('layer');
    if (!layer) return;
    const n = protocolsData.protocols.filter((p) => p.layer === layer).length;
    const span = card.querySelector('.lc-count');
    if (span) span.textContent = n + " " + I18N.t("main.protocols", "объектов");
});

// клик-ripple на кнопках: вспышка расходящимся кругом от точки клика
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

// ---- Awwwards-слой: glow-курсор, магнитные кнопки, 3D-tilt, marquee, прогресс ----
(function () {
    let reduced = false, fine = false;
    try {
        const mm = window.matchMedia ? window.matchMedia.bind(window) : null;
        reduced = mm ? mm("(prefers-reduced-motion: reduce)").matches : false;
        fine = mm ? mm("(pointer: fine)").matches : true;
    } catch (e) {}
    if (reduced) return;
    const hasRaf = typeof requestAnimationFrame === "function";

    // свечение за курсором (lerp-догон)
    let glow = null;
    try { glow = document.getElementById("cursorGlow"); } catch (e) {}
    if (glow && fine && hasRaf) {
        let mx = -9999, my = -9999, gx = -9999, gy = -9999;
        try {
            document.addEventListener("mousemove", (e) => { mx = e.clientX; my = e.clientY; });
        } catch (e) {}
        (function loop() {
            if (gx < -1000 && mx > -1000) { gx = mx; gy = my; }
            gx += (mx - gx) * 0.12; gy += (my - gy) * 0.12;
            try { glow.style.transform = "translate(" + gx + "px," + gy + "px)"; } catch (e) {}
            requestAnimationFrame(loop);
        })();
    }

    // магнитные hero-кнопки
    let btns = [];
    try { btns = Array.prototype.slice.call(document.querySelectorAll(".hero-buttons .btn")); } catch (e) {}
    if (btns.length && fine) {
        btns.forEach((b) => {
            try {
                b.addEventListener("mousemove", (e) => {
                    try {
                        const r = b.getBoundingClientRect();
                        const dx = e.clientX - (r.left + r.width / 2);
                        const dy = e.clientY - (r.top + r.height / 2);
                        b.style.transform = "translate(" + (dx * 0.18).toFixed(1) + "px," + (dy * 0.28).toFixed(1) + "px)";
                    } catch (err) {}
                });
                b.addEventListener("mouseleave", () => { try { b.style.transform = ""; } catch (err) {} });
            } catch (e) {}
        });
    }

    // 3D-tilt карточек за курсором (только проявленные)
    let tilts = [];
    try { tilts = Array.prototype.slice.call(document.querySelectorAll(".rv-stagger .card, .rv-stagger .layer-card")); } catch (e) {}
    if (tilts.length && fine) {
        tilts.forEach((el) => {
            try {
                el.addEventListener("mousemove", (e) => {
                    try {
                        const p = el.parentElement;
                        if (p && p.classList && !p.classList.contains("in")) return;
                        const r = el.getBoundingClientRect();
                        if (!r.width || !r.height) return;
                        const px = (e.clientX - r.left) / r.width - 0.5;
                        const py = (e.clientY - r.top) / r.height - 0.5;
                        el.style.transform = "perspective(700px) rotateX(" + (-py * 7).toFixed(2) +
                            "deg) rotateY(" + (px * 9).toFixed(2) + "deg) translateY(-4px)";
                    } catch (err) {}
                });
                el.addEventListener("mouseleave", () => { try { el.style.transform = ""; } catch (err) {} });
            } catch (e) {}
        });
    }

    // бегущая строка: все 72 имени ×2 для бесшовного -50%
    let mq = null;
    try { mq = document.getElementById("mqInner"); } catch (e) {}
    if (mq) {
        try {
            const half = protocolsData.protocols
                .map((p) => "<span>" + p.name + "</span>")
                .join('<span class="mq-dot">·</span>');
            mq.innerHTML = '<div class="mq-group">' + half + '</div>' +
                '<div class="mq-group" aria-hidden="true">' + half + '</div>';
        } catch (e) {}
    }

    // прогресс скролла
    let bar = null;
    try { bar = document.getElementById("scrollbar"); } catch (e) {}
    if (bar) {
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
    }
})();

console.log('RFC Garden: главная инициализирована');
})();
