// achievements.js — гербарий достижений.
// Слушает открытия растений (хэш #id + видимость карточки), копит прогресс
// в localStorage, показывает тосты. explore.js НЕ правится.
(function () {
"use strict";

const SEEN_KEY = "rfcGarden_seen_v1";
const ACH_KEY = "rfcGarden_ach_v1";

const STR = {
    first:  { ru: ["Первый росток", "Открыто первое растение сада"], en: ["First sprout", "Opened your first plant"] },
    ten:    { ru: ["Юный ботаник", "10 растений в гербарии"], en: ["Junior botanist", "10 plants collected"] },
    half:   { ru: ["Полсада", "36 растений изучено"], en: ["Half garden", "36 plants studied"] },
    all:    { ru: ["Хранитель сада", "Все 72 объекта открыты"], en: ["Garden keeper", "All 72 objects opened"] },
    layers: { ru: ["Семь ярусов", "По растению с каждого уровня"], en: ["Seven tiers", "A plant from every layer"] },
    legacy: { ru: ["Археолог", "Открыт музейный протокол"], en: ["Archaeologist", "Opened a legacy protocol"] },
    linked: { ru: ["Прямая ссылка", "Открытие через deep-link"], en: ["Deep link", "Opened via deep-link"] },
    fruits: { ru: ["Садовод", "Открыт плодоносящий хаб"], en: ["Orchardist", "Opened a fruiting hub"] },
};

function load(key, fb) {
    try {
        const v = JSON.parse(localStorage.getItem(key));
        return Array.isArray(v) ? v : fb;
    } catch (e) { return fb; }
}
function save(key, v) {
    try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) {}
}
function lang() {
    try {
        const l = (document.documentElement && document.documentElement.lang) || "ru";
        return l.indexOf("en") === 0 ? "en" : "ru";
    } catch (e) { return "ru"; }
}
function proto(id) {
    try {
        if (typeof protocolsData === "undefined") return null;
        return protocolsData.protocols.find((p) => p.id === id) || null;
    } catch (e) { return null; }
}

const seen = load(SEEN_KEY, []);
const ach = load(ACH_KEY, []);

function state() {
    const layers = {};
    seen.forEach((id) => {
        const p = proto(id);
        if (p && p.layer) layers[p.layer] = 1;
    });
    return { seen: seen.slice(), ach: ach.slice(), layers: Object.keys(layers) };
}

const TESTS = [
    { id: "first",  test: (s) => s.seen.length >= 1 },
    { id: "ten",    test: (s) => s.seen.length >= 10 },
    { id: "half",   test: (s) => s.seen.length >= 36 },
    { id: "all",    test: (s) => s.seen.length >= 72 },
    { id: "layers", test: (s) => s.layers.length >= 7 },
    { id: "legacy", test: (s) => s.seen.some((id) => { const p = proto(id); return p && p.status === "legacy"; }) },
    { id: "linked", test: (s, f) => !!(f && f.viaLink) },
    { id: "fruits", test: (s) => s.seen.some((id) => { const p = proto(id); return p && (p.usedBy || []).length >= 3; }) },
];

function toast(def) {
    try {
        let box = null;
        try { box = document.querySelector(".ach-toasts"); } catch (e) {}
        if (!box) {
            box = document.createElement("div");
            box.className = "ach-toasts";
            box.setAttribute("aria-live", "polite");
            document.body.appendChild(box);
        }
        const l = lang();
        const el = document.createElement("div");
        el.className = "ach-toast";
        const b = document.createElement("b");
        b.textContent = def[l][0];
        const s = document.createElement("span");
        s.textContent = def[l][1];
        el.appendChild(b);
        el.appendChild(s);
        box.appendChild(el);
        setTimeout(() => { try { el.classList.add("out"); } catch (e) {} }, 3400);
        setTimeout(() => { try { el.remove(); } catch (e) {} }, 4000);
    } catch (e) {}
}

function check(flags) {
    const s = state();
    TESTS.forEach((t) => {
        if (ach.indexOf(t.id) !== -1) return;
        let ok = false;
        try { ok = !!t.test(s, flags || {}); } catch (e) {}
        if (ok) {
            ach.push(t.id);
            save(ACH_KEY, ach);
            toast(STR[t.id]);
        }
    });
}

function record(id, flags) {
    if (!id) return state();
    if (seen.indexOf(id) === -1) {
        seen.push(id);
        save(SEEN_KEY, seen);
    }
    check(flags);
    return state();
}

function currentId() {
    try {
        const h = (location.hash || "").replace("#", "").split("?")[0];
        return h || null;
    } catch (e) { return null; }
}

function hook() {
    const onOpen = (viaLink) => {
        const id = currentId();
        if (id) record(id, { viaLink: !!viaLink });
    };
    try {
        if (window.addEventListener) window.addEventListener("hashchange", () => onOpen(true));
    } catch (e) {}
    if (typeof MutationObserver !== "undefined") {
        try {
            const card = document.querySelector("#protoCard");
            if (card && card.classList) {
                new MutationObserver(() => {
                    try {
                        if (!card.classList.contains("hidden")) onOpen(false);
                    } catch (e) {}
                }).observe(card, { attributes: true, attributeFilter: ["class"] });
            }
        } catch (e) {}
    }
    try { if (currentId()) onOpen(true); } catch (e) {}
}

try { hook(); } catch (e) {}
try { check({}); } catch (e) {}

const api = {
    record, check, state,
    reset() {
        seen.length = 0; ach.length = 0;
        save(SEEN_KEY, seen); save(ACH_KEY, ach);
        return state();
    },
};
if (typeof window !== "undefined") { try { window.Achievements = api; } catch (e) {} }
if (typeof globalThis !== "undefined") { try { globalThis.Achievements = globalThis.Achievements || api; } catch (e) {} }
})();
