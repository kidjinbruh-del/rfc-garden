/* perf-smoke: render loop sustains ≥30 FPS over 180 frames (frame ≤33ms). */
const fs = require("fs");
const vm = require("vm");
const path = require("path");
const dir = path.resolve(__dirname, "..");
const load = (f) => fs.readFileSync(path.join(dir, f), "utf8");

let failures = 0;
const ok = (c, n) => { console.log((c ? "PASS " : "FAIL ") + n); if (!c) failures++; };

function makeContext() {
  const noop = () => {};
  const mkGrad = () => ({ addColorStop: noop, _stops: [] });
  return {
    setTransform: noop, clearRect: noop, fillRect: noop,
    beginPath: noop, closePath: noop, moveTo: noop, lineTo: noop, stroke: noop,
    quadraticCurveTo: noop, save: noop, restore: noop,
    translate: noop, scale: noop, rotate: noop,
    fillText: noop, arc: noop, fill: noop, ellipse: noop,
    setLineDash: noop,
    createLinearGradient: mkGrad,
    createRadialGradient: mkGrad,
    // properties — assigned but no-op
    fillStyle: "", strokeStyle: "", lineWidth: 0, font: "",
    textAlign: "", lineCap: "", shadowBlur: 0, shadowColor: "", globalAlpha: 1,
  };
}

const W = 1536, H = 900;
const canvas = {
  width: W, height: H, style: {},
  addEventListener() {},
  getContext: () => makeContext(),
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

const g = new sb.__PG("gardenCanvas");
g.loadProtocols(sb.__PD);
g.setQuality("high", true);

const FRAMES = 180;
const t0 = Date.now();
for (let i = 0; i < FRAMES; i++) g.draw();
const elapsed = Date.now() - t0;
const fps = FRAMES / (elapsed / 1000);
const frameMs = elapsed / FRAMES;

ok(fps >= 30, "perf: FPS >= 30 over " + FRAMES + " frames (got " + fps.toFixed(1) + ")");
ok(frameMs <= 33, "perf: avg frame time <= 33ms (got " + frameMs.toFixed(1) + "ms)");

process.exit(failures ? 1 : 0);
