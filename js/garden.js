/* ============================================================
   ProtocolGarden v3 — движок сада
   Панорамирование (drag/touch), зум (wheel/pinch),
   hover-tooltip, выбор растения кликом, фильтры, подсветка связей.
   ============================================================ */
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

        this._pointers = new Map();

        const mm = (typeof window !== "undefined" && window.matchMedia)
            ? window.matchMedia.bind(window) : null;
        this.reducedMotion = mm ? mm("(prefers-reduced-motion: reduce)").matches : false;
        this.coarsePointer = mm ? mm("(pointer: coarse)").matches : false;

        this.resize();
        window.addEventListener("resize", () => this.resize());

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

    centerOn(p) {
        if (!p) return;
        const w = this.canvas.width, h = this.canvas.height;
        this._viewTarget = { x: w / 2 - p.x * this.view.s, y: h / 2 - p.y * this.view.s };
        this.focusId = p.id;
    }

    resize() {
        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width || window.innerWidth;
        this.canvas.height = rect.height || window.innerHeight;
        if (this.protocols.length) this.positionProtocols();
    }

    positionProtocols() {
        const W = this.canvas.width, H = this.canvas.height;
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
        const w = this.canvas.width, h = this.canvas.height;

        ctx.clearRect(0, 0, w, h);

        if (this._viewTarget) {
            this.view.x += (this._viewTarget.x - this.view.x) * .12;
            this.view.y += (this._viewTarget.y - this.view.y) * .12;
            if (Math.abs(this._viewTarget.x - this.view.x) < .5 &&
                Math.abs(this._viewTarget.y - this.view.y) < .5)
                this._viewTarget = null;
        }

        const isDark = document.body.getAttribute("data-theme") === "dark";
        ctx.fillStyle = isDark ? "#0a0f12" : "#eef2ef";
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = isDark ? "rgba(148,163,184,.05)" : "rgba(20,50,40,.06)";
        ctx.lineWidth = 1;
        const gap = 54 / this.view.s > 18 ? 54 : 27;
        const ox = this.view.x % gap, oy = this.view.y % gap;
        ctx.beginPath();
        for (let x = ox; x < w; x += gap) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
        for (let y = oy; y < h; y += gap) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
        ctx.stroke();

        ctx.save();
        ctx.translate(this.view.x, this.view.y);
        ctx.scale(this.view.s, this.view.s);

        this.drawConnections(ctx);
        this.drawParticles(ctx);
        for (const p of this.protocols) {
            if (!this._visible(p)) continue;
            if (!this.reducedMotion) p.pulse += .02;
            this.drawPlant(ctx, p);
        }
        ctx.restore();

        this.protocols.forEach((p, idx) => {
            if (this.hideLabels || !this._visible(p)) return;
            // чёт/нечет — врозь на few px: соседние подписи не сливаются
            const sx = p.x * this.view.s + this.view.x + (idx % 2 ? 9 : -9);
            const sy = p.y * this.view.s + this.view.y + p.size * this.view.s + 16;
            if (sx < -60 || sx > w + 60 || sy < -30 || sy > h + 30) return;
            const dim = this.focusId && p.id !== this.focusId;
            ctx.font = `${Math.min(13, 11 * this.view.s)}px Inter`;
            ctx.textAlign = "center";
            ctx.fillStyle = dim
                ? (isDark ? "rgba(140,150,160,.25)" : "rgba(90,100,110,.3)")
                : isDark ? "#c8d4de" : "#33414b";
            ctx.fillText(`${p.name} · ${p.number}`, sx, sy);
        });

        this.animationId = requestAnimationFrame(() => this.draw());
    }

    drawConnections(ctx) {
        const path = this.pathIds;
        for (const protocol of this.protocols) {
            if (!protocol.dependsOn || !this._visible(protocol)) continue;
            const focused = this.focusId && (protocol.id === this.focusId || protocol.dependsOn.includes(this.focusId));
            if (this.focusId && !focused) continue;

            for (const depId of protocol.dependsOn) {
                const dep = this.protocols.find((p) => p.id === depId);
                if (!dep || !this._visible(dep)) continue;
                const onPath = path && path.has(protocol.id) && path.has(depId);
                if (path && !onPath) continue;

                const dx = dep.x - protocol.x, dy = dep.y - protocol.y;
                const len = Math.hypot(dx, dy) || 1;
                // дуга вместо прямой: пересечения читаются легче, веер от хабов
                // не превращается в кашу; длинные связи дополнительно приглушены
                const bend = Math.min(52, len * .1);
                const cx = (protocol.x + dep.x) / 2 - (dy / len) * bend;
                const cy = (protocol.y + dep.y) / 2 + (dx / len) * bend;
                const baseAlpha = (this.focusId || onPath) ? "cc" : (len > 420 ? "2e" : "38");
                const gradient = ctx.createLinearGradient(protocol.x, protocol.y, dep.x, dep.y);
                gradient.addColorStop(0, protocol.color + baseAlpha);
                gradient.addColorStop(1, dep.color + baseAlpha);
                // внешний свечение кабеля
                ctx.strokeStyle = gradient;
                ctx.lineWidth = onPath ? 5 : this.focusId ? 4 : 2;
                ctx.shadowBlur = onPath ? 12 : this.focusId ? 10 : 4;
                ctx.shadowColor = protocol.color;
                if (!this.focusId && !onPath) ctx.setLineDash([5, 6]);
                ctx.beginPath();
                ctx.moveTo(protocol.x, protocol.y);
                ctx.quadraticCurveTo(cx, cy, dep.x, dep.y);
                ctx.stroke();
                ctx.shadowBlur = 0;
                if (!this.focusId && !onPath) ctx.setLineDash([]);
            }
        }
    }

    drawParticles(ctx) {
        const maxP = (this.protocols.length > 40 || this.coarsePointer) ? 18 : 34;
        if (!this.reducedMotion && this.particles.length < maxP && Math.random() < .32) {
            const pool = this.protocols.filter((p) => this._visible(p));
            const protocol = pool[Math.floor(Math.random() * pool.length)];
            if (protocol?.dependsOn?.length) {
                const depId = protocol.dependsOn[Math.floor(Math.random() * protocol.dependsOn.length)];
                const dep = this.protocols.find((p) => p.id === depId);
                if (dep) this.particles.push({
                    x: protocol.x, y: protocol.y,
                    tx: dep.x, ty: dep.y,
                    progress: 0, speed: .006 + Math.random() * .01,
                    color: protocol.color,
                    trail: [],
                });
            }
        }
        this.particles = this.particles.filter((p) => {
            p.progress += p.speed;
            if (p.progress >= 1) return false;
            p.x += (p.tx - p.x) * p.speed * 10;
            p.y += (p.ty - p.y) * p.speed * 10;
            // след из оптоволокна
            p.trail.push({ x: p.x, y: p.y });
            if (p.trail.length > 8) p.trail.shift();
            for (let i = 0; i < p.trail.length; i++) {
                const t = p.trail[i];
                const alpha = Math.floor((i / p.trail.length) * 0x55).toString(16).padStart(2, "0");
                ctx.fillStyle = p.color + alpha;
                ctx.beginPath();
                ctx.arc(t.x, t.y, 1 + (i / p.trail.length) * 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
            // ядро — яркая точка
            ctx.shadowBlur = 8;
            ctx.shadowColor = p.color;
            ctx.fillStyle = p.color + "cc";
            ctx.beginPath(); ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2); ctx.fill();
            // ореол
            ctx.fillStyle = p.color + "22";
            ctx.beginPath(); ctx.arc(p.x, p.y, 5.5, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
            return true;
        });
        if (this.particles.length > 110) this.particles = this.particles.slice(-60);
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

        // 4.1 корни: светящиеся нити в темноту (тускнеют вместе с растением —
        // наследуют globalAlpha выше)
        this.drawRoots(ctx, x, y, size, color, protocol.pulse);

        // биолюминесцентная аура
        const glowSize = (size * .6 + Math.sin(protocol.pulse + t * .003) * size * .08) * grow;
        const glow = ctx.createRadialGradient(x, y, 0, x, y, Math.max(glowSize, .1));
        glow.addColorStop(0, color + "18");
        glow.addColorStop(1, color + "00");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, Math.max(glowSize, .1), 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.translate(x, y);
        // 4.2 стебель качается: лёгкая синусоида (заморожена при reducedMotion,
        // т.к. pulse тогда не растёт)
        ctx.rotate(Math.sin(protocol.pulse * .5) * .022);
        const pulse = (Math.sin(protocol.pulse + t * .002) * .08 + 1) * grow;
        ctx.scale(pulse, pulse);
        switch (plant) {
            case "tree":     this.drawTree(0, 0, size, color, protocol); break;
            case "vine":     this.drawVine(0, 0, size, color); break;
            case "flower":   this.drawFlower(0, 0, size, color, protocol, focused); break;
            case "mushroom": this.drawMushroom(0, 0, size, color); break;
            default:         this.drawSprout(0, 0, size, color);
        }
        // сок по жиле: частицы снизу вверх
        this.drawSap(ctx, size, color, protocol.pulse);
        // 4.5 плоды: светящиеся сферы за тех, кто стоит на этом узле
        this.drawFruits(ctx, protocol, size, color);
        ctx.restore();
        ctx.globalAlpha = 1;
    }

    // ---------- 4.1 корневая система ----------
    drawRoots(ctx, x, y, size, color, pulse) {
        const baseY = y + size * .42;
        ctx.strokeStyle = color + "59";
        ctx.lineWidth = 1.5;
        ctx.lineCap = "round";
        for (let i = 0; i < 4; i++) {
            const spread = (i - 1.5) * size * .16;
            const len = size * (.5 + .08 * Math.sin(pulse + i * 1.9));
            const ex = x + spread * 1.6 + Math.sin(pulse * .7 + i * 2) * size * .03;
            const ey = baseY + len;
            ctx.beginPath();
            ctx.moveTo(x + spread * .3, baseY);
            ctx.quadraticCurveTo(x + spread * .6, baseY + len * .6, ex, ey);
            ctx.stroke();
            // пульс бежит от корня к стеблю
            ctx.fillStyle = color + "99";
            ctx.beginPath();
            ctx.arc(ex, ey, 1.2 + .8 * Math.sin(pulse * 1.5 + i), 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // ---------- сок: частицы вверх по стеблю ----------
    drawSap(ctx, size, color, pulse) {
        ctx.fillStyle = color + "aa";
        for (let k = 0; k < 2; k++) {
            const prog = (((pulse * .25 + k * .5) % 1) + 1) % 1;
            const yy = size * .38 - prog * size * .75;
            const xx = Math.sin(pulse + k * 3) * size * .03;
            ctx.beginPath();
            ctx.arc(xx, yy, 1.6, 0, Math.PI * 2);
            ctx.fill();
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
            const ang = -Math.PI / 2 + (i - (n - 1) / 2) * .7;
            const fx = Math.cos(ang) * size * .42;
            const fy = -size * .3 + Math.sin(ang) * size * .3;
            const r = size * .038 * (.75 + .25 * Math.sin(protocol.pulse * 2.2 + i * 2.1));
            ctx.shadowBlur = size * .25;
            ctx.shadowColor = color;
            ctx.fillStyle = color + "33";
            ctx.beginPath(); ctx.arc(fx, fy, r * 2.2, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#fff";
            ctx.beginPath(); ctx.arc(fx, fy, Math.max(r, .8), 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
        }
    }

    // ---- виды растений (техногенные) ----

    // Tree → кибернетическое дерево: ствол-микросхема, ветви-платы, узлы-диоды
    drawTree(x, y, size, color, protocol) {
        const ctx = this.ctx;
        const pulse = protocol ? protocol.pulse : 0;
        // ствол — как печатная плата
        ctx.strokeStyle = this.adjustColor(color, -40);
        ctx.lineWidth = size / 8;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(x, y + size * .5);
        ctx.lineTo(x, y - size * .15);
        ctx.stroke();
        // ветви-платы
        const branches = [
            [-.35, -.35, -.15, -.55],
            [.35, -.35, .15, -.55],
            [-.25, -.55, -.4, -.75],
            [.25, -.55, .4, -.75],
        ];
        for (const [ax, ay, bx, by] of branches) {
            ctx.strokeStyle = color + "99";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x + ax * size, y + ay * size);
            ctx.lineTo(x + bx * size, y + by * size);
            ctx.stroke();
        }
        // узлы-диоды (свечение)
        ctx.shadowBlur = size * .25;
        ctx.shadowColor = color;
        const nodes = [[0, -.55], [-.15, -.35], [.15, -.35], [-.4, -.75], [.4, -.75], [0, -.15]];
        for (const [nx, ny] of nodes) {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(x + nx * size, y + ny * size, size * .04, 0, Math.PI * 2);
            ctx.fill();
        }
        // 4.3 листья-кристаллы: дышат не в такт (у каждого своя фаза)
        const tips = [[-.4, -.75], [.4, -.75], [-.15, -.35], [.15, -.35]];
        for (let i = 0; i < tips.length; i++) {
            const [tx, ty] = tips[i];
            const s = size * (.085 + .02 * Math.sin(pulse * 1.4 + i * 1.7));
            ctx.fillStyle = color + "b0";
            ctx.beginPath();
            ctx.moveTo(x + tx * size, y + ty * size - s);
            ctx.lineTo(x + tx * size + s, y + ty * size);
            ctx.lineTo(x + tx * size, y + ty * size + s);
            ctx.lineTo(x + tx * size - s, y + ty * size);
            ctx.closePath();
            ctx.fill();
        }
        ctx.shadowBlur = 0;
    }

    // Vine → оптоволоконная лиана: светящийся кабель с импульсами
    drawVine(x, y, size, color) {
        const ctx = this.ctx;
        // основной кабель
        ctx.strokeStyle = color + "55";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(x, y + size * .5);
        ctx.quadraticCurveTo(x + size * .4, y, x - size * .3, y - size * .5);
        ctx.stroke();
        // внутреннее свечение кабеля
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = size * .2;
        ctx.shadowColor = color;
        ctx.beginPath();
        ctx.moveTo(x, y + size * .5);
        ctx.quadraticCurveTo(x + size * .4, y, x - size * .3, y - size * .5);
        ctx.stroke();
        ctx.shadowBlur = 0;
        // ответвления-волокна
        for (let i = 0; i < 3; i++) {
            const t = .2 + i * .3;
            const fx = x + (1 - t) * (1 - t) * 0 + 2 * (1 - t) * t * size * .4 + t * t * (-size * .3);
            const fy = y + (1 - t) * (1 - t) * size * .5 + 2 * (1 - t) * t * y + t * t * (-size * .5);
            ctx.strokeStyle = color + "77";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(fx, fy);
            ctx.lineTo(fx + (i - 1) * size * .25, fy - size * .15);
            ctx.stroke();
            // концевой диод
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(fx + (i - 1) * size * .25, fy - size * .15, size * .025, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Flower → антенна/кристалл: шестиугольные лепестки-кристаллы
    // 4.4: кольцо лепестков медленно вращается, в фокусе цветок раскрывается
    drawFlower(x, y, size, color, protocol, focused) {
        const ctx = this.ctx;
        const pulse = protocol ? protocol.pulse : 0;
        const rot = pulse * .12;
        const bloom = focused ? 1.22 : 1;
        const ca = Math.cos(rot), sa = Math.sin(rot);
        // стебель-провод
        ctx.strokeStyle = this.adjustColor(color, -30);
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(x, y + size * .5);
        ctx.lineTo(x, y - size * .2);
        ctx.stroke();
        // кристаллические лепестки (шестиугольники)
        ctx.shadowBlur = size * .2;
        ctx.shadowColor = color;
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
            const rx = Math.cos(a) * size * .28 * bloom;
            const ry = Math.sin(a) * size * .28 * bloom;
            const cx = x + rx * ca - ry * sa;
            const cy = y - size * .25 + rx * sa + ry * ca;
            ctx.fillStyle = i % 2 ? color : color + "cc";
            ctx.beginPath();
            for (let j = 0; j < 6; j++) {
                const ha = (j / 6) * Math.PI * 2 - Math.PI / 2;
                const hx = cx + Math.cos(ha) * size * .12;
                const hy = cy + Math.sin(ha) * size * .12;
                j === 0 ? ctx.moveTo(hx, hy) : ctx.lineTo(hx, hy);
            }
            ctx.closePath();
            ctx.fill();
        }
        // центральный нод — ядро пульсирует
        ctx.fillStyle = "#fff";
        ctx.shadowBlur = size * .3;
        ctx.beginPath();
        ctx.arc(x, y - size * .25, size * .06 * (1 + .15 * Math.sin(pulse * 2)), 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    // Mushroom → сетевой хаб/сервер: купол-микросхема, ножка-стоечный сервер
    drawMushroom(x, y, size, color) {
        const ctx = this.ctx;
        // ножка — как серверная стойка
        ctx.fillStyle = this.adjustColor(color, -50);
        ctx.fillRect(x - size * .08, y, size * .16, size * .45);
        // горизонтальные шины
        ctx.strokeStyle = color + "66";
        ctx.lineWidth = 1;
        for (let i = 1; i < 4; i++) {
            ctx.beginPath();
            ctx.moveTo(x - size * .08, y + i * size * .1);
            ctx.lineTo(x + size * .08, y + i * size * .1);
            ctx.stroke();
        }
        // купол — как pcb-платформа
        ctx.shadowBlur = size * .25;
        ctx.shadowColor = color;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(x, y, size * .4, size * .22, 0, Math.PI, 0);
        ctx.fill();
        ctx.shadowBlur = 0;
        // дорожки на куполе
        ctx.strokeStyle = color + "55";
        ctx.lineWidth = 1;
        for (let i = -2; i <= 2; i++) {
            ctx.beginPath();
            ctx.moveTo(x + i * size * .12, y);
            ctx.lineTo(x + i * size * .12, y - size * .18);
            ctx.stroke();
        }
        // индикаторы на куполе
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(x - size * .2, y - size * .08, size * .02, 0, Math.PI * 2);
        ctx.arc(x, y - size * .12, size * .02, 0, Math.PI * 2);
        ctx.arc(x + size * .2, y - size * .08, size * .02, 0, Math.PI * 2);
        ctx.fill();
    }

    // Sprout → LED-индикатор / PCB-росток: плата с компонентами
    drawSprout(x, y, size, color) {
        const ctx = this.ctx;
        // основание — плата
        ctx.fillStyle = this.adjustColor(color, -60);
        ctx.beginPath();
        ctx.arc(x, y + size * .35, size * .2, 0, Math.PI);
        ctx.fill();
        // стебель-провод
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.shadowBlur = size * .15;
        ctx.shadowColor = color;
        ctx.beginPath();
        ctx.moveTo(x, y + size * .35);
        ctx.quadraticCurveTo(x - size * .15, y, x, y - size * .4);
        ctx.stroke();
        ctx.shadowBlur = 0;
        // кристаллические листья-печати
        ctx.fillStyle = color + "cc";
        ctx.beginPath();
        ctx.moveTo(x - size * .12, y - size * .15);
        ctx.lineTo(x - size * .25, y - size * .3);
        ctx.lineTo(x - size * .1, y - size * .35);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x + size * .1, y - size * .25);
        ctx.lineTo(x + size * .22, y - size * .42);
        ctx.lineTo(x + size * .08, y - size * .45);
        ctx.closePath();
        ctx.fill();
        // светодиод на вершине
        ctx.shadowBlur = size * .25;
        ctx.shadowColor = color;
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(x, y - size * .4, size * .035, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
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