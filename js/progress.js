// progress.js — виджет «Изучено N из 72» на странице статистики.
// Только читает localStorage (пишет achievements.js) и данные сада.
(function () {
"use strict";

function seen() {
    try {
        const v = JSON.parse(localStorage.getItem("rfcGarden_seen_v1"));
        return Array.isArray(v) ? v : [];
    } catch (e) { return []; }
}
function total() {
    try {
        if (typeof protocolsData !== "undefined") return protocolsData.protocols.length;
    } catch (e) {}
    return 72;
}
function label(n, t) {
    try {
        if (typeof I18N !== "undefined" && I18N.t) return I18N.t("st.studied", "Изучено в саду");
    } catch (e) {}
    return "Изучено в саду";
}
function render() {
    let grid = null;
    try { grid = document.querySelector("#statGrid"); } catch (e) {}
    if (!grid || !grid.parentElement) return false;
    if (grid.parentElement.querySelector(".stat-progress")) return true;
    const n = seen().length, t = total();
    const pct = t ? Math.min(100, Math.round((n / t) * 100)) : 0;
    try {
        const wrap = document.createElement("div");
        wrap.className = "stat-progress";
        const top = document.createElement("div");
        top.className = "stat-progress-top";
        const b = document.createElement("b");
        b.textContent = n + " / " + t;
        const s = document.createElement("span");
        s.textContent = label(n, t);
        top.appendChild(b);
        top.appendChild(s);
        const track = document.createElement("div");
        track.className = "bar-track";
        const fill = document.createElement("i");
        fill.style.width = pct + "%";
        track.appendChild(fill);
        wrap.appendChild(top);
        wrap.appendChild(track);
        grid.parentElement.insertBefore(wrap, grid);
        return true;
    } catch (e) { return false; }
}

try { render(); } catch (e) {}
try {
    document.addEventListener("DOMContentLoaded", () => { try { render(); } catch (e) {} });
} catch (e) {}

const api = {
    seen,
    total,
    render,
    percent() {
        const t = total();
        return t ? Math.min(100, Math.round((seen().length / t) * 100)) : 0;
    },
};
if (typeof window !== "undefined") { try { window.GardenProgress = api; } catch (e) {} }
if (typeof globalThis !== "undefined") { try { globalThis.GardenProgress = globalThis.GardenProgress || api; } catch (e) {} }
})();
