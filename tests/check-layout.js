/* check-layout: растения не налезают друг на друга.
   Загружает настоящий garden.js + data.js в стабе, считает попарные
   дистанции центров и зазоры между телами растений. */
const fs = require("fs");
const vm = require("vm");
const path = require("path");
const dir = path.resolve(__dirname, "..");
const load = (f) => fs.readFileSync(path.join(dir, f), "utf8");

let failures = 0;
const ok = (c, n) => { console.log((c ? "PASS " : "FAIL ") + n); if (!c) failures++; };

function makeContext(W, H) {
  const canvas = {
    width: 0, height: 0, style: {},
    addEventListener() {},
    getContext: () => null,
    getBoundingClientRect: () => ({ width: W, height: H, left: 0, top: 0 }),
  };
  const sb = {
    console, Math, JSON, Object, Array, Set, Map, Date,
    setTimeout: () => 0, clearTimeout() {},
    requestAnimationFrame: () => 0, cancelAnimationFrame() {},
    addEventListener() {}, matchMedia: () => ({ matches: false }),
    window: { matchMedia: () => ({ matches: false }), innerWidth: W, innerHeight: H, addEventListener() {} },
    document: {
      getElementById: (id) => (id === "gardenCanvas" ? canvas : null),
      addEventListener() {}, body: { getAttribute: () => "dark" },
    },
    localStorage: { _m: {}, getItem(k) { return this._m[k] || null; }, setItem(k, v) { this._m[k] = v; } },
  };
  sb.window = sb; sb.globalThis = sb;
  vm.createContext(sb);
  vm.runInContext(load("js/data.js") + "\n;globalThis.__PD = protocolsData;", sb, { filename: "data.js" });
  vm.runInContext(load("js/garden.js") + "\n;globalThis.__PG = ProtocolGarden;", sb, { filename: "garden.js" });
  return { sb, canvas };
}

function layout(W, H) {
  const { sb } = makeContext(W, H);
  const g = new sb.__PG("gardenCanvas");
  g.loadProtocols(sb.__PD);
  return g.protocols.map((p) => ({
    id: p.id, name: p.name, x: p.x, y: p.y,
    r: 12 + Math.min(((p.dependsOn || []).length + (p.usedBy || []).length) * 3.5, 30),
  }));
}

function stats(ps) {
  let min = 1e9, pair = null, overlap = 0;
  for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
    const d = Math.hypot(ps[i].x - ps[j].x, ps[i].y - ps[j].y);
    if (d < min) { min = d; pair = ps[i].name + "/" + ps[j].name; }
    if (d - (ps[i].r + ps[j].r) < 0) overlap++;
  }
  return { min, pair, overlap };
}

try {
  const desktop = layout(1536, 900);
  const N = desktop.length;
  ok(N > 70, "layout: entities count >= 72 (got " + N + ")");
  const st = stats(desktop);
  console.log("  1536x900: minDist=" + st.min.toFixed(1) + " (" + st.pair + "), bodyOverlap=" + st.overlap);
  ok(st.overlap === 0, "layout 1536x900: no overlapping plant bodies");
  ok(st.min >= 60, "layout 1536x900: min center distance >= 60 (got " + st.min.toFixed(1) + ")");

  const laptop = layout(1366, 768);
  const st2 = stats(laptop);
  console.log("  1366x768: minDist=" + st2.min.toFixed(1) + " (" + st2.pair + "), bodyOverlap=" + st2.overlap);
  ok(st2.overlap === 0, "layout 1366x768: no overlapping plant bodies");
  ok(st2.min >= 60, "layout 1366x768: min center distance >= 60 (got " + st2.min.toFixed(1) + ")");

  // hero-зона главной (правая часть экрана ~950px): тоже без наложений тел
  const hero = layout(950, 800);
  const st3 = stats(hero);
  console.log("  hero 950x800: minDist=" + st3.min.toFixed(1) + " (" + st3.pair + "), bodyOverlap=" + st3.overlap);
  ok(st3.overlap === 0, "layout hero 950x800: no overlapping plant bodies");

  // детерминизм: повторная раскладка даёт те же координаты
  const again = layout(1536, 900);
  const same = desktop.every((p, i) => again[i].x === p.x && again[i].y === p.y);
  ok(same, "layout: deterministic across reloads");

  // вьюпорт: почти всё внутри экрана
  const inside = desktop.filter((p) => p.x > 0 && p.x < 1536 && p.y > 0 && p.y < 900).length;
  ok(inside === N, "layout 1536x900: all plants inside viewport (got " + inside + ")");

  // fitView: не падает и возвращает валидный масштаб (0.2..1.15) на узком экране
  const { sb } = makeContext(420, 700);
  const g = new sb.__PG("gardenCanvas");
  g.loadProtocols(sb.__PD);
  g.setQuality("low", true);
  g.fitView();
  ok(g.view.s > 0 && g.view.s <= 1.15, "layout: fitView scale in range (got " + g.view.s.toFixed(3) + ")");
  ok(Number.isFinite(g.view.x) && Number.isFinite(g.view.y), "layout: fitView produces finite view.x/y");
} catch (e) {
  console.log("FAIL check-layout threw: " + (e && e.stack || e));
  failures++;
}

console.log(failures === 0 ? "CHECK-LAYOUT: ALL OK" : "CHECK-LAYOUT: " + failures + " FAILURES");
process.exit(failures === 0 ? 0 : 1);
