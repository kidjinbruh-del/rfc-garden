/* check-i18n: every page includes i18n.js first, has a langToggle button,
   and every data-i18n key used in the HTML exists in the I18N dictionary. */
const fs = require("fs");
const path = require("path");
const dir = path.resolve(__dirname, "..");

const pages = fs.readdirSync(dir).filter((f) => f.endsWith(".html"));
const i18nSrc = fs.readFileSync(path.join(dir, "js", "i18n.js"), "utf8");

// collect dict keys: "key": ...
const dictKeys = new Set();
const re = /"([a-z][a-zA-Z0-9_.]*)"\s*:\s*"/g;
let m;
while ((m = re.exec(i18nSrc))) dictKeys.add(m[1]);

// collect ICON defs: name: `...` inside _defs
const iconsSrc = fs.readFileSync(path.join(dir, "js", "icons.js"), "utf8");
const iconNames = new Set();
const reIcon = /^\s{4}([a-zA-Z0-9]+):\s*`/gm;
while ((m = reIcon.exec(iconsSrc))) iconNames.add(m[1]);

let failures = 0;
const ok = (cond, name) => { console.log((cond ? "PASS" : "FAIL") + " " + name); if (!cond) failures++; };

ok(iconNames.size > 10, "icons.js defines icon set (got " + iconNames.size + ")");

for (const page of pages) {
  const html = fs.readFileSync(path.join(dir, page), "utf8");
  const srcs = [...html.matchAll(/<script\s+src="([^"]+)"/g)].map((x) => x[1]);
  ok(srcs[0] === "js/i18n.js",
    page + ": i18n.js is first script (got " + (srcs[0] || "none") + ")");
  ok(srcs.includes("js/icons.js"), page + ": includes js/icons.js");
  ok(html.includes('id="langToggle"'), page + ": has #langToggle button");
  ok(html.includes('id="themeToggle"'), page + ": has #themeToggle button");

  // all static keys must exist in dict
  const keys = new Set();
  for (const k of html.matchAll(/data-i18n(?:-html|-attr)?="([^"]+)"/g)) {
    for (const part of k[1].split("|")) {
      const key = part.split(":").slice(1).join(":").trim();
      if (part.indexOf(":") === -1) keys.add(part.trim().replace(/{[^}]*}/g, ""));
      else if (key) keys.add(key.replace(/{[^}]*}/g, ""));
    }
  }
  for (const key of keys) {
    if (!dictKeys.has(key)) ok(false, page + ": missing dict key '" + key + "'");
  }

  // every data-icon name must exist in icons.js
  for (const k of html.matchAll(/data-icon="([^"]+)"/g)) {
    if (!iconNames.has(k[1])) ok(false, page + ": unknown icon '" + k[1] + "'");
  }

  // data-icon must not sit inside data-i18n/data-i18n-html (EN apply wipes it)
  for (const k of html.matchAll(/data-i18n(?:-html)?="[^"]*"[^>]*>\s*<span data-icon/g)) {
    ok(false, page + ": data-icon nested inside data-i18n element");
  }
}

// ICON.render/inject names used in JS (incl. inline scripts) must exist
const jsFiles = fs.readdirSync(path.join(dir, "js")).filter((f) => f.endsWith(".js"));
for (const jf of jsFiles) {
  const src = fs.readFileSync(path.join(dir, "js", jf), "utf8");
  for (const k of src.matchAll(/ICON\.(?:render|inject)\(\s*"([^"]+)"/g)) {
    if (!iconNames.has(k[1])) ok(false, "js/" + jf + ": unknown icon '" + k[1] + "'");
  }
}
for (const page of pages) {
  const html = fs.readFileSync(path.join(dir, page), "utf8");
  for (const k of html.matchAll(/ICON\.(?:render|inject)\(\s*"([^"]+)"/g)) {
    if (!iconNames.has(k[1])) ok(false, page + ": unknown icon '" + k[1] + "'");
  }
}
["nav.home", "nav.garden", "nav.timeline", "nav.guide", "nav.learn",
 "nav.contribute", "theme.aria"].forEach((k) => {
  ok(dictKeys.has(k), "dict has base key " + k);
});

console.log(failures === 0 ? "CHECK-I18N: ALL OK" : "CHECK-I18N: " + failures + " FAILURES");
process.exit(failures === 0 ? 0 : 1);