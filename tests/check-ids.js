const fs = require("fs");
const dir = require("path").resolve(__dirname, "..");
const htmlFiles = ["index.html", "explore.html", "timeline.html", "learn.html", "contribute.html"];
const idNames = new Set();
for (const f of htmlFiles) {
  const html = fs.readFileSync(dir + "/" + f, "utf8");
  const re = /id="([^"]+)"/g;
  let m;
  while ((m = re.exec(html)) !== null) idNames.add(m[1]);
}
const jsFiles = ["js/explore.js", "js/main.js", "js/theme.js", "js/garden.js"];
const used = new Map();
for (const f of jsFiles) {
  const js = fs.readFileSync(dir + "/" + f, "utf8");
  const re = /(?:getElementById|\$\()\s*["'`]([^"'`\)]+)["'`]/g;
  let m;
  while ((m = re.exec(js)) !== null) {
    if (!used.has(m[1])) used.set(m[1], []);
    used.get(m[1]).push(f);
  }
}
let missing = 0;
for (const [id, files] of used) {
  if (!idNames.has(id)) { console.log("MISSING id=" + id + " used in: " + files.join(",")); missing++; }
}
console.log(missing === 0 ? "ID check: ALL OK (" + used.size + " ids)" : "ID check: " + missing + " MISSING");
