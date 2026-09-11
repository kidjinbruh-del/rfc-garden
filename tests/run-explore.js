/* Runtime test: runs the REAL explore.js with stubbed DOM + canvas, simulates UI. */
const fs = require("fs");
const vm = require("vm");
const dir = require("path").resolve(__dirname, "..");
const load = (f) => fs.readFileSync(dir + "/" + f, "utf8");
const rootHref = "file://" + "/" + dir.replace(/\\/g, "/");

// ---------- stubs ----------
function makeEl(id, dataset) {
  const el = {
    id: id || "", dataset: dataset || {}, value: "", textContent: "",
    _innerHTML: "", href: "", title: "", download: "", tabIndex: 0,
    style: {}, _cls: new Set(), _handlers: {}, _clicked: false, _children: [],
    classList: null, // set below
    addEventListener(t, fn) { (el._handlers[t] = el._handlers[t] || []).push(fn); },
    click() { el._clicked = true; (el._handlers.click || []).forEach((fn) => fn({ preventDefault() {} })); },
    fire(t, ev) {
      if (t === "click" && typeof el.onclick === "function") el.onclick(ev || { preventDefault() {} });
      (el._handlers[t] || []).forEach((fn) => fn(ev || { preventDefault() {} }));
    },
    focus() { el._focused = true; },
    appendChild(c) { (el._children = el._children || []).push(c); return c; },
    setAttribute(k, v) { el["_attr_" + k] = v; },
    getAttribute(k) { return el["_attr_" + k]; },
    querySelector() { return makeEl("stub-child"); },
  };
  Object.defineProperty(el, "innerHTML", {
    get() { return el._innerHTML; },
    set(v) { el._innerHTML = v; if (v === "") el._children = []; },
  });
  Object.defineProperty(el, "children", { get() { return el._children; } });
  el.classList = {
    add: (c) => el._cls.add(c),
    remove: (c) => el._cls.delete(c),
    toggle: (c, f) => {
      if (f === undefined) { el._cls.has(c) ? el._cls.delete(c) : el._cls.add(c); }
      else { f ? el._cls.add(c) : el._cls.delete(c); }
    },
    contains: (c) => el._cls.has(c),
  };
  return el;
}

const rafQ = [];
const els = {};
["gardenCanvas", "searchBox", "pcNum", "pcTitle", "pcFullname", "pcBadges",
  "pcDesc", "pcWhere", "pcFact", "pcRelations", "pcLink", "pcLinkText", "protoCard", "pcClose",
 "shownCounter", "resetView", "exportPng", "shareLink", "themeToggle", "protocolCount",
 "connectionCount", "catSelect", "tourBtn", "examBtn", "favBtn", "recentBtn",
 "soundBtn", "exportSetBtn", "importSetBtn", "fileImport", "pcFav", "pcCompare",
 "pcPath", "pcReveal", "cmpClose", "cmpCols", "compareCard", "minimap",
 "tourCaption", "recentPanel", "toast"].forEach((id) => { els[id] = makeEl(id); });
els.protoCard._cls.add("hidden");
els.compareCard._cls.add("hidden");
els.recentPanel._cls.add("hidden");
els.tourCaption._cls.add("hidden");
els.toast._cls.add("hidden");
els.pcReveal._cls.add("hidden");
els.minimap.getContext = () => ({ clearRect() {}, fillRect() {}, strokeRect() {}, fillStyle: "", strokeStyle: "", lineWidth: 1 });
els.minimap.getBoundingClientRect = () => ({ width: 180, height: 120, left: 0, top: 0 });

const statusChips = ["all", "active", "changed", "legacy"].map((s) => {
  const c = makeEl("chip-" + s, { status: s }); if (s === "all") c._cls.add("active"); return c;
});
const layerChips = ["all", "application", "presentation", "session", "transport", "network", "link", "physical"].map((s) => {
  const c = makeEl("chip-l-" + s, { layer: s }); if (s === "all") c._cls.add("active"); return c;
});

// canvas 2d context stub
function makeCtx(canvasEl) {
  const store = {};
  return new Proxy(store, {
    get(t, k) {
      if (k === "canvas") return canvasEl;
      if (k in t) return t[k];
      const fn = (...a) => {
        if (String(k).startsWith("create")) return { addColorStop() {} };
        return undefined;
      };
      t[k] = fn;
      return fn;
    },
    set(t, k, v) { t[k] = v; return true; },
  });
}
const canvasEl = els.gardenCanvas;
canvasEl.width = 300; canvasEl.height = 150;
canvasEl.getContext = () => makeCtx(canvasEl);
canvasEl.getBoundingClientRect = () => ({ width: 1600, height: 900, left: 0, top: 0 });
canvasEl.toDataURL = () => "data:image/png;base64,STUB";

const docHandlers = {};
const sandbox = {
  console, Math, JSON, Object, Array, Set, Map, Promise,
  setTimeout: (fn) => { sandbox.__timeouts.push(fn); return sandbox.__timeouts.length; },
  clearTimeout() {},
  setInterval: () => 1, clearInterval() {}, URLSearchParams,
  requestAnimationFrame: (cb) => { rafQ.push(cb); return rafQ.length; },
  cancelAnimationFrame() {},
  addEventListener() {},
  performance: { now: () => 0 },
  localStorage: { _m: {}, getItem(k) { return this._m[k] || null; }, setItem(k, v) { this._m[k] = v; } },
  matchMedia: () => ({ matches: false }),
  location: { hash: "", search: "", pathname: rootHref.replace("file:", "") + "/explore.html", origin: "null", href: rootHref + "/explore.html" },
  history: { replaceState() {} },
  navigator: { clipboard: { writeText(t) { sandbox.__clipboard = t; return Promise.resolve(); } } },
  __timeouts: [],
  document: {
    getElementById: (id) => els[id] || null,
    createElement: (tag) => { const e = makeEl("new-" + tag); e.remove = () => {}; return e; },
    createTextNode: (t) => ({ text: t }),
    querySelectorAll: (sel) => {
      if (sel === "[data-status]") return statusChips;
      if (sel === "[data-layer]") return layerChips;
      return [];
    },
    querySelector: () => null,
    addEventListener: (t, fn) => { (docHandlers[t] = docHandlers[t] || []).push(fn); },
    activeElement: null,
    documentElement: { lang: "ru" },
    body: {
      getAttribute: () => "dark",
      setAttribute() {}, removeAttribute() {}, appendChild() {}, style: {},
      classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    },
  },
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

let failures = 0;
const ok = (cond, name) => { console.log((cond ? "PASS" : "FAIL") + " " + name); if (!cond) failures++; };

try {
  vm.runInContext(load("js/i18n.js"), sandbox, { filename: "i18n.js" });
  vm.runInContext(load("js/icons.js"), sandbox, { filename: "icons.js" });
  vm.runInContext(load("js/data.js"), sandbox, { filename: "data.js" });
  vm.runInContext(load("js/garden.js"), sandbox, { filename: "garden.js" });
  vm.runInContext(load("js/theme.js"), sandbox, { filename: "theme.js" });
  vm.runInContext(load("js/explore.js"), sandbox, { filename: "explore.js" });
} catch (e) {
  console.log("FAIL explore.js threw at load: " + (e && e.stack || e));
  process.exit(1);
}

ok(typeof sandbox.I18N === "object" && typeof sandbox.I18N.t === "function", "I18N exposed");
ok(sandbox.I18N.t("status.active", "активен") === "активен", "RU fallback via T()");
ok(sandbox.I18N.t("nav.home", "Главная") === "Главная", "RU no-op for missing key");

const garden = sandbox.rfcGarden;
const N = vm.runInContext("protocolsData.protocols.length", sandbox);
ok(!!garden, "garden instance created");
ok(garden.protocols.length === N, N + " objects loaded (got " + garden.protocols.length + ")");

// fire rAF(resize+start) then several draw frames
let guard = 0;
while (rafQ.length && guard++ < 8) rafQ.shift()();
ok(canvasEl.width === 1600 && canvasEl.height === 900, "canvas sized 1600x900 (got " + canvasEl.width + "x" + canvasEl.height + ")");
ok(!!garden.animationId, "draw loop running");
ok(typeof garden.drawRoots === "function" && typeof garden.drawSap === "function" &&
   typeof garden.drawFruits === "function" && typeof garden.fruitCount === "function",
   "anatomy methods exist (roots/sap/fruits)");
ok(garden.fruitCount({ usedBy: ["a", "b", "c", "d"], status: "active" }) === 3, "fruitCount caps at 3");
ok(garden.fruitCount({ usedBy: ["a"], status: "active" }) === 1, "fruitCount counts dependents");
ok(garden.fruitCount({ usedBy: [], status: "active" }) === 0, "fruitCount 0 without dependents");
ok(garden.fruitCount({ usedBy: ["a", "b"], status: "legacy" }) === 0, "legacy has no fruits");
const badPos = garden.protocols.filter((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y));
ok(badPos.length === 0, "all protocols have numeric x/y");
ok(els.shownCounter.textContent === N + " / " + N, "counter shows " + N + "/" + N + " (got '" + els.shownCounter.textContent + "')");

// --- chip: status=legacy -> only FTP ---
statusChips.find((c) => c.dataset.status === "legacy").fire("click");
ok(garden.protocols.length === 5, "status=legacy filters to 5 (got " + garden.protocols.map((p) => p.id) + ")");
ok(statusChips.find((c) => c.dataset.status === "legacy")._cls.has("active"), "legacy chip gets .active");
// --- back to all ---
statusChips.find((c) => c.dataset.status === "all").fire("click");
ok(garden.protocols.length === N, "status=all restores " + N);
// --- layer=transport -> TCP,UDP,QUIC ---
layerChips.find((c) => c.dataset.layer === "transport").fire("click");
ok(garden.protocols.length === 4, "layer=transport gives 4 (got " + garden.protocols.length + ")");
layerChips.find((c) => c.dataset.layer === "all").fire("click");
// --- new tiers ---
layerChips.find((c) => c.dataset.layer === "session").fire("click");
ok(garden.protocols.length === 5 && garden.protocols.every((p) => p.layer === "session"), "layer=session gives 5 (got " + garden.protocols.map((p) => p.id) + ")");
layerChips.find((c) => c.dataset.layer === "link").fire("click");
ok(garden.protocols.length === 2, "layer=link gives ARP+Switch (got " + garden.protocols.map((p) => p.id) + ")");
layerChips.find((c) => c.dataset.layer === "physical").fire("click");
ok(garden.protocols.length === 2, "layer=physical gives Modem+Wi-Fi (got " + garden.protocols.map((p) => p.id) + ")");
layerChips.find((c) => c.dataset.layer === "all").fire("click");
ok(garden.protocols.length === N, "layer=all restores " + N);
// --- search 'http' ---
els.searchBox.value = "http";
els.searchBox.fire("input");
const names = garden.protocols.map((p) => p.name);
ok(["HTTP/1.1", "HTTP/2", "HTTP/3", "HTTP Cookies"].every((n) => garden.protocols.some((p) => p.name === n)),
  "search 'http' finds core HTTP set (got " + names.join(",") + ")");
els.searchBox.value = "";
els.searchBox.fire("input");
ok(garden.protocols.length === N, "clear search restores " + N);

// --- click on first protocol -> card opens ---
const p0 = garden.protocols[0];
const sx = p0.x * garden.view.s + garden.view.x;
const sy = p0.y * garden.view.s + garden.view.y;
canvasEl.fire("mousedown", { clientX: sx, clientY: sy });
canvasEl.fire("mouseup", { clientX: sx, clientY: sy });
ok(!els.protoCard._cls.has("hidden"), "card opens on plant click");
ok(els.pcTitle.textContent === p0.name, "card title = " + p0.name);
ok(sandbox.location.hash === p0.id, "deep-link hash set (#" + p0.id + ")");
// --- Escape closes card ---
(docHandlers.keydown || []).forEach((fn) => fn({ key: "Escape", preventDefault() {} }));
ok(els.protoCard._cls.has("hidden"), "Escape closes card");

// --- category filter ---
els.catSelect.value = "email";
els.catSelect.fire("change", { target: els.catSelect });
ok(garden.protocols.length === 4, "category=email gives 4 (got " + garden.protocols.map((p) => p.id) + ")");
els.catSelect.value = "all";
els.catSelect.fire("change", { target: els.catSelect });
ok(garden.protocols.length === N, "category=all restores " + N);
// --- smart search 'почта' ---
els.searchBox.value = "почта";
els.searchBox.fire("input");
ok(garden.protocols.length >= 4 && ["rfc5321", "rfc1939", "rfc3501", "rfc5322"].every((id) => garden.protocols.some((p) => p.id === id)),
  "smart search 'почта' finds mail protocols (got " + garden.protocols.map((p) => p.id) + ")");
els.searchBox.value = "";
els.searchBox.fire("input");
// --- where/fact in card ---
{
  const t = garden.allProtocols.find((x) => x.id === "rfc0793");
  canvasEl.fire("mousedown", { clientX: t.x, clientY: t.y });
  canvasEl.fire("mouseup", { clientX: t.x, clientY: t.y });
  ok(els.pcWhere.textContent.includes("Где встречается") && els.pcFact._innerHTML.length > 2, "card shows where+fact");
}
// --- entities: kind card, external link, category filter, search ---
{
  const t = garden.allProtocols.find((x) => x.id === "os-linux");
  canvasEl.fire("mousedown", { clientX: t.x, clientY: t.y });
  canvasEl.fire("mouseup", { clientX: t.x, clientY: t.y });
  ok(els.pcTitle.textContent === "Linux", "entity card opens (Linux)");
  ok(!els.pcNum.textContent.includes("RFC") && els.pcNum.textContent.includes("1991"), "entity header shows kind+year, no RFC (got '" + els.pcNum.textContent + "')");
  ok(els.pcLink.href.includes("wikipedia.org"), "entity link points to external source (got '" + els.pcLink.href + "')");
}
els.catSelect.value = "os";
els.catSelect.fire("change", { target: els.catSelect });
ok(garden.protocols.length === 6 && garden.protocols.every((p) => p.category === "os"), "category=os gives 6 OS (got " + garden.protocols.map((p) => p.id) + ")");
els.catSelect.value = "all";
els.catSelect.fire("change", { target: els.catSelect });
els.searchBox.value = "докер";
els.searchBox.fire("input");
ok(garden.protocols.some((p) => p.id === "virt-docker"), "smart search finds Docker (got " + garden.protocols.map((p) => p.id) + ")");
els.searchBox.value = "";
els.searchBox.fire("input");
ok(garden.protocols.length === N, "clear search restores " + N);
// restore focus for the favorites block below (filters close the card)
{
  const t = garden.allProtocols.find((x) => x.id === "rfc0793");
  canvasEl.fire("mousedown", { clientX: t.x, clientY: t.y });
  canvasEl.fire("mouseup", { clientX: t.x, clientY: t.y });
}
// --- favorites ---
els.pcFav.fire("click");
ok(els.pcFav.innerHTML.includes("В избранном"), "star adds favorite");
els.favBtn.fire("click");
ok(garden.protocols.length === 1, "fav filter shows 1 (got " + garden.protocols.length + ")");
els.favBtn.fire("click");
ok(garden.protocols.length === N, "fav off restores " + N);
// --- recent ---
els.recentBtn.fire("click");
ok(!els.recentPanel._cls.has("hidden") && (els.recentPanel._children.length > 1), "recent panel lists items");
els.recentBtn.fire("click");
// --- compare ---
{
  const t = garden.allProtocols.find((x) => x.id === "rfc0793");
  canvasEl.fire("mousedown", { clientX: t.x, clientY: t.y });
  canvasEl.fire("mouseup", { clientX: t.x, clientY: t.y });
}
els.pcCompare.fire("click");
{
  const t2 = garden.allProtocols.find((x) => x.id === "rfc0768");
  canvasEl.fire("mousedown", { clientX: t2.x, clientY: t2.y });
  canvasEl.fire("mouseup", { clientX: t2.x, clientY: t2.y });
}
ok(!els.compareCard._cls.has("hidden") && els.cmpCols._innerHTML.includes("TCP") && els.cmpCols._innerHTML.includes("UDP"), "compare shows TCP vs UDP");
els.cmpClose.fire("click");
ok(els.compareCard._cls.has("hidden") && garden.compareIds.length === 0, "compare closes");
// --- path ---
{
  const t = garden.allProtocols.find((x) => x.id === "rfc2616");
  canvasEl.fire("mousedown", { clientX: t.x, clientY: t.y });
  canvasEl.fire("mouseup", { clientX: t.x, clientY: t.y });
  els.pcPath.fire("click");
  ok(garden.pathIds && garden.pathIds.size >= 3 && garden.pathIds.has("rfc2616") && garden.pathIds.has("rfc0791"),
    "path HTTP->TCP->IPv4 (got " + (garden.pathIds ? [...garden.pathIds].join(",") : "null") + ")");
}
// --- exam mode ---
els.examBtn.fire("click");
ok(garden.hideLabels === true && els.examBtn._cls.has("on"), "exam mode on");
{
  const t = garden.allProtocols.find((x) => x.id === "rfc0793");
  canvasEl.fire("mousedown", { clientX: t.x, clientY: t.y });
  canvasEl.fire("mouseup", { clientX: t.x, clientY: t.y });
  ok(els.pcTitle.textContent === "? ? ?" && !els.pcReveal._cls.has("hidden"), "exam masks answer");
  els.pcReveal.fire("click");
  ok(els.pcTitle.textContent === "TCP", "reveal shows answer");
}
els.examBtn.fire("click");
ok(garden.hideLabels === false, "exam mode off");
// --- tour ---
els.tourBtn.fire("click");
ok(!els.tourCaption._cls.has("hidden"), "tour caption shows");
canvasEl.fire("mousedown", { clientX: 10, clientY: 10 });
ok(els.tourCaption._cls.has("hidden"), "canvas click stops tour");
// --- resetView / export / share buttons ---
els.resetView.fire("click");
ok(true, "resetView click no-throw");
els.exportPng.fire("click");
ok(true, "exportPng click no-throw");
els.shareLink.fire("click");
setImmediate(() => {
  ok(typeof sandbox.__clipboard === "string" && sandbox.__clipboard.includes("view="), "share includes view (" + sandbox.__clipboard + ")");
  // --- EN smoke test in a fresh sandbox ---
  try {
    const sb2 = new vm.createContext({
      console, Math, JSON, Object,
      setTimeout: () => 1, clearTimeout() {},
      localStorage: { _m: { rfcGarden_lang: "en" }, getItem(k) { return this._m[k] || null; }, setItem(k, v) { this._m[k] = v; } },
      location: { reload() {} },
      document: {
        readyState: "complete",
        documentElement: { lang: "ru" },
        querySelector: () => null,
        querySelectorAll: () => [],
        getElementById: () => null,
        addEventListener() {},
      },
    });
    sb2.window = sb2;
    sb2.globalThis = sb2;
    vm.runInContext(load("js/i18n.js"), sb2, { filename: "i18n.js" });
    ok(sb2.I18N.t("nav.home", "Главная") === "Home", "EN dict: nav.home=Home");
    ok(sb2.I18N.t("status.active", "активен") === "active", "EN dict: status.active=active");
    ok(sb2.I18N.t("tour.3", "ххх").startsWith("3/6"), "EN dict: tour.3 exists");
    ok(sb2.document.documentElement.lang === "en", "EN apply() sets <html lang=en>");
  } catch (e) {
    console.log("FAIL EN smoke test threw: " + (e && e.stack || e));
    failures++;
  }
  console.log(failures === 0 ? "EXPLORE TESTS: ALL OK" : "EXPLORE TESTS: " + failures + " FAILURES");
  process.exit(failures === 0 ? 0 : 1);
});
