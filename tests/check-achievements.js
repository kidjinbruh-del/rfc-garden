/* check-achievements: гербарий достижений и прогресс (vm-стаб, без браузера). */
const fs = require("fs");
const vm = require("vm");
const path = require("path");
const dir = path.resolve(__dirname, "..");
const load = (f) => fs.readFileSync(path.join(dir, f), "utf8");

let failures = 0;
const ok = (c, n) => { console.log((c ? "PASS " : "FAIL ") + n); if (!c) failures++; };

function makeEl() {
    return {
        textContent: "", style: {}, _cls: new Set(),
        classList: { add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, toggle() {}, contains: () => false, _s: new Set() },
        setAttribute() {}, appendChild(c) { return c; }, remove() {},
    };
}
const store = {};
const sb = {
    console, Math, JSON, Object, Array, Set, Map, Date, Promise,
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    requestAnimationFrame: () => 0, cancelAnimationFrame() {},
    localStorage: {
        getItem: (k) => (k in store ? store[k] : null),
        setItem: (k, v) => { store[k] = String(v); },
    },
    location: { hash: "" },
    document: {
        documentElement: { lang: "ru", classList: { add() {}, remove() {} } },
        querySelector: () => null,
        createElement: () => makeEl(),
        addEventListener() {},
        body: { appendChild() {}, setAttribute() {} },
    },
};
sb.window = sb; sb.globalThis = sb;
sb.window.addEventListener = () => {};
vm.createContext(sb);

try {
    vm.runInContext(load("js/data.js"), sb, { filename: "data.js" });
    vm.runInContext(load("js/achievements.js"), sb, { filename: "achievements.js" });
    vm.runInContext(load("js/progress.js"), sb, { filename: "progress.js" });
    const A = vm.runInContext("window.Achievements", sb);
    const P = vm.runInContext("window.GardenProgress", sb);
    ok(!!A && !!P, "achievements: API exposed");

    A.reset();
    let s = A.record("rfc0793");
    ok(s.seen.indexOf("rfc0793") !== -1, "achievements: seen records id");
    ok(s.ach.indexOf("first") !== -1, "achievements: first unlocks on 1 plant");
    ok("rfcGarden_seen_v1" in store && "rfcGarden_ach_v1" in store, "achievements: persists to localStorage");

    const before = s.seen.length;
    A.record("rfc0793");
    ok(A.state().seen.length === before, "achievements: no duplicate seen");

    ["rfc0768", "rfc1035", "rfc5321", "rfc0959", "rfc5905", "rfc2616", "rfc8200", "rfc8446", "rfc2131"].forEach((id) => A.record(id));
    s = A.state();
    ok(s.ach.indexOf("ten") !== -1, "achievements: ten unlocks on 10 plants");
    ok(s.ach.indexOf("legacy") !== -1, "achievements: legacy unlocks (FTP rfc0959)");
    ok(s.ach.indexOf("fruits") !== -1, "achievements: fruits unlocks (TCP hub)");

    A.reset();
    A.record("rfc0793", { viaLink: true });
    ok(A.state().ach.indexOf("linked") !== -1, "achievements: linked unlocks via deep-link flag");

    ok(P.total() === 72, "progress: total is 72 (got " + P.total() + ")");
    ok(P.seen().length === A.state().seen.length, "progress: seen matches achievements");
    ok(P.percent() === Math.round((P.seen().length / 72) * 100), "progress: percent math ok");

    A.reset();
    ok(A.state().seen.length === 0 && A.state().ach.length === 0, "achievements: reset clears");
} catch (e) { console.log("FAIL achievements threw: " + (e && e.stack || e)); failures++; }

console.log(failures === 0 ? "CHECK-ACHIEVEMENTS: ALL OK" : "CHECK-ACHIEVEMENTS: " + failures + " FAILURES");
process.exit(failures === 0 ? 0 : 1);
