/* check-encyclopedia: профили валидны, страницы на месте,
   навигация ведёт в энциклопедию со всех страниц. */
const fs = require("fs");
const path = require("path");
const dir = path.resolve(__dirname, "..");
const load = (f) => fs.readFileSync(path.join(dir, f), "utf8");

let failures = 0;
const ok = (c, n) => { console.log((c ? "PASS " : "FAIL ") + n); if (!c) failures++; };

const protocolsData = new Function(load("js/data.js") + "; return protocolsData;")();
const PROFILES = new Function("window", load("js/profiles.js") + "; return window.PROFILES;")({});
const ids = new Set(protocolsData.protocols.map((p) => p.id));
const pids = Object.keys(PROFILES);

ok(pids.length === ids.size, "encyclopedia: full profile for every object (got " + pids.length + "/" + ids.size + ")");
let bad = 0;
for (const id of pids) {
  const pr = PROFILES[id];
  if (!ids.has(id)) { console.log("FAIL profile of unknown id: " + id); bad++; continue; }
  if (typeof pr.origin !== "string" || !pr.origin) { console.log("FAIL " + id + ": empty origin"); bad++; }
  if (typeof pr.how !== "string" || !pr.how) { console.log("FAIL " + id + ": empty how"); bad++; }
  for (const f of ["varieties", "practice", "quiz"]) {
    if (!Array.isArray(pr[f]) || !pr[f].length) { console.log("FAIL " + id + ": empty " + f); bad++; }
  }
}
ok(bad === 0, "encyclopedia: all profiles complete");

for (const page of ["encyclopedia.html", "article.html"]) {
  const html = load(page);
  for (const s of ["js/i18n.js", "js/icons.js", "js/data.js", "js/profiles.js", "js/theme.js"]) {
    if (!html.includes('src="' + s + '"')) ok(false, page + ": missing script " + s);
  }
  ok(html.includes('id="langToggle"'), page + ": has #langToggle");
}
ok(load("article.html").includes("URLSearchParams"), "article: reads ?id param");
ok(load("article.html").includes("article.html?id="), "article: prev/next links");

// nav -> encyclopedia everywhere
const pages = fs.readdirSync(dir).filter((f) => f.endsWith(".html"));
for (const page of pages) {
  const html = load(page);
  if (!html.includes('href="encyclopedia.html"')) ok(false, page + ": no nav link to encyclopedia");
}
// card -> article
ok(load("explore.html").includes('id="pcProfile"'), "explore: has #pcProfile button");
ok(load("js/explore.js").includes("article.html?id="), "explore.js: card links to article");

console.log(failures === 0 ? "CHECK-ENCYCLOPEDIA: ALL OK" : "CHECK-ENCYCLOPEDIA: " + failures + " FAILURES");
process.exit(failures === 0 ? 0 : 1);
