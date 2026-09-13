/* Запускает все тесты сада. Использование: node tests/run-all.js */
const { spawnSync } = require("child_process");
const path = require("path");

const tests = [
  "check-ids.js",
  "check-data.js",
  "check-guide.js",
  "check-i18n.js",
  "check-layout.js",
  "check-encyclopedia.js",
  "run-explore.js",
  "run-main-timeline.js",
  "run-intro.js",
  "check-achievements.js",
  "perf-smoke.js",
];
let failed = 0;
for (const t of tests) {
  console.log("\n=== " + t + " ===");
  const r = spawnSync(process.execPath, [path.join(__dirname, t)], { stdio: "inherit" });
  if (r.status !== 0) failed++;
}
console.log("\n" + (failed === 0 ? "ALL SUITES PASSED" : failed + " SUITE(S) FAILED"));
process.exit(failed === 0 ? 0 : 1);