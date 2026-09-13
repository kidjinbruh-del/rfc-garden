/* Runtime tests for js/intro.js: full 15s timeline in stubbed DOM/canvas.
   Pumps fake rAF timestamps, checks phase callbacks, skip, quality tiers. */
const fs = require("fs");
const vm = require("vm");
const dir = require("path").resolve(__dirname, "..");
const load = (f) => fs.readFileSync(dir + "/" + f, "utf8");
let failures = 0;
const ok = (c, n) => { console.log((c ? "PASS " : "FAIL ") + n); if (!c) failures++; };

function makeCtx() {
  const store = {};
  return new Proxy(store, {
    get(t, k) {
      if (k in t) return t[k];
      const fn = (...a) => (String(k).startsWith("create") ? { addColorStop() {} } : undefined);
      t[k] = fn; return fn;
    },
    set(t, k, v) { t[k] = v; return true; },
  });
}
function buildSandbox() {
  let rafId = 0;
  const queue = [];
  const canvas = {
    width: 0, height: 0,
    getContext: () => makeCtx(),
    getBoundingClientRect: () => ({ width: 1600, height: 800, left: 0, top: 0 }),
    addEventListener() {},
  };
  const sb = {
    console, Math, JSON, Object, Array, Set, Map,
    setTimeout: () => 1, clearTimeout() {},
    requestAnimationFrame: (cb) => { rafId++; queue.push({ id: rafId, cb }); return rafId; },
    cancelAnimationFrame(id) {
      const i = queue.findIndex((q) => q.id === id);
      if (i >= 0) queue.splice(i, 1);
    },
    matchMedia: () => ({ matches: false }),
    navigator: { hardwareConcurrency: 8 },
    devicePixelRatio: 1,
    innerWidth: 1600, innerHeight: 800,
    location: { search: "" },
    document: {
      getElementById: (id) => (id === "introCanvas" ? canvas : null),
      addEventListener() {},
    },
    __queue: queue, __canvas: canvas,
  };
  sb.window = sb; sb.globalThis = sb;
  Object.defineProperty(sb, "devicePixelRatio", { value: 1, configurable: true });
  return vm.createContext(sb);
}
function pump(sb, fromMs, toMs, stepMs) {
  for (let t = fromMs; t <= toMs; t += stepMs) {
    const batch = sb.__queue.splice(0, sb.__queue.length);
    if (!batch.length) break;
    batch.forEach((q) => q.cb(t));
  }
}

// ---- API surface ----
{
  const sb = buildSandbox();
  try {
    vm.runInContext(load("js/intro.js"), sb, { filename: "intro.js" });
    const api = vm.runInContext("RFCIntro", sb);
    ok(api && typeof api.play === "function", "intro: RFCIntro.play exposed");
    ok(Array.isArray(api.TIERS) && api.TIERS.join(",") === "high,med,low", "intro: quality tiers high/med/low");
    ok(api.PHASE && api.PHASE.done === 15 && api.PHASE.reveal === 13, "intro: timeline reveal@13s done@15s");
  } catch (e) { console.log("FAIL intro load threw: " + (e && e.stack || e)); failures++; }
}

// ---- full 15s playback ----
{
  const sb = buildSandbox();
  try {
    vm.runInContext(load("js/intro.js"), sb, { filename: "intro.js" });
    const st = vm.runInContext(`
      ({ revealed: 0, done: 0,
         p: RFCIntro.play("introCanvas", {
           quality: "high",
           onReveal: () => { globalThis.__revealed = (globalThis.__revealed || 0) + 1; },
           onDone: () => { globalThis.__done = (globalThis.__done || 0) + 1; },
         }) })
    `, sb);
    pump(sb, 0, 16000, 16); // шаг как у браузерного rAF (~60fps): dt-клэмп 50мс не срабатывает
    const revealed = vm.runInContext("globalThis.__revealed || 0", sb);
    const done = vm.runInContext("globalThis.__done || 0", sb);
    ok(revealed === 1, "intro: onReveal fired exactly once (got " + revealed + ")");
    ok(done === 1, "intro: onDone fired exactly once (got " + done + ")");
    ok(sb.__queue.length === 0, "intro: no rAF left scheduled after done");
    const w = sb.__canvas.width, h = sb.__canvas.height;
    ok(w > 1000 && h > 400, "intro: canvas backstore sized (got " + w + "x" + h + ")");
  } catch (e) { console.log("FAIL intro playback threw: " + (e && e.stack || e)); failures++; }
}

// ---- skip() fast path ----
{
  const sb = buildSandbox();
  try {
    vm.runInContext(load("js/intro.js"), sb, { filename: "intro.js" });
    vm.runInContext(`
      globalThis.__r2 = 0; globalThis.__d2 = 0;
      globalThis.__p2 = RFCIntro.play("introCanvas", {
        onReveal: () => { globalThis.__r2++; },
        onDone: () => { globalThis.__d2++; },
      });
      globalThis.__p2.skip();
    `, sb);
    pump(sb, 0, 20000, 100);
    ok(vm.runInContext("globalThis.__r2", sb) === 1, "intro: skip() reveals once");
    ok(vm.runInContext("globalThis.__d2", sb) === 1, "intro: skip() dones once, no double-finish");
  } catch (e) { console.log("FAIL intro skip threw: " + (e && e.stack || e)); failures++; }
}

// ---- missing canvas + quality ----
{
  const sb = buildSandbox();
  try {
    vm.runInContext(load("js/intro.js"), sb, { filename: "intro.js" });
    vm.runInContext(`
      globalThis.__d3 = 0; globalThis.__r3 = 0;
      RFCIntro.play("nopeCanvas", {
        onReveal: () => { globalThis.__r3++; },
        onDone: () => { globalThis.__d3++; },
      });
    `, sb);
    ok(vm.runInContext("globalThis.__d3", sb) === 1, "intro: missing canvas still calls onDone");
    const q = vm.runInContext(`
      globalThis.__r3 === 1 &&
      (() => {
        const sb2p = RFCIntro.play("introCanvas", {});
        const low = sb2p.setQuality("low");
        const bad = sb2p.setQuality("nope");
        sb2p.stop();
        return low === "low" && bad === "low";
      })()
    `, sb);
    ok(q === true, "intro: setQuality low ok, invalid tier keeps current");
  } catch (e) { console.log("FAIL intro edge threw: " + (e && e.stack || e)); failures++; }
}

console.log(failures === 0 ? "INTRO TESTS: ALL OK" : "INTRO TESTS: " + failures + " FAILURES");
process.exit(failures === 0 ? 0 : 1);
