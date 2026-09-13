/* intro.js — кинематографичное интро главного экрана («Живой сад»).
   ~15 сек: тишина → нити почвы → стебель → листья-кристаллы →
   цветок-антенна → плоды и лианы → силуэты и туман → reveal → живой фон.
   Эстетика v5: слоистый свет (ореол → тело → жемчужное ядро),
   гранёные кристаллы, стеклянные орбы, ноль shadowBlur.
   Использование:
     const p = RFCIntro.play("introCanvas",
       { onReveal: fn, onDone: fn, quality: "high"|"med"|"low" });
     p.skip() — мгновенно завершить; p.stop() — остановить цикл.
   Тиры качества режут частицы/DPR. Без canvas/DOM — молча onDone.
   Безопасен для загрузки в Node-стабах тестов (никаких действий при require). */
(function () {
"use strict";

function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
function easeOut(t) { t = clamp01(t); return 1 - Math.pow(1 - t, 3); }
function easeInOut(t) { t = clamp01(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
function easeOutBack(t) {
    t = clamp01(t);
    const c = 1.70158;
    return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
}
function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/* ---- локальные хелперы слоистого света (автономны от garden.js:
   тесты грузят intro.js отдельно) ---- */
function hxRgb(hex) {
    const n = parseInt(String(hex).replace("#", ""), 16);
    if (!isFinite(n)) return [160, 200, 210];
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function hxRgba(hex, a) {
    const c = hxRgb(hex);
    return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")";
}
function hxMix(h1, h2, t) {
    const a = hxRgb(h1), b = hxRgb(h2);
    return "rgb(" + Math.round(a[0] + (b[0] - a[0]) * t) + "," +
        Math.round(a[1] + (b[1] - a[1]) * t) + "," +
        Math.round(a[2] + (b[2] - a[2]) * t) + ")";
}
const PEARL = "#dff6ff", ABYSS = "#06121a";
const TEAL = "#14b8a6", CYAN = "#22d3ee", VIOLET = "#8b5cf6", AMBER = "#fbbf24";

/* Сужающаяся световая труба: ореол → сегменты тела → жемчужное ядро. */
function iTube(ctx, pts, w0, w1, color, alpha) {
    if (!pts || pts.length < 2) return;
    const n = pts.length, k = alpha == null ? 1 : alpha;
    ctx.lineCap = "round";
    ctx.strokeStyle = hxRgba(color, 0.10 * k);
    ctx.lineWidth = Math.max(1, w0 * 2.2);
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < n; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
    for (let i = 1; i < n; i++) {
        const t = i / (n - 1);
        ctx.strokeStyle = hxRgba(color, (0.45 + 0.35 * t) * k);
        ctx.lineWidth = Math.max(0.6, w0 + (w1 - w0) * t);
        ctx.beginPath();
        ctx.moveTo(pts[i - 1][0], pts[i - 1][1]);
        ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.stroke();
    }
    ctx.strokeStyle = "rgba(223,246,255," + (0.8 * k).toFixed(3) + ")";
    ctx.lineWidth = Math.max(0.6, w1 * 0.5);
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < n; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
}

/* Гранёный кристалл-кайт от базы к острию. */
function iShard(ctx, bx, by, tx, ty, w, color, pulse, seed, alpha) {
    const k = alpha == null ? 1 : alpha;
    let dx = tx - bx, dy = ty - by;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len; dy /= len;
    const breathe = 1 + 0.05 * Math.sin(pulse * 1.3 + seed);
    const L = len * breathe, W = w * (1 + 0.06 * Math.sin(pulse * 1.7 + seed * 2));
    const px = -dy, py = dx;
    const sx = bx + dx * L * 0.36, sy = by + dy * L * 0.36;
    const m1x = sx + px * W, m1y = sy + py * W;
    const m2x = sx - px * W, m2y = sy - py * W;
    const tipx = bx + dx * L, tipy = by + dy * L;
    const g = ctx.createLinearGradient(bx, by, tipx, tipy);
    g.addColorStop(0, hxMix(color, ABYSS, 0.5));
    g.addColorStop(0.55, hxRgba(color, 0.92 * k));
    g.addColorStop(1, hxMix(color, "#ffffff", 0.72));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(m1x, m1y);
    ctx.lineTo(tipx, tipy);
    ctx.lineTo(m2x, m2y);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255,255,255," + (0.5 * k).toFixed(3) + ")";
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(m1x, m1y);
    ctx.lineTo(tipx, tipy);
    ctx.stroke();
    ctx.strokeStyle = hxRgba(color, 0.55 * k);
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(m2x, m2y);
    ctx.lineTo(tipx, tipy);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255," + (0.9 * k).toFixed(3) + ")";
    ctx.beginPath();
    ctx.arc(bx + dx * L * 0.82, by + dy * L * 0.82, Math.max(0.5, W * 0.11), 0, Math.PI * 2);
    ctx.fill();
    // центральная жилка — читается как кристалл, а не бумага
    ctx.strokeStyle = "rgba(255,255,255," + (0.35 * k).toFixed(3) + ")";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(tipx, tipy);
    ctx.stroke();
}

/* Стеклянная орба: ореол + сфера + блик. */
function iOrb(ctx, x, y, r, color, pulse, seed) {
    if (r <= 0) return;
    const R = r * (1 + 0.07 * Math.sin(pulse * 2 + seed));
    let g = ctx.createRadialGradient(x, y, 0, x, y, R * 3);
    g.addColorStop(0, hxRgba(color, 0.28));
    g.addColorStop(1, hxRgba(color, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, R * 3, 0, Math.PI * 2);
    ctx.fill();
    g = ctx.createRadialGradient(x - R * 0.3, y - R * 0.3, 0, x, y, R);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.35, hxMix(color, "#ffffff", 0.6));
    g.addColorStop(1, hxMix(color, ABYSS, 0.3));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.beginPath();
    ctx.arc(x - R * 0.32, y - R * 0.34, Math.max(0.5, R * 0.26), 0, Math.PI * 2);
    ctx.fill();
}

/* Мягкая светящаяся точка с белым ядром. */
function iGlowDot(ctx, x, y, r, color) {
    ctx.fillStyle = hxRgba(color, 0.22);
    ctx.beginPath();
    ctx.arc(x, y, r * 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
}

/* Световой пакет вдоль ломаной. */
function iPulse(ctx, pts, prog, color, r) {
    if (!pts || pts.length < 2) return;
    let total = 0;
    const cum = [0];
    for (let i = 1; i < pts.length; i++) {
        total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
        cum.push(total);
    }
    if (total <= 0) return;
    const target = (((prog % 1) + 1) % 1) * total;
    let px = pts[0][0], py = pts[0][1];
    for (let i = 1; i < pts.length; i++) {
        if (cum[i] >= target) {
            const seg = cum[i] - cum[i - 1] || 1;
            const t = (target - cum[i - 1]) / seg;
            px = pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t;
            py = pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t;
            break;
        }
    }
    for (let k = 3; k >= 1; k--) {
        ctx.fillStyle = hxRgba(color, 0.10 * k);
        ctx.beginPath();
        ctx.arc(px, py, r * (1 + k * 0.7), 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
}

// Хронология фаз (секунды, с перекрытием — как в концепции).
const PH = {
    soil: 0.5, spark: 2.0, stem0: 2.5, stem1: 3.5, sap: 4.0,
    leaf0: 4.5, core: 7.0, ant: 8.5, pulse: 9.0, fruit: 9.5,
    vine: 10.5, back: 11.5, fog: 12.0, reveal: 13.0, done: 15.0,
};
const TIERS = {
    high: { dprCap: 2, maxP: 90, blur: 1, sil: 7 },
    med: { dprCap: 1.5, maxP: 45, blur: 0.6, sil: 5 },
    low: { dprCap: 1, maxP: 18, blur: 0, sil: 3 },
};

function autoQuality() {
    try {
        const w = (typeof window !== "undefined" && window) || {};
        const mm = w.matchMedia ? w.matchMedia.bind(w) : null;
        const coarse = mm ? mm("(pointer: coarse)").matches : false;
        const small = Math.min(w.innerWidth || 1e9, w.innerHeight || 1e9) < 500;
        const nav = (typeof navigator !== "undefined") ? navigator : {};
        const cores = nav.hardwareConcurrency || 8;
        if ((coarse && small) || cores <= 2) return "low";
        if (coarse || cores <= 4) return "med";
    } catch (e) {}
    return "high";
}

function qbez(p0, p1, p2, t) {
    const u = 1 - t;
    return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
            u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]];
}

function Player(canvas, opts) {
    opts = opts || {};
    const ctx = canvas.getContext("2d");
    let W = 0, H = 0, dpr = 1;
    let tier = TIERS[opts.quality] ? opts.quality : autoQuality();
    let Q = TIERS[tier];
    const rnd = mulberry32(20260712);

    // Статичная композиция в нормализованных координатах (стабильна между кадрами).
    const threads = [];
    for (let i = 0; i < 10; i++) {
        threads.push({ a: rnd() * Math.PI * 2, len: 0.12 + rnd() * 0.22, delay: i * 0.08, wob: rnd() * 6.28 });
    }
    const leafT = [0.34, 0.44, 0.54, 0.62, 0.7, 0.78];
    const leaves = [];
    for (let i = 0; i < 6; i++) {
        leaves.push({ side: i % 2 ? 1 : -1, t: leafT[i], s: 0.8 + rnd() * 0.5, ph: rnd() * 6.28, delay: i * 0.3 });
    }
    const ants = [];
    for (let i = 0; i < 7; i++) {
        ants.push({ a: -Math.PI / 2 + (i - 3) * 0.30 + (rnd() - 0.5) * 0.08, len: 0.9 + rnd() * 0.3, delay: i * 0.1, ph: rnd() * 6.28 });
    }
    const frT = [0.5, 0.62, 0.72, 0.82];
    const fruits = [];
    for (let i = 0; i < 4; i++) {
        fruits.push({ t: frT[i], side: i % 2 ? 1 : -1, delay: i * 0.22, ph: rnd() * 6.28 });
    }
    const vines = [{ side: -1, ph: 0 }, { side: 1, ph: 2.1 }];
    const sils = [];
    for (let i = 0; i < 7; i++) {
        sils.push({ x: 0.06 + i * 0.147 + (rnd() - 0.5) * 0.04, s: 0.45 + rnd() * 0.35, ph: rnd() * 6.28 });
    }
    const stars = [];
    for (let i = 0; i < 70; i++) {
        stars.push({ x: rnd(), y: rnd() * 0.7, s: rnd() < 0.85 ? 1 : 2, ph: rnd() * 6.28, sp: 0.4 + rnd() * 1.2 });
    }

    let parts = [];
    let raf = 0, lastTs = 0, active = 0, started = false;
    let revealed = false, finished = false, dead = false;
    let resizeT = null;

    function resize() {
        let w = 800, h = 600;
        try {
            const r = canvas.getBoundingClientRect();
            if (r && r.width > 2 && r.height > 2) { w = r.width; h = r.height; }
            else if (typeof window !== "undefined") { w = window.innerWidth || 800; h = window.innerHeight || 600; }
        } catch (e) {}
        W = w; H = h;
        let raw = 1;
        try { raw = (typeof window !== "undefined" && window.devicePixelRatio) || 1; } catch (e2) {}
        dpr = Math.min(raw, Q.dprCap);
        canvas.width = Math.max(1, Math.round(W * dpr));
        canvas.height = Math.max(1, Math.round(H * dpr));
    }
    function onResize() {
        if (resizeT) { try { clearTimeout(resizeT); } catch (e) {} }
        resizeT = setTimeout(resize, 150);
    }

    function spawn(p) {
        if (parts.length >= Q.maxP) parts.shift();
        parts.push(p);
    }

    function stemGeom(swayX) {
        const cx = W * 0.5, soilY = H * 0.84, topY = H * 0.30;
        const bend = W * 0.02 + swayX;
        return {
            cx, soilY, topY,
            p0: [cx, soilY], p1: [cx + bend, (soilY + topY) / 2], p2: [cx + bend * 0.4, topY],
        };
    }
    function stemSamples(g, n) {
        const pts = [];
        for (let i = 0; i <= n; i++) pts.push(qbez(g.p0, g.p1, g.p2, i / n));
        return pts;
    }

    /* Почва: световое пятно + веер мицелия-нитей вниз. */
    function drawSoil(t) {
        const cx = W * 0.5, soilY = H * 0.84 + 6;
        const gp = easeOut((t - PH.soil) / 0.8);
        if (gp > 0) {
            const gg = ctx.createRadialGradient(cx, soilY, 0, cx, soilY, W * 0.22);
            gg.addColorStop(0, "rgba(20,184,166," + (0.20 * gp).toFixed(3) + ")");
            gg.addColorStop(1, "rgba(20,184,166,0)");
            ctx.fillStyle = gg;
            ctx.save();
            ctx.translate(cx, soilY);
            ctx.scale(1, 0.16);
            ctx.beginPath();
            ctx.arc(0, 0, W * 0.22, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            // яркая линия горизонта почвы
            const lg = ctx.createLinearGradient(cx - W * 0.2, 0, cx + W * 0.2, 0);
            lg.addColorStop(0, "rgba(45,212,191,0)");
            lg.addColorStop(0.5, "rgba(153,246,228," + (0.5 * gp).toFixed(3) + ")");
            lg.addColorStop(1, "rgba(45,212,191,0)");
            ctx.strokeStyle = lg;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(cx - W * 0.2, soilY);
            ctx.lineTo(cx + W * 0.2, soilY);
            ctx.stroke();
        }
        for (const th of threads) {
            const p = easeOut((t - PH.soil - th.delay) / 0.5);
            if (p <= 0) continue;
            const ex = cx + Math.cos(th.a) * th.len * W * p;
            const ey = soilY + 8 + Math.abs(Math.sin(th.a)) * 16 * p + Math.sin(t * 2 + th.wob) * 2;
            iTube(ctx, [[cx, soilY], [(cx + ex) / 2, soilY + 5], [ex, ey]], 2, 0.5, TEAL, 0.55 * p);
        }
    }

    /* Искра: вспышка-орба + расходящееся кольцо. */
    function drawSpark(t, cx, soilY) {
        const k = (t - PH.spark) / 0.5;
        if (k < 0 || k > 1.2) return;
        const fade = 1 - k * 0.55;
        iOrb(ctx, cx, soilY, 10 * (1 + k * 0.6), CYAN, t, 1);
        ctx.strokeStyle = "rgba(153,246,228," + (0.55 * fade).toFixed(3) + ")";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, soilY, 8 + k * 90, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = "rgba(139,92,246," + (0.3 * fade).toFixed(3) + ")";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, soilY, 4 + k * 55, 0, Math.PI * 2);
        ctx.stroke();
    }

    /* Стебель: растущая световая труба + бегущий импульс + почка на кончике. */
    function drawStem(t, g) {
        const p = easeInOut((t - PH.stem0) / (PH.stem1 - PH.stem0));
        if (p <= 0) return;
        const pts = stemSamples(g, 40);
        const n = Math.max(2, Math.floor(pts.length * p));
        const grown = pts.slice(0, n);
        iTube(ctx, grown, 7, 3, TEAL, 1);
        const tip = grown[grown.length - 1];
        iGlowDot(ctx, tip[0], tip[1], 3.2, CYAN);
        if (t > PH.sap) iPulse(ctx, grown, (t - PH.sap) * 0.45, CYAN, 2.4);
    }

    /* Листья-кристаллы: выскакивают с отскоком, дышат. */
    function drawLeaves(t, g) {
        const pts = stemSamples(g, 40);
        for (let li = 0; li < leaves.length; li++) {
            const lf = leaves[li];
            const ap = (t - PH.leaf0 - lf.delay) / 0.5;
            if (ap <= 0) continue;
            const pop = easeOutBack(ap);
            if (pop <= 0) continue;
            const breath = t > 6.5 ? 1 + 0.05 * Math.sin((t * Math.PI * 2) / 4 + lf.ph) : 1;
            const size = H * 0.038 * lf.s * pop * breath;
            if (size <= 0.5) continue;
            const bp = pts[Math.min(pts.length - 1, Math.floor(lf.t * (pts.length - 1)))];
            const ang = -Math.PI / 2 + lf.side * 0.95 - (1 - Math.min(1, ap)) * 0.4 * lf.side;
            const L = size * 4.2, Wd = size * 0.68;
            iShard(ctx, bp[0], bp[1],
                bp[0] + Math.cos(ang) * L, bp[1] + Math.sin(ang) * L,
                Wd, li % 2 ? VIOLET : TEAL, t, lf.ph, Math.min(1, ap * 1.5));
        }
    }

    /* Цветок: стеклянное ядро с бликом + веер волоконных антенн. */
    function drawFlower(t, g) {
        const core = g.p2;
        const cp = easeOut((t - PH.core) / 0.5);
        if (cp <= 0) return;
        iOrb(ctx, core[0], core[1], 9 * cp, CYAN, t, 2);
        // крест-блик ядра
        ctx.strokeStyle = "rgba(255,255,255," + (0.5 * cp).toFixed(3) + ")";
        ctx.lineWidth = 1;
        const fl = 30 * cp;
        ctx.beginPath();
        ctx.moveTo(core[0] - fl, core[1]); ctx.lineTo(core[0] + fl, core[1]);
        ctx.moveTo(core[0], core[1] - fl); ctx.lineTo(core[0], core[1] + fl);
        ctx.stroke();
        // Волоконные антенны веером вверх.
        for (const an of ants) {
            const p = easeOut((t - 7.5 - an.delay) / 0.4);
            if (p <= 0) continue;
            const sway = t > 8.5 ? Math.sin((t * Math.PI * 2) / 2 + an.ph) * 0.06 : 0;
            const a = an.a + sway;
            const len = H * 0.12 * an.len * p;
            const tip = [core[0] + Math.cos(a) * len, core[1] + Math.sin(a) * len];
            const mid = [core[0] + Math.cos(a) * len * 0.5, core[1] + Math.sin(a) * len * 0.55 - 6 * p];
            iTube(ctx, [core, mid, tip], 2.4, 0.8, VIOLET, p);
            iGlowDot(ctx, tip[0], tip[1], 1.8 * p, VIOLET);
        }
    }

    /* Плоды: янтарные стеклянные орбы на нитях-подвесах. */
    function drawFruits(t, g) {
        const pts = stemSamples(g, 40);
        for (const f of fruits) {
            const p = (t - PH.fruit - f.delay) / 0.5;
            if (p <= 0) continue;
            const s = easeOutBack(p);
            if (s <= 0) continue;
            const bp = pts[Math.min(pts.length - 1, Math.floor(f.t * (pts.length - 1)))];
            const fx = bp[0] + f.side * 18 * s, fy = bp[1] - 12 * s;
            ctx.strokeStyle = hxRgba(AMBER, 0.45 * Math.min(1, s));
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(bp[0], bp[1]);
            ctx.quadraticCurveTo(bp[0] + f.side * 10 * s, bp[1] - 4 * s, fx, fy + 8 * s);
            ctx.stroke();
            iOrb(ctx, fx, fy, 8 * s, AMBER, t, f.ph);
        }
    }

    /* Прикорневые лианы: two fiber tubes along the ground + runners. */
    function vineGeom(g, side) {
        const base = [g.cx, g.soilY];
        const tip = [g.cx + side * W * 0.42, g.soilY - H * 0.06];
        const ctrl = [g.cx + side * W * 0.2, g.soilY + 10];
        return { base, tip, ctrl };
    }
    function drawVines(t, g) {
        for (const v of vines) {
            const geo = vineGeom(g, v.side);
            const p = easeInOut((t - PH.vine) / 1.0);
            if (p <= 0) continue;
            const N = 30, n = Math.max(2, Math.floor(N * p));
            const path = [];
            for (let i = 0; i < n; i++) path.push(qbez(geo.base, geo.ctrl, geo.tip, i / (N - 1)));
            iTube(ctx, path, 3, 1, TEAL, 0.9);
            const tip = path[path.length - 1];
            iGlowDot(ctx, tip[0], tip[1], 2, TEAL);
            // Бегуны данных по grown-лиане.
            if (t > PH.vine + 0.3) {
                const full = [];
                for (let i = 0; i < N; i++) full.push(qbez(geo.base, geo.ctrl, geo.tip, i / (N - 1)));
                for (let k = 0; k < 3; k++) {
                    iPulse(ctx, full, (t - PH.vine) * 0.5 + k / 3 + v.ph * 0.05, CYAN, 2);
                }
            }
        }
    }

    /* Дальние силуэты: приглушённые ростки-трубы с точками-бутонами. */
    function drawBack(t, swayX) {
        const n = Q.sil;
        for (let i = 0; i < n; i++) {
            const s = sils[i];
            const p = easeOut((t - PH.back - i * 0.08) / 0.5);
            if (p <= 0) continue;
            const x = s.x * W + Math.sin(t * 0.8 + s.ph) * 4 + swayX * 0.4;
            const base = H * 0.84 + 10, hgt = H * 0.34 * s.s * p;
            if (hgt <= 1) continue;
            iTube(ctx, [[x, base], [x, base - hgt * 0.6], [x, base - hgt]], 3, 1, TEAL, 0.3 * p);
            iGlowDot(ctx, x, base - hgt, 1.6 * p, TEAL);
        }
    }

    function drawFog(t) {
        const p = easeOut((t - PH.fog) / 1.0);
        if (p <= 0) return;
        const y = H * 0.62 + Math.sin(t * 0.3) * 10;
        const hgt = H * 0.28;
        const grad = ctx.createLinearGradient(0, y, 0, y + hgt);
        grad.addColorStop(0, "rgba(30,60,90,0)");
        grad.addColorStop(0.5, "rgba(30,60,90," + (0.16 * p).toFixed(3) + ")");
        grad.addColorStop(1, "rgba(30,60,90,0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, y, W, hgt);
    }

    /* Звёздная пыль + виньетка поверх всего. */
    function drawSky(t) {
        if (t < 1.0) return;
        for (const st of stars) {
            const a = 0.10 + 0.20 * Math.abs(Math.sin(t * st.sp + st.ph));
            ctx.globalAlpha = Math.min(1, a * Math.min(1, (t - 1) / 2));
            ctx.fillStyle = "#cfe9ff";
            ctx.fillRect(st.x * W, st.y * H, st.s, st.s);
        }
        ctx.globalAlpha = 1;
        const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
        v.addColorStop(0, "rgba(0,0,0,0)");
        v.addColorStop(1, "rgba(0,0,0,0.40)");
        ctx.fillStyle = v;
        ctx.fillRect(0, 0, W, H);
    }

    function emit(t, dt, g) {
        // Почвенные мотыльки вверх.
        if (t > 1.0 && rnd() < 0.5) {
            spawn({ x: g.cx + (rnd() - 0.5) * W * 0.5, y: g.soilY + rnd() * 10,
                vx: (rnd() - 0.5) * 8, vy: -20 - rnd() * 15,
                age: 0, life: 2.5 + rnd(), size: 1.6, color: "#a7f3d0" });
        }
        // Сок по стеблю.
        if (t > PH.sap && rnd() < dt * 40) {
            spawn({ x: g.cx + (rnd() - 0.5) * 6, y: g.soilY,
                vx: (rnd() - 0.5) * 4, vy: -60 - rnd() * 20,
                age: 0, life: (g.soilY - g.topY) / 60, size: 2, color: "#84cc16" });
        }
        // Искорки цветка.
        if (t > PH.ant && rnd() < dt * 25) {
            const a = rnd() * Math.PI * 2, r = 6 + rnd() * 26;
            spawn({ x: g.p2[0] + Math.cos(a) * r, y: g.p2[1] + Math.sin(a) * r,
                vx: Math.cos(a) * 6, vy: Math.sin(a) * 6 - 4,
                age: 0, life: 1.2 + rnd(), size: 1.8, color: "#67e8f9" });
        }
    }
    function drawParts(dt) {
        ctx.globalCompositeOperation = "lighter";
        for (let i = parts.length - 1; i >= 0; i--) {
            const p = parts[i];
            p.age += dt;
            if (p.age >= p.life) { parts.splice(i, 1); continue; }
            p.x += p.vx * dt; p.y += p.vy * dt;
            ctx.globalAlpha = 1 - p.age / p.life;
            ctx.fillStyle = hxRgba(p.color, 0.25);
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 2.4, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#ffffff";
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.7, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
    }

    function draw(dt, t) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        // глубокий фон: вертикальный градиент + teal-дымка у почвы
        const bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, "#05090f");
        bg.addColorStop(0.6, "#071018");
        bg.addColorStop(1, "#03060a");
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        const swayX = t > 3.5 ? Math.sin((t * Math.PI * 2) / 3) * 2.5 * easeOut((t - 3.5) / 1) : 0;
        const g = stemGeom(swayX);

        drawBack(t, swayX);
        if (t >= PH.soil) drawSoil(t);
        if (t >= PH.spark) drawSpark(t, g.cx, g.soilY);
        if (t >= PH.stem0) {
            ctx.save();
            drawStem(t, g);
            drawLeaves(t, g);
            drawFlower(t, g);
            drawFruits(t, g);
            ctx.restore();
        }
        if (t >= PH.vine) drawVines(t, g);
        emit(t, dt, g);
        drawParts(dt);
        if (t >= PH.fog) drawFog(t);
        drawSky(t);
    }

    function frame(ts) {
        if (dead || finished) return;
        if (!started) { started = true; lastTs = ts; }
        let dt = (ts - lastTs) / 1000;
        lastTs = ts;
        if (!(dt >= 0) || dt > 0.05) dt = dt > 0.05 ? 0.05 : 0;
        active += dt;
        try { draw(dt, active); } catch (e) {}
        if (!revealed && active >= PH.reveal) {
            revealed = true;
            try { opts.onReveal && opts.onReveal(); } catch (e2) {}
        }
        if (active >= PH.done) { finish(); return; }
        raf = requestAnimationFrame(frame);
    }

    function finish() {
        if (finished) return;
        finished = true;
        try { if (raf) cancelAnimationFrame(raf); } catch (e) {}
        if (!revealed) {
            revealed = true;
            try { opts.onReveal && opts.onReveal(); } catch (e2) {}
        }
        try { opts.onDone && opts.onDone(); } catch (e3) {}
    }

    const api = {
        play() {
            resize();
            if (W < 2 || H < 2 || !ctx) { finish(); return api; }
            try {
                if (typeof window !== "undefined" && window.addEventListener) {
                    window.addEventListener("resize", onResize);
                }
            } catch (e) {}
            lastTs = 0;
            raf = requestAnimationFrame(frame);
            return api;
        },
        skip() { finish(); return api; },
        stop() {
            dead = true;
            try { if (raf) cancelAnimationFrame(raf); } catch (e) {}
            try {
                if (typeof window !== "undefined" && window.removeEventListener) {
                    window.removeEventListener("resize", onResize);
                }
            } catch (e2) {}
            try { if (resizeT) clearTimeout(resizeT); } catch (e3) {}
            return api;
        },
        setQuality(q) {
            if (TIERS[q]) { tier = q; Q = TIERS[q]; resize(); }
            return tier;
        },
        get done() { return finished; },
    };
    return api;
}

function play(canvasId, opts) {
    opts = opts || {};
    const noop = { skip() {}, stop() {}, setQuality() {}, get done() { return true; } };
    try {
        if (typeof document === "undefined") { opts.onDone && opts.onDone(); return noop; }
        const canvas = document.getElementById(canvasId);
        if (!canvas || !canvas.getContext) { opts.onReveal && opts.onReveal(); opts.onDone && opts.onDone(); return noop; }
        return Player(canvas, opts).play();
    } catch (e) {
        try { opts.onReveal && opts.onReveal(); } catch (e2) {}
        try { opts.onDone && opts.onDone(); } catch (e3) {}
        return noop;
    }
}

const API = { play: play, PHASE: PH, TIERS: Object.keys(TIERS) };
if (typeof window !== "undefined") window.RFCIntro = API;
if (typeof globalThis !== "undefined") {
    try { globalThis.RFCIntro = globalThis.RFCIntro || API; } catch (e) {}
}
})();
