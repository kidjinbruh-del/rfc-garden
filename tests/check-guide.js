const fs = require("fs");
const dir = require("path").resolve(__dirname, "..");
let failures = 0;
const ok = (c, n) => { console.log((c ? "PASS " : "FAIL ") + n); if (!c) failures++; };

const dataSrc = fs.readFileSync(dir + "/js/data.js", "utf8");
const protocolsData = new Function(dataSrc + "; return protocolsData;")();
const ids = new Set(protocolsData.protocols.map((p) => p.id));
const layers = new Set(protocolsData.protocols.map((p) => p.layer));

const guide = fs.readFileSync(dir + "/guide.html", "utf8");
const hrefs = [...guide.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
ok(hrefs.length > 10, "guide has links (" + hrefs.length + ")");
for (const h of hrefs) {
  if (h.startsWith("http") || h.startsWith("data:")) continue; // external, skip
  const [fileQ, frag] = h.split("#");
  const [file, query] = fileQ.split("?");
  if (file && !fs.existsSync(dir + "/" + file)) { ok(false, "link target exists: " + h); continue; }
  if (query) {
    const m = query.match(/layer=([a-z]+)/);
    if (m) ok(layers.has(m[1]), "layer link valid: " + h);
  }
  if (frag) ok(ids.has(frag), "deep-link #" + frag + " is a real protocol");
}
// nav on all pages
for (const f of ["index.html", "explore.html", "timeline.html", "guide.html", "learn.html", "contribute.html", "quiz.html", "stats.html", "teacher.html", "cheatsheet.html"]) {
  const html = fs.readFileSync(dir + "/" + f, "utf8");
  ok(html.includes('<a href="guide.html"'), f + " nav has Guide link");
}
ok(guide.includes('<a href="guide.html" class="active"'), "guide nav marks Guide active");
for (const f of ["index.html", "explore.html", "timeline.html", "learn.html", "contribute.html", "quiz.html", "stats.html", "teacher.html", "cheatsheet.html"]) {
  const html = fs.readFileSync(dir + "/" + f, "utf8");
  const m = html.match(/<a href="guide\.html"([^>]*)>/);
  ok(m && !m[1].includes("active"), f + " nav Guide not active");
}
// learn links back to guide
ok(fs.readFileSync(dir + "/learn.html", "utf8").includes('href="guide.html"'), "learn links to guide");
console.log(failures === 0 ? "GUIDE TESTS: ALL OK" : "GUIDE TESTS: " + failures + " FAILURES");
process.exit(failures === 0 ? 0 : 1);
