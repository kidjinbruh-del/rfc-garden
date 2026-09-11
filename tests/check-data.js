const fs = require("fs");
const dir = require("path").resolve(__dirname, "..");
const src = fs.readFileSync(dir + "/js/data.js", "utf8");
const protocolsData = new Function(src + "; return protocolsData;")();
const ps = protocolsData.protocols;
console.log("protocols count:", ps.length);
let errors = 0;
const ids = new Set(ps.map((p) => p.id));
if (ids.size !== ps.length) { console.log("ERROR: duplicate ids"); errors++; }
const layers = new Set(["application", "presentation", "session", "transport", "network", "link", "physical"]);
const plants = new Set(["tree", "vine", "flower", "mushroom", "sprout"]);
const statuses = new Set(["active", "updated", "legacy"]);
const categories = new Set(["addressing", "control", "transport", "naming", "email",
  "file_transfer", "remote", "monitoring", "sync", "web", "security", "routing",
  "streaming", "voice", "news", "auth", "iot", "core", "networking",
  "hardware", "os", "virt", "lang", "ai"]);
for (const p of ps) {
  for (const f of ["id", "name", "year", "status", "layer", "plant", "color", "description", "category"]) {
    if (p[f] === undefined || p[f] === null || p[f] === "") { console.log("ERROR: " + p.id + " missing field " + f); errors++; }
  }
  // протокол имеет number (RFC), сущность — url; ровно одно из двух
  const hasNum = p.number !== undefined && p.number !== null && p.number !== "";
  const hasUrl = typeof p.url === "string" && p.url !== "";
  if (hasNum === hasUrl) { console.log("ERROR: " + p.id + " needs exactly one of number/url"); errors++; }
  if (hasNum && (!Number.isInteger(p.number) || p.number <= 0)) { console.log("ERROR: " + p.id + " bad number"); errors++; }
  if (hasUrl && !/^https?:\/\//.test(p.url)) { console.log("ERROR: " + p.id + " bad url"); errors++; }
  if (!categories.has(p.category)) { console.log("ERROR: " + p.id + " bad category " + p.category); errors++; }
  if (!layers.has(p.layer)) { console.log("ERROR: " + p.id + " bad layer " + p.layer); errors++; }
  if (!plants.has(p.plant)) { console.log("ERROR: " + p.id + " bad plant " + p.plant); errors++; }
  if (!statuses.has(p.status)) { console.log("ERROR: " + p.id + " bad status " + p.status); errors++; }
  if (!/^#[0-9A-Fa-f]{6}$/.test(p.color)) { console.log("ERROR: " + p.id + " bad color " + p.color); errors++; }
  for (const rel of ["dependsOn", "usedBy", "replaces", "replacedBy"]) {
    if (!Array.isArray(p[rel])) { console.log("ERROR: " + p.id + " " + rel + " not array"); errors++; continue; }
    for (const ref of p[rel]) {
      if (!ids.has(ref)) {
        // usedBy/replaces may reference RFCs not in garden (e.g. rfc2821) — warn only for dependsOn
        if (rel === "dependsOn") { console.log("ERROR: " + p.id + " dependsOn unknown " + ref); errors++; }
      }
    }
  }
}
// check PROTOCOLS.json in sync
const j = JSON.parse(fs.readFileSync(dir + "/PROTOCOLS.json", "utf8"));
const jIds = j.protocols.map((p) => p.id).sort().join(",");
const dIds = ps.map((p) => p.id).sort().join(",");
console.log(jIds === dIds ? "PROTOCOLS.json in sync" : "WARN: PROTOCOLS.json out of sync");
console.log(errors === 0 ? "DATA check: ALL OK" : "DATA check: " + errors + " ERRORS");
process.exit(errors === 0 ? 0 : 1);
