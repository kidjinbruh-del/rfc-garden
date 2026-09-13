/* ============================================================
   ProtocolGarden v4 — Techno-Flora Engine
   L-systems + Perlin noise + fiber-optic stems + crystal leaves.
   Панорамирование (drag/touch), зум (wheel/pinch),
   hover-tooltip, выбор растения кликом, фильтры, подсветка связей.
   ============================================================ */

/* ---- Perlin Noise (simplex-like 2D, compact) ---- */
const _Perlin = (() => {
    const P = new Uint8Array(512);
    const perm = [151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,
        69,142,8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,
        203,117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,
        165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,
        92,41,55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,
        89,18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,
        226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,
        182,189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,
        43,172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,
        228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,107,
        49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,138,
        236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180];
    for (let i = 0; i < 256; i++) { P[i] = P[i + 256] = perm[i]; }
    const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
    const lerp = (a, b, t) => a + t * (b - a);
    const grad = (h, x, y) => {
        const v = h & 3;
        return (v === 0 ? x + y : v === 1 ? -x + y : v === 2 ? x - y : -x - y);
    };
    return {
        get(x, y) {
            const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
            const xf = x - Math.floor(x), yf = y - Math.floor(y);
            const u = fade(xf), v = fade(yf);
            const aa = P[P[X] + Y], ab = P[P[X] + Y + 1];
            const ba = P[P[X + 1] + Y], bb = P[P[X + 1] + Y + 1];
            return lerp(
                lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u),
                lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u),
                v
            );
        },
        fbm(x, y, octaves = 4, lacunarity = 2, gain = 0.5) {
            let val = 0, amp = 1, freq = 1, max = 0;
            for (let i = 0; i < octaves; i++) {
                val += this.get(x * freq, y * freq) * amp;
                max += amp;
                amp *= gain;
                freq *= lacunarity;
            }
            return val / max;
        }
    };
})();

/* ---- L-System Engine ---- */
const LSystem = {
    expand(axiom, rules, iterations) {
        let s = axiom;
        for (let i = 0; i < iterations; i++) {
            let next = "";
            for (const ch of s) {
                next += rules[ch] || ch;
            }
            s = next;
        }
        return s;
    },
    interpret(str, opts) {
        const { angle, len, lenDecay = 0.72, widthDecay = 0.68 } = opts;
        const segments = [];
        const stack = [];
        let x = 0, y = 0, a = -Math.PI / 2, l = len, w = opts.width || 2;
        for (const ch of str) {
            switch (ch) {
                case "F":
                case "X": {
                    const nx = x + Math.cos(a) * l;
                    const ny = y + Math.sin(a) * l;
                    segments.push({ x1: x, y1: y, x2: nx, y2: ny, depth: stack.length, width: w });
                    x = nx; y = ny;
                    break;
                }
                case "+": a += angle; break;
                case "-": a -= angle; break;
                case "[":
                    stack.push({ x, y, a, l, w });
                    l *= lenDecay;
                    w *= widthDecay;
                    break;
                case "]":
                    if (stack.length) {
                        const s = stack.pop();
                        x = s.x; y = s.y; a = s.a; l = s.l; w = s.w;
                    }
                    break;
            }
        }
        return segments;
    },
    getTips(str) {
        const tips = [];
        const stack = [];
        let x = 0, y = 0, a = -Math.PI / 2;
        const angleStack = [];
        for (const ch of str) {
            switch (ch) {
                case "F": case "X":
                    x += Math.cos(a); y += Math.sin(a);
                    break;
                case "+": a += 0.4; break;
                case "-": a -= 0.4; break;
                case "[": stack.push({ x, y, a }); angleStack.push(a); break;
                case "]":
                    tips.push({ x, y });
                    if (stack.length) { const s = stack.pop(); x = s.x; y = s.y; a = s.a; }
                    break;
            }
        }
        return tips;
    }
};

/* ---- Techno-flora v5: layered light over precomputed geometry ----
   Design rules:
   - every stem shares a pearl-cyan fiber core (palette unity),
     protocol color lives only in aura / facets / accents;
   - volume comes from 3 passes (halo -> body -> core), never shadowBlur;
   - geometry (L-system + Perlin) is baked ONCE per plant type into
     _geoCache; per frame we only transform + stroke (perf-safe). */

function _seedRand(seed) {
    let a = seed >>> 0;
    return function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
function _hashStr(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
}
function _hexRgb(hex) {
    const n = parseInt(String(hex).replace("#", ""), 16);
    if (!isFinite(n)) return [160, 200, 210];
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function _rgba(hex, a) {
    const c = _hexRgb(hex);
    return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")";
}
function _mix(h1, h2, t) {
    const a = _hexRgb(h1), b = _hexRgb(h2);
    const m0 = Math.round(a[0] + (b[0] - a[0]) * t);
    const m1 = Math.round(a[1] + (b[1] - a[1]) * t);
    const m2 = Math.round(a[2] + (b[2] - a[2]) * t);
    return "rgb(" + m0 + "," + m1 + "," + m2 + ")";
}
const _PEARL = "#dff6ff";   // unified fiber-optic core tint
const _ABYSS = "#06121a";   // deep shade for facet roots

/* ---- Дизайн-ручки: все ключевые пропорции в одном месте.
   flora-lab.html крутит их живьём; экспорт оттуда вставляется сюда. ---- */
const FLORA = {
    seed: 0,     // вариант геометрии (целое; другой seed = другая форма)
    petal: 1.0,  // длина лепестков/короны ( baked в геометрию )
    crown: 1.0,  // плотность короны дерева (доля кристаллов)
    shard: 1.0,  // размер кристаллов
    tube: 1.0,   // толщина стеблей-труб
    orb: 1.0,    // размер орб (плоды, почки, ядра)
    glow: 1.0,   // сила свечений (альфа ореолов)
    aura: 1.0,   // радиус ауры растения
};
if (typeof window !== "undefined") window.__FLORA_VERSION = "v5";

/* Tapered fiber tube: halo -> body segments -> pearl core. */
function _tube(ctx, pts, w0, w1, color, alphaScale) {
    if (!pts || pts.length < 2) return;
    w0 *= FLORA.tube; w1 *= FLORA.tube;
    const n = pts.length;
    const k = alphaScale == null ? 1 : alphaScale;
    ctx.lineCap = "round";
    ctx.strokeStyle = _rgba(color, 0.10 * k);
    ctx.lineWidth = Math.max(1, w0 * 2.2);
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < n; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
    for (let i = 1; i < n; i++) {
        const t = i / (n - 1);
        ctx.strokeStyle = _rgba(color, (0.45 + 0.35 * t) * k);
        ctx.lineWidth = Math.max(0.6, w0 + (w1 - w0) * t);
        ctx.beginPath();
        ctx.moveTo(pts[i - 1].x, pts[i - 1].y);
        ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();
    }
    ctx.strokeStyle = "rgba(223,246,255," + (0.8 * k).toFixed(3) + ")";
    ctx.lineWidth = Math.max(0.6, w1 * 0.5);
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < n; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
}

/* Faceted crystal shard: kite from base B to tip T, width w at shoulder. */
function _shard(ctx, bx, by, tx, ty, w, color, pulse, seed, alphaScale) {
    const k = alphaScale == null ? 1 : alphaScale;
    let dx = tx - bx, dy = ty - by;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len; dy /= len;
    const breathe = 1 + 0.05 * Math.sin(pulse * 1.3 + seed);
    const L = len * breathe * FLORA.shard, W = w * (1 + 0.06 * Math.sin(pulse * 1.7 + seed * 2)) * FLORA.shard;
    const px = -dy, py = dx;
    const sx = bx + dx * L * 0.36, sy = by + dy * L * 0.36;
    const m1x = sx + px * W, m1y = sy + py * W;
    const m2x = sx - px * W, m2y = sy - py * W;
    const tipx = bx + dx * L, tipy = by + dy * L;
    const g = ctx.createLinearGradient(bx, by, tipx, tipy);
    g.addColorStop(0, _mix(color, _ABYSS, 0.5));
    g.addColorStop(0.55, _rgba(color, 0.92 * k));
    g.addColorStop(1, _mix(color, "#ffffff", 0.72));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(m1x, m1y);
    ctx.lineTo(tipx, tipy);
    ctx.lineTo(m2x, m2y);
    ctx.closePath();
    ctx.fill();
    // lit facet edge (left) + dark facet edge (right)
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255,255,255," + (0.5 * k).toFixed(3) + ")";
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(m1x, m1y);
    ctx.lineTo(tipx, tipy);
    ctx.stroke();
    ctx.strokeStyle = _rgba(color, 0.55 * k);
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(m2x, m2y);
    ctx.lineTo(tipx, tipy);
    ctx.stroke();
    // specular spark near tip
    ctx.fillStyle = "rgba(255,255,255," + (0.9 * k).toFixed(3) + ")";
    ctx.beginPath();
    ctx.arc(bx + dx * L * 0.72, by + dy * L * 0.72, Math.max(0.6, W * 0.2), 0, Math.PI * 2);
    ctx.fill();
}

/* Glass orb (fruit / bud / node): halo + sphere + highlight, no shadowBlur. */
function _orb(ctx, x, y, r, color, pulse, seed) {
    r *= FLORA.orb;
    if (r <= 0) return;
    const R = r * (1 + 0.07 * Math.sin(pulse * 2 + seed));
    let g = ctx.createRadialGradient(x, y, 0, x, y, R * 3);
    g.addColorStop(0, _rgba(color, 0.28));
    g.addColorStop(1, _rgba(color, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, R * 3, 0, Math.PI * 2);
    ctx.fill();
    g = ctx.createRadialGradient(x - R * 0.3, y - R * 0.3, 0, x, y, R);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.35, _mix(color, "#ffffff", 0.6));
    g.addColorStop(1, _mix(color, _ABYSS, 0.3));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.beginPath();
    ctx.arc(x - R * 0.32, y - R * 0.34, Math.max(0.5, R * 0.26), 0, Math.PI * 2);
    ctx.fill();
}

/* Soft additive dot (LED tip, spore, spark). */
function _glowDot(ctx, x, y, r, color, coreWhite) {
    ctx.fillStyle = _rgba(color, 0.22);
    ctx.beginPath();
    ctx.arc(x, y, r * 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = coreWhite ? "#ffffff" : _rgba(color, 0.95);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
}

/* Light packet travelling along a polyline + short trail. */
let _BAKING = false; // true while a sprite bakes: travelling pulses are skipped
function _pulseRun(ctx, pts, prog, color, r) {
    if (_BAKING) return;
    if (!pts || pts.length < 2) return;
    let total = 0;
    const cum = [0];
    for (let i = 1; i < pts.length; i++) {
        total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
        cum.push(total);
    }
    if (total <= 0) return;
    const target = (((prog % 1) + 1) % 1) * total;
    let px = pts[0].x, py = pts[0].y;
    for (let i = 1; i < pts.length; i++) {
        if (cum[i] >= target) {
            const seg = cum[i] - cum[i - 1] || 1;
            const t = (target - cum[i - 1]) / seg;
            px = pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t;
            py = pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t;
            break;
        }
    }
    for (let k = 3; k >= 1; k--) {
        ctx.fillStyle = _rgba(color, 0.10 * k);
        ctx.beginPath();
        ctx.arc(px, py, r * (1 + k * 0.7), 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
}

/* ---- Precomputed unit geometry (size = 1, origin at plant center) ---- */
const _geoCache = {};
function _geo(type) {
    const key = type + "|" + FLORA.seed + "|" + FLORA.petal.toFixed(3);
    if (_geoCache[key]) return _geoCache[key];
    const g = _buildGeo(type, FLORA.seed);
    _geoCache[key] = g;
    return g;
}
function _swayPts(rnd, n, x0, y0, x1, y1, amp) {
    const pts = [];
    for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        const sway = (_Perlin.get(t * 2.2 + x0 * 5, y0 * 5) * 0.5 + (rnd() - 0.5) * 0.5) * amp;
        pts.push({ x: x0 + (x1 - x0) * t + sway, y: y0 + (y1 - y0) * t });
    }
    return pts;
}
function _buildGeo(type, seedSalt) {
    const rnd = _seedRand(_hashStr("flora:" + type + ":" + (seedSalt || 0)));
    const pick = (a, b) => a + rnd() * (b - a);
    const P = FLORA.petal; // длина лепестков запекается в геометрию
    if (type === "tree") {
        const trunk = _swayPts(rnd, 6, 0, 0.45, 0, -0.38, 0.05);
        const branches = [];
        const specs = [[0.3, -1], [0.45, 1], [0.58, -1], [0.7, 1], [0.8, -1], [0.88, 1], [0.95, 0]];
        for (let i = 0; i < specs.length; i++) {
            const [tt, side] = specs[i];
            const bi = Math.min(trunk.length - 2, Math.floor(tt * (trunk.length - 1)));
            const bx = trunk[bi].x, by = trunk[bi].y;
            const blen = pick(0.22, 0.4), rise = pick(0.16, 0.3);
            const tipx = bx + side * blen, tipy = by - rise;
            branches.push({
                pts: [
                    { x: bx, y: by },
                    { x: bx + side * blen * 0.5, y: by - rise * 0.45 },
                    { x: tipx, y: tipy },
                ],
                w: pick(0.035, 0.055),
                shard: { tx: tipx + side * pick(0.05, 0.12) * P, ty: tipy - pick(0.1, 0.18) * P, w: pick(0.075, 0.11) },
            });
        }
        const crown = [];
        for (let i = 0; i < 5; i++) {
            const a = -Math.PI / 2 + (i - 2) * 0.42;
            crown.push({
                bx: Math.cos(a) * 0.1, by: -0.42 + Math.sin(a) * 0.06,
                tx: Math.cos(a) * pick(0.28, 0.4) * P, ty: -0.42 + Math.sin(a) * pick(0.24, 0.34) * P,
                w: pick(0.08, 0.115),
            });
        }
        return { trunk, branches, crown, trunkW: 0.085 };
    }
    if (type === "vine") {
        const main = _swayPts(rnd, 9, 0, 0.45, -0.12, -0.78, 0.16);
        const tendrils = [];
        for (let i = 0; i < 4; i++) {
            const bi = 2 + i;
            const b = main[Math.min(bi, main.length - 1)];
            const side = i % 2 === 0 ? -1 : 1;
            const bl = pick(0.14, 0.24);
            const tip = { x: b.x + side * bl, y: b.y - bl * pick(0.5, 0.9) };
            tendrils.push({
                pts: [b, { x: b.x + side * bl * 0.55, y: b.y - bl * 0.3 }, tip],
                shard: { tx: tip.x + side * pick(0.03, 0.07), ty: tip.y - pick(0.07, 0.12), w: pick(0.06, 0.085) },
            });
        }
        return { main, tendrils, bud: { x: -0.12, y: -0.86, r: 0.05 } };
    }
    if (type === "flower") {
        const stem = _swayPts(rnd, 5, 0, 0.45, 0, -0.32, 0.04);
        const rings = [];
        for (let ring = 0; ring < 2; ring++) {
            const n = 7, petals = [];
            for (let i = 0; i < n; i++) {
                const a = (i / n) * Math.PI * 2 + ring * (Math.PI / n) - Math.PI / 2;
                const L = (ring === 0 ? pick(0.26, 0.32) : pick(0.17, 0.22)) * P;
                petals.push({
                    tx: Math.cos(a) * L, ty: Math.sin(a) * L,
                    w: ring === 0 ? pick(0.085, 0.105) : pick(0.06, 0.075),
                });
            }
            rings.push(petals);
        }
        return { stem, head: { x: 0, y: -0.48 }, rings, coreR: 0.075 };
    }
    if (type === "mushroom") {
        return {
            stipe: { x: 0, y0: 0.02, y1: 0.45, w: 0.075 },
            cap: { rx: 0.42, ry: 0.2, y: -0.02 },
            gills: [-0.28, -0.14, 0, 0.14, 0.28],
            leds: [{ dx: -0.18, dy: -0.1 }, { dx: 0, dy: -0.14 }, { dx: 0.18, dy: -0.1 }],
            spores: [
                { dx: -0.3, dy: -0.42, r: 0.028 }, { dx: -0.1, dy: -0.55, r: 0.022 },
                { dx: 0.12, dy: -0.48, r: 0.03 }, { dx: 0.3, dy: -0.38, r: 0.02 },
            ],
        };
    }
    // sprout
    return {
        stem: _swayPts(rnd, 3, 0, 0.4, 0, -0.28, 0.03),
        leaves: [
            { bx: -0.02, by: -0.02, tx: -0.24, ty: -0.16, w: 0.075 },
            { bx: 0.02, by: -0.1, tx: 0.22, ty: -0.26, w: 0.068 },
        ],
        rosette: [-2.4, -1.2, 0, 1.2, 2.4].map((a) => ({ a: a + pick(-0.15, 0.15), L: pick(0.1, 0.14) * P, w: pick(0.04, 0.055) })),
        bud: { x: 0, y: -0.34, r: 0.062 },
    };
}

class ProtocolGarden {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext("2d");
        this.protocols = [];
        this.allProtocols = [];
        this.particles = [];
        this.animationId = null;

        this.view = { x: 0, y: 0, s: 1 };
        this._viewTarget = null;
        this._drag = null;
        this._hover = null;

        this.onSelect = null;
        this.onHover = null;
        this.focusId = null;
        this.visibleIds = null;
        this.pathIds = null;
        this.hideLabels = false;
        this.compareIds = [];

        // кэш рёбер (пары объектов) — пересчитывается при смене состава,
        // а не каждый кадр
        this._edges = [];

        // логический размер (CSS-px) и плотность пикселей отдельно:
        // раскладка и хит-тест живут в CSS-px, бэкстор — в device-px
        this.w = 0;
        this.h = 0;
        this.dpr = 1;

        // тиры качества: high — всё, med — без тяжёлых теней,
        // low — плюс плоская аура и минимум частиц
        this.q = { shadow: 1, auraGrad: true, maxP: 34, dprCap: 2 };
        this._fps = { last: 0, ema: 60, n: 0, cool: 0 };
        this._resizeT = null;

        this._pointers = new Map();

        // спрайт-кэш тел растений: статика запекается в offscreen один раз,
        // в кадре — блит + живая аура/импульсы. В стабах тестов недоступен —
        // тогда работает прямой путь отрисовки.
        this._sprites = new Map();
        this._spriteOK = null;
        this._baking = false;

        const mm = (typeof window !== "undefined" && window.matchMedia)
            ? window.matchMedia.bind(window) : null;
        this.reducedMotion = mm ? mm("(prefers-reduced-motion: reduce)").matches : false;
        this.coarsePointer = mm ? mm("(pointer: coarse)").matches : false;

        this.setQuality(this._autoQuality(), true);
        this.resize();
        window.addEventListener("resize", () => {
            if (this._resizeT) clearTimeout(this._resizeT);
            this._resizeT = setTimeout(() => this.resize(), 150);
        });

        this.canvas.addEventListener("mousemove", (e) => this._onMouseMove(e));
        this.canvas.addEventListener("mousedown", (e) => this._onMouseDown(e));
        this.canvas.addEventListener("mouseup", (e) => this._onMouseUp(e));
        this.canvas.addEventListener("mouseleave", () => { this._drag = null; this.canvas.style.cursor = "crosshair"; });
        this.canvas.addEventListener("wheel", (e) => this._onWheel(e), { passive: false });
        this.canvas.addEventListener("dblclick", () => this.resetView());

        // Touch
        this.canvas.addEventListener("touchstart", (e) => this._onTouchStart(e), { passive: false });
        this.canvas.addEventListener("touchmove", (e) => this._onTouchMove(e), { passive: false });
        this.canvas.addEventListener("touchend", (e) => this._onTouchEnd(e));
        this.canvas.addEventListener("touchcancel", (e) => this._onTouchEnd(e));

        // keyboard
        document.addEventListener("keydown", (e) => this._onKeyDown(e));
    }

    // ---------- координаты ----------
    toWorld(mx, my) {
        return { x: (mx - this.view.x) / this.view.s, y: (my - this.view.y) / this.view.s };
    }

    resetView() {
        this.view = { x: 0, y: 0, s: 1 };
        this.focusId = null;
        if (this.onSelect) this.onSelect(null);
    }

    // ---------- качество ----------
    _autoQuality() {
        try {
            const nav = (typeof navigator !== "undefined") ? navigator : {};
            const smallScreen = (typeof window !== "undefined" &&
                Math.min(window.innerWidth || 1e9, window.innerHeight || 1e9)) < 500;
            if (this.coarsePointer && (smallScreen || (nav.hardwareConcurrency || 8) <= 4)) return "low";
            if (this.coarsePointer || (nav.deviceMemory || 8) <= 4) return "med";
        } catch (e) {}
        return "high";
    }
    setQuality(q, silent) {
        if (q !== "high" && q !== "med" && q !== "low") return this.qName || "high";
        this.qName = q;
        this.q = q === "high" ? { shadow: 1, auraGrad: true, maxP: 34, dprCap: 2 }
            : q === "med" ? { shadow: 0, auraGrad: true, maxP: 16, dprCap: 1.5 }
            : { shadow: 0, auraGrad: false, maxP: 0, dprCap: 1 };
        if (!silent) this.resize();
        return q;
    }
    _tuneFps(now) {
        const f = this._fps;
        if (f.last) {
            const dt = now - f.last;
            if (dt > 0 && dt < 1000) f.ema = f.ema * .95 + (1000 / dt) * .05;
        }
        f.last = now;
        if (++f.n < 180) return;
        f.n = 0;
        if (f.cool > 0) { f.cool--; return; }
        if (f.ema < 30) {
            if (this.qName === "high") { this.setQuality("med", true); f.cool = 1; }
            else if (this.qName === "med") { this.setQuality("low", true); f.cool = 1; }
        }
    }

    // вписать весь видимый сад в экран (стартовое кадрирование на узких экранах)
    fitView(pad) {
        const list = this.protocols.filter((p) => this._visible(p) && p.x != null);
        if (!list.length || !this.w || !this.h) return;
        pad = pad == null ? 70 : pad;
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        for (const p of list) {
            const r = (p.size || 24) + 26;
            if (p.x - r < x0) x0 = p.x - r;
            if (p.y - r < y0) y0 = p.y - r;
            if (p.x + r > x1) x1 = p.x + r;
            if (p.y + r > y1) y1 = p.y + r;
        }
        const s = Math.max(.2, Math.min(1.15,
            Math.min((this.w - pad) / Math.max(1, x1 - x0), (this.h - pad) / Math.max(1, y1 - y0))));
        this.view.s = s;
        this._viewTarget = null;
        this.view.x = (this.w - (x0 + x1) * s) / 2;
        this.view.y = (this.h - (y0 + y1) * s) / 2;
    }

    // пересобрать кэш рёбер из текущего состава
    _relink() {
        const byId = new Map(this.protocols.map((p) => [p.id, p]));
        const edges = [];
        for (const p of this.protocols) {
            if (!p.dependsOn) continue;
            for (const depId of p.dependsOn) {
                const dep = byId.get(depId);
                if (dep) edges.push({ a: p, b: dep });
            }
        }
        this._edges = edges;
    }

    centerOn(p) {
        if (!p) return;
        const w = this.w || this.canvas.width, h = this.h || this.canvas.height;
        this._viewTarget = { x: w / 2 - p.x * this.view.s, y: h / 2 - p.y * this.view.s };
        this.focusId = p.id;
    }

    resize() {
        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();
        this.w = rect.width || (typeof window !== "undefined" && window.innerWidth) || 800;
        this.h = rect.height || (typeof window !== "undefined" && window.innerHeight) || 600;
        const rawDpr = (typeof window !== "undefined" && window.devicePixelRatio) || 1;
        this.dpr = Math.min(rawDpr, this.q.dprCap);
        this.canvas.width = Math.max(1, Math.round(this.w * this.dpr));
        this.canvas.height = Math.max(1, Math.round(this.h * this.dpr));
        if (this.protocols.length) this.positionProtocols();
    }

    positionProtocols() {
        const W = this.w || this.canvas.width, H = this.h || this.canvas.height;
        // Слои сверху вниз (метафора стека), у каждого — своя полоса.
        // Внутри полосы растения раскладываются сеткой с гарантированным
        // шагом, чтобы подписи не налезали друг на друга.
        const order = ["application", "presentation", "session", "transport", "network", "link", "physical"];
        const groups = new Map(order.map((l) => [l, []]));
        const extra = [];
        this.protocols.forEach((p) => {
            if (groups.has(p.layer)) groups.get(p.layer).push(p);
            else extra.push(p);
        });
        const lists = order.map((l) => groups.get(l)).concat(extra.length ? [extra] : [])
            .filter((list) => list.length);
        const gapX = Math.min(132, Math.max(86, (W - 100) / 3)); // шаг по горизонтали: хватает на подпись
        const topPad = 90;         // место под тулбар/шапку
        const botPad = 64;         // место под подпись нижнего ряда
        const cols = Math.max(1, Math.floor((W - 100) / gapX));
        const cellW = (W - 100) / cols;
        let totalRows = 0;
        lists.forEach((list) => { totalRows += Math.ceil(list.length / cols); });
        // вертикальный шаг подстраивается под высоту экрана
        const rowGap = Math.min(112, Math.max(72, (H - topPad - botPad) / Math.max(1, totalRows)));
        let y = Math.max(topPad, (H - totalRows * rowGap) / 2) + rowGap / 2;
        lists.forEach((list) => {
            const rows = Math.ceil(list.length / cols);
            for (let r = 0; r < rows; r++) {
                const rowItems = list.slice(r * cols, (r + 1) * cols);
                // шахматный сдвиг нечётных рядов: диагональные соседи дальше
                const rowShift = (r % 2) ? cellW * .4 : 0;
                rowItems.forEach((p, c) => {
                    // детерминированный джиттер по id: ряды не выглядят линейкой,
                    // но раскладка стабильна между перезагрузками
                    let h = 0;
                    for (const ch of p.id) h = (h * 31 + ch.charCodeAt(0)) | 0;
                    const jx = Math.sin(h) * cellW * .09;
                    const jy = Math.cos(h * .7) * 6;
                    p.targetX = W / 2 + (c - (rowItems.length - 1) / 2) * cellW + rowShift + jx;
                    p.targetY = y + r * rowGap + jy;
                    p.layerY = p.layer;
                    // новые растения встают сразу, остальные плавно доезжают
                    // (анимация при фильтрации сохраняется)
                    if (p.x == null || p.y == null) { p.x = p.targetX; p.y = p.targetY; }
                });
            }
            y += rows * rowGap;
        });
    }

    loadProtocols(data) {
        const now = Date.now();
        this.protocols = data.protocols.map((p) => ({
            ...p,
            size: this.calculateSize(p),
            pulse: Math.random() * Math.PI * 2,
            born: now,
        }));
        this.allProtocols = this.protocols.slice();
        this.pathIds = null;
        this.positionProtocols();
        this._relink();
    }

    calculateSize(p) {
        const conn = (p.dependsOn?.length || 0) + (p.usedBy?.length || 0);
        return 24 + Math.min(conn * 7, 60);
    }

    setVisible(ids) {
        const prev = new Set(this.protocols.map((p) => p.id));
        this.visibleIds = ids ? new Set(ids) : null;
        if (ids) this.protocols = this.allProtocols.filter((p) => ids.has(p.id));
        else this.protocols = this.allProtocols.slice();
        const now = Date.now();
        this.protocols.forEach((p) => { if (!prev.has(p.id) || !p.born) p.born = now; });
        if (this.canvas) this.positionProtocols();
        this._relink();
    }

    _visible(p) { return !this.visibleIds || this.visibleIds.has(p.id); }

    start() {
        if (!this.canvas || this.animationId) return;
        this.updateStats();
        this.draw();
    }

    stop() {
        if (this.animationId) cancelAnimationFrame(this.animationId);
        this.animationId = null;
    }

    updateStats() {
        const pc = document.getElementById("protocolCount");
        const cc = document.getElementById("connectionCount");
        let conn = 0;
        this.allProtocols.forEach((p) => (conn += p.dependsOn?.length || 0));
        if (pc) pc.textContent = this.allProtocols.length;
        if (cc) cc.textContent = conn;
    }

    hitTest(world) {
        let best = null, bestD = Infinity;
        for (const p of this.protocols) {
            if (!this._visible(p)) continue;
            const d = Math.hypot(p.x - world.x, p.y - world.y);
            if (d < p.size * 1.15 && d < bestD) { bestD = d; best = p; }
        }
        return best;
    }

    // ---------- отрисовка ----------
    draw() {
        const ctx = this.ctx;
        if (!ctx || !this.canvas) return;
        const w = this.w || this.canvas.width, h = this.h || this.canvas.height;
        this._sh = this.q.shadow;
        this._lastS = this.view.s;

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.setTransform(this.dpr || 1, 0, 0, this.dpr || 1, 0, 0);

        try { this._tuneFps(Date.now()); } catch (e) {}

        if (this._viewTarget) {
            this.view.x += (this._viewTarget.x - this.view.x) * .12;
            this.view.y += (this._viewTarget.y - this.view.y) * .12;
            if (Math.abs(this._viewTarget.x - this.view.x) < .5 &&
                Math.abs(this._viewTarget.y - this.view.y) < .5)
                this._viewTarget = null;
        }

        const isDark = document.body.getAttribute("data-theme") === "dark";
        this._paintBackground(ctx, w, h, isDark);

        ctx.save();
        ctx.translate(this.view.x, this.view.y);
        ctx.scale(this.view.s, this.view.s);

        this.drawConnections(ctx);
        this.drawParticles(ctx);
        // видимая мировая рамка: всё за ней отсекаем (culling)
        const _m = 40, _s = this.view.s;
        const vb = this._vb = {
            x0: (-this.view.x - _m) / _s, y0: (-this.view.y - _m) / _s,
            x1: (w + _m - this.view.x) / _s, y1: (h + _m - this.view.y) / _s,
        };
        for (const p of this.protocols) {
            if (!this._visible(p)) continue;
            if (!this.reducedMotion) p.pulse += .02;
            const pr = (p.size || 24) * 1.35;
            if (p.x < vb.x0 - pr || p.x > vb.x1 + pr || p.y < vb.y0 - pr || p.y > vb.y1 + pr) continue;
            this.drawPlant(ctx, p);
        }
        ctx.restore();

        ctx.font = `${Math.min(13, 11 * this.view.s)}px Inter`;
        ctx.textAlign = "center";
        this.protocols.forEach((p, idx) => {
            if (this.hideLabels || !this._visible(p)) return;
            // чёт/нечет — врозь на few px: соседние подписи не сливаются
            const sx = p.x * this.view.s + this.view.x + (idx % 2 ? 9 : -9);
            const sy = p.y * this.view.s + this.view.y + p.size * this.view.s + 16;
            if (sx < -60 || sx > w + 60 || sy < -30 || sy > h + 30) return;
            const dim = this.focusId && p.id !== this.focusId;
            ctx.fillStyle = dim
                ? (isDark ? "rgba(140,150,160,.25)" : "rgba(90,100,110,.3)")
                : isDark ? "#c8d4de" : "#33414b";
            ctx.fillText(p.number != null ? `${p.name} · ${p.number}` : p.name, sx, sy);
        });

        this.animationId = requestAnimationFrame(() => this.draw());
    }

    // ---------- кинематографичный фон (градиент, туманности, звёзды, виньетка) ----------
    _paintBackground(ctx, w, h, isDark) {
        const t = this.reducedMotion ? 0 : Date.now() * 0.001;
        let g = ctx.createLinearGradient(0, 0, 0, h);
        if (isDark) {
            g.addColorStop(0, "#060b14");
            g.addColorStop(0.55, "#0a141d");
            g.addColorStop(1, "#04070c");
        } else {
            g.addColorStop(0, "#f2f6f4");
            g.addColorStop(0.6, "#e4edea");
            g.addColorStop(1, "#f7faf8");
        }
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        if (isDark) {
            // туманности: два мягких цветных пятна
            const R = Math.max(w, h);
            let n = ctx.createRadialGradient(w * 0.2, h * 0.28, 0, w * 0.2, h * 0.28, R * 0.45);
            n.addColorStop(0, "rgba(45,212,191,0.075)");
            n.addColorStop(1, "rgba(45,212,191,0)");
            ctx.fillStyle = n;
            ctx.fillRect(0, 0, w, h);
            n = ctx.createRadialGradient(w * 0.82, h * 0.66, 0, w * 0.82, h * 0.66, R * 0.4);
            n.addColorStop(0, "rgba(139,92,246,0.06)");
            n.addColorStop(1, "rgba(139,92,246,0)");
            ctx.fillStyle = n;
            ctx.fillRect(0, 0, w, h);
            // звёзды/споры: предрасчитанные позиции, мерцание синусом
            if (!this._stars) {
                const rnd = _seedRand(1337);
                this._stars = [];
                for (let i = 0; i < 90; i++) {
                    this._stars.push({ x: rnd(), y: rnd(), s: rnd() < 0.85 ? 1 : 2, ph: rnd() * 6.28, sp: 0.4 + rnd() * 1.2 });
                }
            }
            for (const st of this._stars) {
                const a = 0.14 + 0.22 * Math.abs(Math.sin(t * st.sp + st.ph));
                ctx.globalAlpha = a;
                ctx.fillStyle = "#cfe9ff";
                ctx.fillRect(st.x * w, st.y * h, st.s, st.s);
            }
            ctx.globalAlpha = 1;
        }
        // сетка — едва видимая, дышит вместе с зумом
        ctx.strokeStyle = isDark ? "rgba(148,163,184,.05)" : "rgba(20,50,40,.06)";
        ctx.lineWidth = 1;
        const gap = 54 / this.view.s > 18 ? 54 : 27;
        const ox = this.view.x % gap, oy = this.view.y % gap;
        ctx.beginPath();
        for (let x = ox; x < w; x += gap) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
        for (let y = oy; y < h; y += gap) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
        ctx.stroke();
        // виньетка: глубина по краям кадра
        const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
        v.addColorStop(0, "rgba(0,0,0,0)");
        v.addColorStop(1, isDark ? "rgba(0,0,0,0.42)" : "rgba(30,50,45,0.14)");
        ctx.fillStyle = v;
        ctx.fillRect(0, 0, w, h);
    }

    drawConnections(ctx) {
        const path = this.pathIds;
        const vb = this._vb, em = 120;
        for (const e of this._edges) {
            const protocol = e.a, dep = e.b;
            const onPath = path && path.has(protocol.id) && path.has(dep.id);
            if (path && !onPath) continue;
            if (this.focusId && !(protocol.id === this.focusId ||
                (protocol.dependsOn || []).includes(this.focusId))) continue;
            // ребро целиком за кадром — пропускаем
            if (vb && !onPath &&
                ((protocol.x < vb.x0 - em && dep.x < vb.x0 - em) ||
                 (protocol.x > vb.x1 + em && dep.x > vb.x1 + em) ||
                 (protocol.y < vb.y0 - em && dep.y < vb.y0 - em) ||
                 (protocol.y > vb.y1 + em && dep.y > vb.y1 + em))) continue;

            const dx = dep.x - protocol.x, dy = dep.y - protocol.y;
            const len = Math.hypot(dx, dy) || 1;
            // дуга вместо прямой; длинные связи сильно глушим, чтобы на зуме
            // не было «случайных» линий через весь экран
            const bend = Math.min(52, len * .1);
            const cx = (protocol.x + dep.x) / 2 - (dy / len) * bend;
            const cy = (protocol.y + dep.y) / 2 + (dx / len) * bend;
            const hot = this.focusId || onPath;
            const far = Math.max(0, Math.min(1, 1 - len / 1400));
            const aOuter = hot ? 0.30 : (0.10 * far + 0.02);
            const aCore = hot ? 0.85 : (0.42 * far + 0.08);
            const wOuter = onPath ? 6 : hot ? 5 : 3.5;
            const wCore = onPath ? 2 : hot ? 1.8 : 1.1;
            // проход 1: широкое мягкое свечение
            ctx.strokeStyle = _rgba(protocol.color, aOuter);
            ctx.lineWidth = wOuter;
            ctx.lineCap = "round";
            if (!hot) ctx.setLineDash([5, 6]);
            ctx.beginPath();
            ctx.moveTo(protocol.x, protocol.y);
            ctx.quadraticCurveTo(cx, cy, dep.x, dep.y);
            ctx.stroke();
            // проход 2: яркое ядро — градиент только для горячих рёбер,
            // обычным хватает сплошного цвета (на 1px перехода не видно)
            if (hot) {
                const gradient = ctx.createLinearGradient(protocol.x, protocol.y, dep.x, dep.y);
                gradient.addColorStop(0, _rgba(protocol.color, aCore));
                gradient.addColorStop(1, _rgba(dep.color, aCore));
                ctx.strokeStyle = gradient;
            } else {
                ctx.strokeStyle = _rgba(protocol.color, aCore);
            }
            ctx.lineWidth = wCore;
            ctx.beginPath();
            ctx.moveTo(protocol.x, protocol.y);
            ctx.quadraticCurveTo(cx, cy, dep.x, dep.y);
            ctx.stroke();
            if (!hot) ctx.setLineDash([]);
        }
    }

    drawParticles(ctx) {
        const maxP = this.coarsePointer ? Math.min(this.q.maxP, 18) : this.q.maxP;
        if (!this.reducedMotion && this._edges.length && this.particles.length < maxP && Math.random() < .32) {            const e = this._edges[(Math.random() * this._edges.length) | 0];
            if (e) this.particles.push({
                x: e.a.x, y: e.a.y,
                tx: e.b.x, ty: e.b.y,
                progress: 0, speed: .006 + Math.random() * .01,
                color: e.a.color,
                trail: [],
            });
        }
        this.particles = this.particles.filter((p) => {
            p.progress += p.speed;
            if (p.progress >= 1) return false;
            p.x += (p.tx - p.x) * p.speed * 10;
            p.y += (p.ty - p.y) * p.speed * 10;
            ctx.globalCompositeOperation = "lighter";
            // след из оптоволокна
            p.trail.push({ x: p.x, y: p.y });
            if (p.trail.length > 8) p.trail.shift();
            for (let i = 0; i < p.trail.length; i++) {
                const t = p.trail[i];
                ctx.fillStyle = _rgba(p.color, (i / p.trail.length) * 0.33);
                ctx.beginPath();
                ctx.arc(t.x, t.y, 1 + (i / p.trail.length) * 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
            // ядро — яркая точка
            ctx.fillStyle = "#ffffff";
            ctx.beginPath(); ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2); ctx.fill();
            // ореол
            ctx.fillStyle = _rgba(p.color, 0.16);
            ctx.beginPath(); ctx.arc(p.x, p.y, 5.5, 0, Math.PI * 2); ctx.fill();
            ctx.globalCompositeOperation = "source-over";
            return true;
        });
        if (this.particles.length > 110) this.particles = this.particles.slice(-60);
    }

    // ---------- спрайт-кэш: статичное тело растения запекается один раз ----------
    _spritesSupported() {
        if (this._spriteOK != null) return this._spriteOK;
        let ok = false;
        try {
            ok = !!(typeof document !== "undefined" && document.createElement &&
                document.createElement("canvas").getContext("2d").drawImage);
        } catch (e) { ok = false; }
        this._spriteOK = ok;
        return ok;
    }
    _floraSig(p) {
        return p.plant + "|" + p.color + "|" + Math.round(p.size) + "|" +
            FLORA.seed + "|" + FLORA.petal + "|" + FLORA.crown + "|" +
            FLORA.shard + "|" + FLORA.tube + "|" + FLORA.orb + "|" +
            FLORA.glow + "|" + FLORA.aura + "|" + (this.qName || "high");
    }
    _plantSprite(p) {
        if (!this._spritesSupported()) return null;
        const key = this._floraSig(p);
        let spr = this._sprites.get(key);
        if (!spr) {
            if (this._sprites.size > 160) this._sprites.clear();
            spr = this._buildSprite(p);
            if (spr) this._sprites.set(key, spr);
        }
        return spr;
    }
    _buildSprite(p) {
        const size = p.size, color = p.color;
        const reach = Math.max(1.15, 1.05 * FLORA.aura + 0.1);
        const half = size * reach, SS = 2;
        let cv = null;
        try {
            cv = document.createElement("canvas");
            cv.width = Math.max(2, Math.ceil(half * 2 * SS));
            cv.height = cv.width;
        } catch (e) { return null; }
        const sctx = cv.getContext("2d");
        if (!sctx) return null;
        const real = this.ctx;
        this.ctx = sctx;
        _BAKING = true;
        try {
            sctx.setTransform(SS, 0, 0, SS, half * SS, half * SS);
            this._paintGround(sctx, 0, 0, size, color, 1);
            this._paintAura(sctx, 0, 0, size, color, 0, 0, 1);
            this.drawRoots(sctx, 0, 0, size, color, 0);
            const fake = { pulse: 0 };
            switch (p.plant) {
                case "tree":     this.drawTree(0, 0, size, color, fake); break;
                case "vine":     this.drawVine(0, 0, size, color); break;
                case "flower":   this.drawFlower(0, 0, size, color, fake, false); break;
                case "mushroom": this.drawMushroom(0, 0, size, color); break;
                default:         this.drawSprout(0, 0, size, color);
            }
            // плоды статичны (usedBy не меняется) — запекаем и их
            this.drawFruits(sctx, { usedBy: p.usedBy, status: p.status, pulse: 0 }, size, color);
        } catch (e) {
            this.ctx = real;
            _BAKING = false;
            return null;
        }
        this.ctx = real;
        _BAKING = false;
        return { cv, half, px: half * 2 };
    }

    // ---------- земля и аура: живьём в прямом пути, запечены в спрайте ----------
    _paintGround(ctx, x, y, size, color, grow) {
        const gy = y + size * 0.52 * grow;
        if (this.q.auraGrad) {
            const gg = ctx.createRadialGradient(x, gy, 0, x, gy, size * 1.05);
            gg.addColorStop(0, _rgba(color, 0.20));
            gg.addColorStop(0.55, _rgba(color, 0.07));
            gg.addColorStop(1, _rgba(color, 0));
            ctx.fillStyle = gg;
            ctx.save();
            ctx.translate(x, gy);
            ctx.scale(1, 0.26);
            ctx.beginPath();
            ctx.arc(0, 0, size * 1.05, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        } else {
            ctx.fillStyle = _rgba(color, 0.10);
            ctx.beginPath();
            ctx.ellipse(x, gy, size * 0.9, size * 0.2, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    _paintAura(ctx, x, y, size, color, pulse, t, grow) {
        const glowSize = (size * 1.05 + Math.sin(pulse + t * .003) * size * .08) * grow * FLORA.aura;
        const ga = Math.min(1, FLORA.glow);
        if (this.q.auraGrad) {
            const glow = ctx.createRadialGradient(x, y, 0, x, y, Math.max(glowSize, .1));
            glow.addColorStop(0, _rgba(color, 0.16 * ga));
            glow.addColorStop(0.55, _rgba(color, 0.06 * ga));
            glow.addColorStop(0.8, "rgba(223,246,255," + (0.03 * ga).toFixed(3) + ")");
            glow.addColorStop(1, _rgba(color, 0));
            ctx.fillStyle = glow;
        } else {
            ctx.fillStyle = _rgba(color, 0.08 * ga);
        }
        ctx.beginPath();
        ctx.arc(x, y, Math.max(glowSize, .1), 0, Math.PI * 2);
        ctx.fill();
    }

    drawPlant(ctx, protocol) {
        const { x, y, size, color, plant } = protocol;
        const focused = !this.focusId || this.focusId === protocol.id;
        const t = this.reducedMotion ? 0 : Date.now();
        const grow = protocol.born ? Math.min(1, (Date.now() - protocol.born) / 450) : 1;
        if (grow <= 0) return;

        if (protocol.targetX != null) {
            protocol.x += (protocol.targetX - protocol.x) * .06;
            protocol.y += (protocol.targetY - protocol.y) * .06;
        }

        if (this.focusId === protocol.id ||
            (this.compareIds && this.compareIds.indexOf(protocol.id) !== -1)) {
            ctx.strokeStyle = color + "70";
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 5]);
            ctx.beginPath();
            ctx.arc(x, y, size + 14 + Math.sin(protocol.pulse * 2) * 3, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        } else if (!focused && this.focusId) {
            ctx.globalAlpha = .22;
        }

        // свечение почвы и аура: в спрайт-пути уже запечены, в прямом — живьём
        const spr = this._plantSprite(protocol);
        const sway = Math.sin(protocol.pulse * .5) * .022;
        const breathe = (Math.sin(protocol.pulse + t * .002) * .08 + 1) * grow;
        if (!spr) {
            // свечение почвы под растением: эллипс-ореол на «земле»
            this._paintGround(ctx, x, y, size, color, grow);
            // биолюминесцентная аура слоями: цветное ядро + жемчужная дымка
            this._paintAura(ctx, x, y, size, color, protocol.pulse, t, grow);
        }

        // 4.1 корни и тело: спрайт-блит, если доступен, иначе прямой путь.
        // Динамика (аура, сок, плоды, качание) всегда живьём поверх.
        if (spr) {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(sway);
            ctx.scale(breathe, breathe);
            ctx.drawImage(spr.cv, -spr.half, -spr.half, spr.px, spr.px);
            ctx.restore();
            // сок по жиле — живьём поверх спрайта; плоды запечены в спрайте
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(sway);
            ctx.scale(breathe, breathe);
            // LOD: сок виден только у крупных на экране (мельче 12px — пропускаем)
            if (size * (this._lastS || 1) > 12) this.drawSap(ctx, size, color, protocol.pulse);
            ctx.restore();
        } else {
            // прямой путь (стабы тестов, старые движки): корни + тело + сок + плоды
            this.drawRoots(ctx, x, y, size, color, protocol.pulse);
            ctx.save();
            ctx.translate(x, y);
            // 4.2 стебель качается: лёгкая синусоида (заморожена при reducedMotion,
            // т.к. pulse тогда не растёт)
            ctx.rotate(sway);
            ctx.scale(breathe, breathe);
            switch (plant) {
                case "tree":     this.drawTree(0, 0, size, color, protocol); break;
                case "vine":     this.drawVine(0, 0, size, color); break;
                case "flower":   this.drawFlower(0, 0, size, color, protocol, focused); break;
                case "mushroom": this.drawMushroom(0, 0, size, color); break;
                default:         this.drawSprout(0, 0, size, color);
            }
            // сок по жиле: частицы снизу вверх
            // LOD: сок виден только у крупных на экране (мельче 12px — пропускаем)
            if (size * (this._lastS || 1) > 12) this.drawSap(ctx, size, color, protocol.pulse);
            // 4.5 плоды: светящиеся сферы за тех, кто стоит на этом узле
            this.drawFruits(ctx, protocol, size, color);
            ctx.restore();
        }
        ctx.globalAlpha = 1;
    }

    // (свечение почвы и аура рисуются внутри drawPlant, выше спрайта)

    // ---------- корневая система: сужающиеся светящиеся кабели вглубь ----------
    drawRoots(ctx, x, y, size, color, pulse) {
        const baseY = y + size * 0.42;
        const rootCount = 5;
        for (let i = 0; i < rootCount; i++) {
            const spread = (i - (rootCount - 1) / 2) * size * 0.15;
            const depth = size * (0.34 + 0.05 * Math.sin(pulse * 0.8 + i * 1.9));
            const sway = Math.sin(pulse * 0.6 + i * 2.2) * size * 0.03;
            const pts = [
                { x: x + spread * 0.3, y: baseY },
                { x: x + spread * 0.75 + sway * 0.5, y: baseY + depth * 0.45 },
                { x: x + spread * 1.35 + sway, y: baseY + depth },
            ];
            _tube(ctx, pts, 1.6, 0.5, color, 0.55);
            const tip = pts[2];
            _glowDot(ctx, tip.x, tip.y, 1 + 0.5 * Math.sin(pulse * 1.5 + i), color, false);
        }
    }

    // ---------- сок: световые пакеты с хвостом вверх по стеблю ----------
    drawSap(ctx, size, color, pulse) {
        const line = [
            { x: 0, y: size * 0.4 },
            { x: Math.sin(pulse * 0.7) * size * 0.015, y: size * 0.05 },
            { x: Math.sin(pulse * 0.7 + 1) * size * 0.02, y: -size * 0.3 },
            { x: 0, y: -size * 0.48 },
        ];
        for (let k = 0; k < 3; k++) {
            _pulseRun(ctx, line, pulse * 0.18 + k * 0.33, color, 1.3);
        }
    }

    // ---------- 4.5 плоды ----------
    fruitCount(p) {
        const deps = (p.usedBy || []).length;
        if (!deps || p.status === "legacy") return 0;
        return Math.min(3, deps);
    }
    drawFruits(ctx, protocol, size, color) {
        const n = this.fruitCount(protocol);
        if (!n) return;
        for (let i = 0; i < n; i++) {
            const ang = -Math.PI / 2 + (i - (n - 1) / 2) * 0.62;
            const fx = Math.cos(ang) * size * 0.46;
            const fy = -size * 0.34 + Math.sin(ang) * size * 0.3;
            // нить-подвес от короны к плоду
            ctx.strokeStyle = _rgba(color, 0.4);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(fx * 0.55, fy + size * 0.12);
            ctx.quadraticCurveTo(fx * 0.8, fy + size * 0.06, fx, fy + size * 0.03);
            ctx.stroke();
            _orb(ctx, fx, fy, size * 0.045, color, protocol.pulse, i * 2.4);
        }
    }

    // ---- Techno-Flora v5: объёмные силуэты на предрасчитанной геометрии ----

    // Tree → мощный ствол-труба, 7 ветвей, корона из 12 гранёных кристаллов
    drawTree(x, y, size, color, protocol) {
        const ctx = this.ctx;
        const pulse = protocol ? protocol.pulse : 0;
        const G = _geo("tree");
        const S = (px, py) => ({ x: x + px * size, y: y + py * size });
        // ствол
        _tube(ctx, G.trunk.map((p) => S(p.x, p.y)), size * G.trunkW, size * 0.028, color, 1);
        _pulseRun(ctx, G.trunk.map((p) => S(p.x, p.y)), pulse * 0.22, color, Math.max(1.2, size * 0.02));
        // ветви + кристалл на конце каждой
        for (let i = 0; i < G.branches.length; i++) {
            const b = G.branches[i];
            const pts = b.pts.map((p) => S(p.x, p.y));
            _tube(ctx, pts, size * b.w, size * 0.012, color, 0.9);
            const tip = pts[pts.length - 1];
            _shard(ctx, tip.x, tip.y, x + b.shard.tx * size, y + b.shard.ty * size,
                size * b.shard.w, color, pulse, i * 1.7, 1);
        }
        // корона: веер крупных кристаллов вокруг макушки
        const crownN = Math.max(2, Math.round(G.crown.length * FLORA.crown));
        for (let i = 0; i < crownN; i++) {
            const c = G.crown[i];
            _shard(ctx, x + c.bx * size, y + c.by * size, x + c.tx * size, y + c.ty * size,
                size * c.w, color, pulse, 20 + i * 2.3, 1);
        }
        // макушка-узел
        _glowDot(ctx, x, y - size * 0.42, Math.max(1.2, size * 0.022), color, true);
    }

    // Vine → S-изгиб толстого кабеля, 4 усика с бутонами, светящаяся почка
    drawVine(x, y, size, color) {
        const ctx = this.ctx;
        const pulse = this.reducedMotion ? 0 : Date.now() * 0.001;
        const G = _geo("vine");
        const S = (px, py) => ({ x: x + px * size, y: y + py * size });
        const main = G.main.map((p) => S(p.x, p.y));
        _tube(ctx, main, size * 0.055, size * 0.02, color, 1);
        _pulseRun(ctx, main, pulse * 0.3, color, Math.max(1.2, size * 0.018));
        _pulseRun(ctx, main, pulse * 0.3 + 0.5, color, Math.max(1, size * 0.013));
        for (let i = 0; i < G.tendrils.length; i++) {
            const td = G.tendrils[i];
            const pts = td.pts.map((p) => S(p.x, p.y));
            _tube(ctx, pts, size * 0.022, size * 0.008, color, 0.8);
            const tip = pts[pts.length - 1];
            _shard(ctx, tip.x, tip.y, x + td.shard.tx * size, y + td.shard.ty * size,
                size * td.shard.w, color, pulse, 40 + i * 1.9, 1);
        }
        _orb(ctx, x + G.bud.x * size, y + G.bud.y * size, size * G.bud.r, color, pulse, 7);
    }

    // Flower → стебель-труба, два кольца гранёных лепестков, ядро с крестом блика
    drawFlower(x, y, size, color, protocol, focused) {
        const ctx = this.ctx;
        const pulse = protocol ? protocol.pulse : 0;
        const G = _geo("flower");
        const S = (px, py) => ({ x: x + px * size, y: y + py * size });
        _tube(ctx, G.stem.map((p) => S(p.x, p.y)), size * 0.045, size * 0.016, color, 1);
        _pulseRun(ctx, G.stem.map((p) => S(p.x, p.y)), pulse * 0.25, color, Math.max(1.1, size * 0.016));
        const hx = x + G.head.x * size, hy = y + G.head.y * size;
        const bloom = focused ? 1.18 : 1;
        const rot = pulse * 0.1;
        const ca = Math.cos(rot), sa = Math.sin(rot);
        // дальнее кольцо темнее, ближнее ярче → глубина
        for (let ring = 1; ring >= 0; ring--) {
            const petals = G.rings[ring];
            for (let i = 0; i < petals.length; i++) {
                const pt = petals[i];
                const rx = pt.tx * bloom, ry = pt.ty * bloom;
                _shard(ctx, hx, hy,
                    hx + (rx * ca - ry * sa) * size, hy + (rx * sa + ry * ca) * size,
                    size * pt.w, color, pulse, 60 + ring * 9 + i * 1.3, ring === 0 ? 1 : 0.8);
            }
        }
        // ядро: стекло + крест-блик
        _orb(ctx, hx, hy, size * G.coreR, color, pulse, 3);
        if (this._sh) {
            ctx.strokeStyle = "rgba(255,255,255,0.55)";
            ctx.lineWidth = 1;
            const fl = size * G.coreR * 3.2;
            ctx.beginPath();
            ctx.moveTo(hx - fl, hy); ctx.lineTo(hx + fl, hy);
            ctx.moveTo(hx, hy - fl); ctx.lineTo(hx, hy + fl);
            ctx.stroke();
        }
    }

    // Mushroom → ножка-стойка с шинами, купол-чип с дорожками, LED, споры
    drawMushroom(x, y, size, color) {
        const ctx = this.ctx;
        const pulse = this.reducedMotion ? 0 : Date.now() * 0.001;
        const G = _geo("mushroom");
        // ножка: тёмное тело + светлые шины
        ctx.fillStyle = _mix(color, _ABYSS, 0.62);
        ctx.fillRect(x - size * G.stipe.w, y + size * G.stipe.y0, size * G.stipe.w * 2, size * (G.stipe.y1 - G.stipe.y0));
        ctx.strokeStyle = _rgba(color, 0.55);
        ctx.lineWidth = 1;
        for (let i = 1; i <= 3; i++) {
            const ly = y + size * (G.stipe.y0 + (G.stipe.y1 - G.stipe.y0) * i / 4);
            ctx.beginPath();
            ctx.moveTo(x - size * G.stipe.w, ly);
            ctx.lineTo(x + size * G.stipe.w, ly);
            ctx.stroke();
        }
        ctx.strokeStyle = "rgba(223,246,255,0.5)";
        ctx.beginPath();
        ctx.moveTo(x, y + size * G.stipe.y0);
        ctx.lineTo(x, y + size * G.stipe.y1);
        ctx.stroke();
        // купол: градиент от белого блика к цвету
        const cy = y + size * G.cap.y, rx = size * G.cap.rx, ry = size * G.cap.ry;
        let g = ctx.createLinearGradient(x - rx, cy - ry, x + rx, cy);
        g.addColorStop(0, _mix(color, _ABYSS, 0.25));
        g.addColorStop(0.45, _mix(color, "#ffffff", 0.35));
        g.addColorStop(1, _mix(color, _ABYSS, 0.45));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(x, cy, rx, ry, 0, Math.PI, 0);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = _rgba(color, 0.6);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(x, cy, rx, ry, 0, Math.PI, 0);
        ctx.stroke();
        // дорожки на куполе
        ctx.strokeStyle = _rgba(color, 0.5);
        for (const gx of G.gills) {
            ctx.beginPath();
            ctx.moveTo(x + gx * size, cy);
            ctx.lineTo(x + gx * size * 0.92, cy - ry * 0.85);
            ctx.stroke();
        }
        // LED-индикаторы
        for (let i = 0; i < G.leds.length; i++) {
            const L = G.leds[i];
            _glowDot(ctx, x + L.dx * size, y + (G.cap.y + L.dy) * size,
                Math.max(0.8, size * 0.014), color, true);
        }
        // парящие споры над куполом
        for (let i = 0; i < G.spores.length; i++) {
            const sp = G.spores[i];
            const bob = Math.sin(pulse * 1.2 + i * 2.1) * size * 0.02;
            _glowDot(ctx, x + sp.dx * size, y + sp.dy * size + bob, size * sp.r, color, false);
        }
    }

    // Sprout → PCB-основание, стебель, два листа-кристалла, розетка + почка
    drawSprout(x, y, size, color) {
        const ctx = this.ctx;
        const pulse = this.reducedMotion ? 0 : Date.now() * 0.001;
        const G = _geo("sprout");
        const S = (px, py) => ({ x: x + px * size, y: y + py * size });
        // основание-плата: тёмная линза + световой ободок
        ctx.fillStyle = _mix(color, _ABYSS, 0.6);
        ctx.beginPath();
        ctx.ellipse(x, y + size * 0.4, size * 0.2, size * 0.075, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = _rgba(color, 0.65);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(x, y + size * 0.4, size * 0.2, size * 0.075, 0, 0, Math.PI * 2);
        ctx.stroke();
        // стебель
        const stem = G.stem.map((p) => S(p.x, p.y));
        _tube(ctx, stem, size * 0.04, size * 0.014, color, 1);
        // листья-кристаллы
        for (let i = 0; i < G.leaves.length; i++) {
            const Lf = G.leaves[i];
            _shard(ctx, x + Lf.bx * size, y + Lf.by * size, x + Lf.tx * size, y + Lf.ty * size,
                size * Lf.w, color, pulse, 80 + i * 2.7, 1);
        }
        // розетка мини-лепестков вокруг почки
        const bxp = x + G.bud.x * size, byp = y + G.bud.y * size;
        for (let i = 0; i < G.rosette.length; i++) {
            const r = G.rosette[i];
            _shard(ctx, bxp, byp,
                bxp + Math.cos(r.a) * r.L * size, byp + Math.sin(r.a) * r.L * size,
                size * r.w, color, pulse, 90 + i * 1.5, 0.9);
        }
        _orb(ctx, bxp, byp, size * G.bud.r, color, pulse, 11);
    }

    adjustColor(hex, percent) {
        const num = parseInt(hex.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, Math.max(0, (num >> 16) + amt));
        const G = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amt));
        const B = Math.min(255, Math.max(0, (num & 0xff) + amt));
        return `rgb(${R},${G},${B})`;
    }

    // ---------- events ----------
    _mousePos(e) {
        const r = this.canvas.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    _onMouseMove(e) {
        const { x, y } = this._mousePos(e);
        if (this._drag) {
            this.view.x += x - this._drag.mx;
            this.view.y += y - this._drag.my;
            this._drag.mx = x; this._drag.my = y;
            this.canvas.style.cursor = "grabbing";
            return;
        }
        const hit = this.hitTest(this.toWorld(x, y));
        if ((hit ? "plant" : "empty") !== this._cursorZone) {
            this._cursorZone = hit ? "plant" : "empty";
            this.canvas.style.cursor = hit ? "pointer" : (this._drag !== null ? "grabbing" : "default");
        }
        if ((hit && hit.id) || this._hover) {
            if ((hit && hit.id) !== (this._hover && this._hover.id)) {
                this._hover = hit;
                if (this.onHover) this.onHover(hit);
            }
        }
        this._mouse = { x, y };
    }

    _onMouseDown(e) {
        const { x, y } = this._mousePos(e);
        const hit = this.hitTest(this.toWorld(x, y));
        if (!hit) this._drag = { mx: x, my: y };
    }

    _onMouseUp(e) {
        const wasDrag = this._drag;
        this._drag = null;
        this.canvas.style.cursor = "crosshair";
        if (!wasDrag && this.onSelect) {
            const { x, y } = this._mousePos(e);
            this.onSelect(this.hitTest(this.toWorld(x, y)));
        }
    }

    _onWheel(e) {
        e.preventDefault();
        const { x, y } = this._mousePos(e);
        const k = e.deltaY < 0 ? 1.13 : 0.885;
        const ns = Math.max(0.45, Math.min(3.2, this.view.s * k));
        const real = ns / this.view.s;
        this.view.x = x - (x - this.view.x) * real;
        this.view.y = y - (y - this.view.y) * real;
        this.view.s = ns;
    }

    // touch support
    _touchPos(touch) {
        const r = this.canvas.getBoundingClientRect();
        return { x: touch.clientX - r.left, y: touch.clientY - r.top };
    }

    _onTouchStart(e) {
        e.preventDefault();
        for (const touch of e.changedTouches) {
            this._pointers.set(touch.identifier, {
                ...this._touchPos(touch),
                t0: Date.now(),
                moved: false,
            });
        }
        if (this._pointers.size === 1) {
            const t = this._pointers.values().next().value;
            this._drag = { mx: t.x, my: t.y, single: true };
            this.canvas.style.cursor = "grabbing";
        }
    }

    _onTouchMove(e) {
        e.preventDefault();
        for (const touch of e.changedTouches) {
            const prev = this._pointers.get(touch.identifier);
            if (!prev) continue;
            const pos = this._touchPos(touch);
            const dx = pos.x - prev.x;
            const dy = pos.y - prev.y;
            if (Math.hypot(dx, dy) > 5) prev.moved = true;
            this._pointers.set(touch.identifier, { ...prev, x: pos.x, y: pos.y });
            if (this._drag) {
                this.view.x += dx;
                this.view.y += dy;
            }
        }

        if (this._pointers.size === 2) {
            this._drag = null;
            this.canvas.style.cursor = "default";
            const pts = [...this._pointers.values()];
            const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
            const cx = (pts[0].x + pts[1].x) / 2;
            const cy = (pts[0].y + pts[1].y) / 2;
            if (this._pinchDist) {
                const k = dist / this._pinchDist;
                const ns = Math.max(0.45, Math.min(3.2, this.view.s * k));
                const real = ns / this.view.s;
                this.view.x = cx - (cx - this.view.x) * real;
                this.view.y = cy - (cy - this.view.y) * real;
                this.view.s = ns;
            }
            this._pinchDist = dist;
        }
    }

    _onTouchEnd(e) {
        for (const touch of e.changedTouches) {
            const pointer = this._pointers.get(touch.identifier);
            const wasTap = pointer && !pointer.moved && (Date.now() - pointer.t0) < 300;
            const pos = pointer || { x: 0, y: 0 };
            this._pointers.delete(touch.identifier);

            if (wasTap && this._pointers.size === 0 && this.onSelect) {
                this.onSelect(this.hitTest(this.toWorld(pos.x, pos.y)));
            }
        }
        if (this._pointers.size === 0) {
            this._drag = null;
            this._pinchDist = null;
            this.canvas.style.cursor = "crosshair";
        } else if (this._pointers.size === 1) {
            const val = this._pointers.values().next().value;
            this._drag = { mx: val.x, my: val.y, single: true };
            this._pinchDist = null;
        }
    }

    _onKeyDown(e) {
        if (e.key === "ArrowRight" || e.key === "ArrowLeft" ||
            e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            const visible = this.protocols.filter((p) => this._visible(p));
            if (!visible.length) return;
            let idx = visible.findIndex((p) => p.id === this.focusId);
            if (idx === -1) idx = 0;
            else idx = (idx + (e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1) + visible.length) % visible.length;
            const next = visible[idx];
            this.focusId = next.id;
            this.centerOn(next);
            if (this.onSelect) this.onSelect(next);
        }
        if (e.key === "Escape") this.resetView();
    }
}