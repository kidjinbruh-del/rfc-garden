/* Runtime tests for index (main.js) and timeline inline script, stubbed DOM. */
const fs = require("fs");
const vm = require("vm");
const dir = require("path").resolve(__dirname, "..");
const load = (f) => fs.readFileSync(dir + "/" + f, "utf8");
const rootHref = "file://" + "/" + dir.replace(/\\/g, "/");
let failures = 0;
const ok = (c, n) => { console.log((c ? "PASS " : "FAIL ") + n); if (!c) failures++; };

function makeCtx(canvasEl) {
  const store = {};
  return new Proxy(store, {
    get(t, k) {
      if (k === "canvas") return canvasEl;
      if (k in t) return t[k];
      const fn = (...a) => (String(k).startsWith("create") ? { addColorStop() {} } : undefined);
      t[k] = fn; return fn;
    },
    set(t, k, v) { t[k] = v; return true; },
  });
}
function buildSandbox(extra) {
  const rafQ = [];
  const els = {};
  const mk = (id) => ({
    id, value: "", textContent: "", _html: "", href: "", style: { setProperty() {} },
    _cls: new Set(), _h: {},
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    addEventListener(t, f) { (this._h[t] = this._h[t] || []).push(f); },
    appendChild(c) { (this._kids = this._kids || []).push(c); return c; },
    setAttribute() {}, getAttribute: () => null, querySelector: () => ({ textContent: "" }),
  });
  ["gardenCanvas", "protocolCount", "connectionCount", "themeToggle", "timeline"].forEach((id) => { els[id] = mk(id); });
  els.gardenCanvas.width = 300; els.gardenCanvas.height = 150;
  els.gardenCanvas.getContext = () => makeCtx(els.gardenCanvas);
  els.gardenCanvas.getBoundingClientRect = () => ({ width: 1600, height: 800, left: 0, top: 0 });
  els.gardenCanvas.style = {};
  const layerCards = ["application", "presentation", "session", "transport", "network", "link", "physical"].map((l) => ({
    href: rootHref + "/explore.html?layer=" + l, // DOM resolves href to absolute URL
    querySelector: () => ({ textContent: "" }),
  }));
  const sb = {
    console, Math, JSON, Object, Array, Set, Map, Promise, URL, URLSearchParams,
    setTimeout: (fn) => 1, clearTimeout() {},
    requestAnimationFrame: (cb) => { rafQ.push(cb); return rafQ.length; },
    cancelAnimationFrame() {}, addEventListener() {},
    performance: { now: () => 0 },
    localStorage: { _m: {}, getItem(k) { return this._m[k] || null; }, setItem(k, v) { this._m[k] = v; } },
    matchMedia: () => ({ matches: false }),
    location: { hash: "", search: "", pathname: "/", origin: "null", href: rootHref + "/index.html" },
    history: { replaceState() {} }, navigator: {},
    document: {
      getElementById: (id) => els[id] || null,
      createElement: () => mk("new"),
      querySelectorAll: (sel) => (sel === ".layer-card" ? layerCards : []),
      querySelector: () => null, addEventListener() {}, activeElement: null,
      documentElement: { lang: "ru" },
      body: { getAttribute: () => "dark", setAttribute() {}, removeAttribute() {}, appendChild() {}, style: {} },
    },
    __els: els, __rafQ: rafQ, __layerCards: layerCards,
  };
  sb.window = sb; sb.globalThis = sb;
  Object.assign(sb, extra || {});
  return vm.createContext(sb);
}

// ---- main.js ----
{
  const sb = buildSandbox();
  try {
    vm.runInContext(load("js/i18n.js"), sb, { filename: "i18n.js" });
    vm.runInContext(load("js/data.js"), sb, { filename: "data.js" });
    vm.runInContext(load("js/garden.js"), sb, { filename: "garden.js" });
    vm.runInContext(load("js/theme.js"), sb, { filename: "theme.js" });
    vm.runInContext(load("js/intro.js"), sb, { filename: "intro.js" });
    vm.runInContext(load("js/main.js"), sb, { filename: "main.js" });
    const N = vm.runInContext("protocolsData.protocols.length", sb);
    ok(!!sb.rfcGarden && sb.rfcGarden.protocols.length === N, "main: hero garden loads " + N + " objects");
    ok(!!sb.rfcGarden.animationId, "main: hero draw loop running");
    ok(sb.__rafQ.length > 0, "main: rAF scheduled");
  } catch (e) { console.log("FAIL main.js threw: " + (e && e.stack || e)); failures++; }
}

// ---- timeline inline script ----
{
  const sb = buildSandbox();
  try {
    vm.runInContext(load("js/i18n.js"), sb, { filename: "i18n.js" });
    vm.runInContext(load("js/data.js"), sb, { filename: "data.js" });
    const html = load("timeline.html");
    const m = html.match(/<script>([\s\S]*?)<\/script>/);
    if (!m) { ok(false, "timeline: inline script found"); }
    else {
      vm.runInContext(m[1], sb, { filename: "timeline-inline.js" });
      const kids = sb.__els.timeline._kids || [];
      const N = vm.runInContext("protocolsData.protocols.length", sb);
      ok(kids.length === N, "timeline: renders " + N + " items (got " + kids.length + ")");
      const years = kids.map((k) => parseInt((k.innerHTML || "").match(/tl-year">(\d{4})/)[1], 10));
      const sorted = years.every((y, i) => i === 0 || years[i - 1] <= y);
      ok(sorted, "timeline: sorted by year");
      // click first item -> navigates to explore deep-link
      kids[0]._h.click[0].call({ getAttribute: () => "rfc0791" });
      ok(sb.location.href === "explore.html#rfc0791", "timeline: click navigates to explore deep-link (got " + sb.location.href + ")");
    }
  } catch (e) { console.log("FAIL timeline threw: " + (e && e.stack || e)); failures++; }
}
console.log(failures === 0 ? "MAIN+TIMELINE TESTS: ALL OK" : "MAIN+TIMELINE TESTS: " + failures + " FAILURES");
process.exit(failures === 0 ? 0 : 1);
