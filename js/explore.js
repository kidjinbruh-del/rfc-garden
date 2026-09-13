// explore.js — Сад: поиск, фильтры, слои, карточка, deep-link #id
(function () {
"use strict";

const garden = new ProtocolGarden("gardenCanvas");
garden.loadProtocols(protocolsData);
requestAnimationFrame(() => {
    garden.resize();
    garden.start();
});
// fallback if rAF doesn't fire
setTimeout(() => {
    if (!garden.animationId) {
        garden.resize();
        garden.start();
    }
}, 200);
window.rfcGarden = garden;

const $ = (id) => document.getElementById(id);
const T = (k, fb) => I18N.t(k, fb);
let statusFilter = "all";
let layerFilter  = "all";
let catFilter    = "all";
let favOnly      = false;
let examMode     = false;
let compareArmed = false;

// безопасное хранилище (file:// может ограничивать localStorage)
const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} },
};
let favs = new Set((store.get("rfc-garden-fav") || "").split(",").filter(Boolean));
let soundOn = store.get("rfc-garden-sound") !== "off";

const CATEGORY_RU = {
    addressing: "адресация", control: "управление", transport: "транспорт",
    naming: "имена", email: "почта", file_transfer: "файлы", remote: "доступ",
    monitoring: "мониторинг", sync: "время", web: "веб", security: "безопасность",
    routing: "маршруты", streaming: "стриминг", voice: "звонки", news: "новости",
    auth: "вход", iot: "IoT", core: "основы", networking: "сеть",
    hardware: "железо", os: "ОС", virt: "виртуализация", lang: "языки", ai: "ИИ",
};
// умный поиск: слово → термины для сопоставления
const SYNONYMS = {
    "почта": ["smtp", "pop3", "imap", "email", "5321", "1939", "3501", "5322"],
    "письмо": ["smtp", "email", "5321", "5322"],
    "видео": ["rtsp", "rtp", "srtp", "streaming", "2326", "3550", "3711"],
    "стрим": ["rtsp", "rtp", "srtp", "streaming"],
    "звон": ["sip", "rtp", "srtp", "voice", "3261"],
    "голос": ["sip", "rtp", "voice"],
    "пароль": ["pbkdf2", "9106"],
    "вход": ["oauth", "jwt", "ldap", "auth", "6749", "7519", "4511", "2617"],
    "токен": ["jwt", "oauth", "7519", "6749"],
    "время": ["ntp", "5905", "sync"],
    "час": ["ntp", "5905"],
    "адрес": ["ipv4", "ipv6", "dhcp", "dns", "arp", "1918"],
    "шифр": ["tls", "ssh", "8446", "5246", "4253"],
    "защит": ["tls", "ssh", "https", "srtp"],
    "файл": ["ftp", "959"],
    "удал": ["ssh", "telnet", "4253", "854"],
    "iot": ["coap", "7252"],
    "датчик": ["coap", "7252"],
    "умный дом": ["coap"],
    "новост": ["nntp", "3977"],
    "каталог": ["ldap", "4511"],
    "телефон": ["sip", "3261"],
    "приват": ["1918", "192.168"],
    "дом": ["dns", "1035"],
    "сайт": ["http", "2616", "7540", "9114"],
    "маршрут": ["bgp", "4271", "routing"],
    "диагност": ["icmp", "792", "ping"],
    "пинг": ["icmp", "792"],
    "секурити": ["6265"],
    "cookie": ["6265"],
    "куки": ["6265"],
    "роутер": ["router"],
    "маршрутизатор": ["router", "bgp"],
    "коммутатор": ["switch"],
    "свитч": ["switch"],
    "файрвол": ["firewall"],
    "файервол": ["firewall"],
    "модем": ["modem"],
    "вайфай": ["wi-fi", "wireless"],
    "балансиров": ["balancer"],
    "железо": ["router", "switch", "firewall", "modem", "balancer", "wireless"],
    "линукс": ["linux"],
    "юникс": ["unix"],
    "виндовс": ["windows"],
    "винда": ["windows"],
    "макос": ["macos"],
    "андроид": ["android"],
    "операцион": ["unix", "linux", "windows", "macos", "android", "ios"],
    "докер": ["docker"],
    "кубер": ["kubernetes"],
    "гипервизор": ["hypervisor"],
    "виртуал": ["docker", "kubernetes", "hypervisor"],
    "контейнер": ["docker", "kubernetes"],
    "питон": ["python"],
    "джаваскрипт": ["javascript"],
    "раст": ["rust"],
    "си": [" c "],
    "нейросет": ["neural"],
    "трансформер": ["llm"],
    "ии": [" ai "],
};
// умный поиск для английской версии
const SYNONYMS_EN = {
    "mail": ["smtp", "pop3", "imap", "5321", "1939", "3501", "5322"],
    "email": ["smtp", "pop3", "imap", "5321", "1939", "3501", "5322"],
    "letter": ["smtp", "5321"],
    "video": ["rtsp", "rtp", "srtp", "streaming", "2326", "3550", "3711"],
    "stream": ["rtsp", "rtp", "srtp", "streaming"],
    "call": ["sip", "rtp", "srtp", "voice", "3261"],
    "voice": ["sip", "rtp", "voice"],
    "password": ["pbkdf2", "9106"],
    "login": ["oauth", "jwt", "ldap", "auth", "6749", "7519", "4511", "2617"],
    "auth": ["oauth", "jwt", "ldap", "6749", "7519", "4511", "2617"],
    "token": ["jwt", "oauth", "7519", "6749"],
    "time": ["ntp", "5905", "sync"],
    "clock": ["ntp", "5905"],
    "address": ["ipv4", "ipv6", "dhcp", "dns", "arp", "1918"],
    "encrypt": ["tls", "ssh", "8446", "5246", "4253"],
    "secure": ["tls", "ssh", "https", "srtp"],
    "file": ["ftp", "959"],
    "remote": ["ssh", "telnet", "4253", "854"],
    "sensor": ["coap", "7252"],
    "smart home": ["coap"],
    "news": ["nntp", "3977"],
    "directory": ["ldap", "4511"],
    "phone": ["sip", "3261"],
    "private": ["1918", "192.168"],
    "domain": ["dns", "1035"],
    "website": ["http", "2616", "7540", "9114"],
    "site": ["http", "2616", "7540", "9114"],
    "route": ["bgp", "4271", "routing"],
    "router": ["bgp", "4271", "routing"],
    "routing": ["bgp", "4271"],
    "diagnostic": ["icmp", "792", "ping"],
    "ping": ["icmp", "792"],
    "cookie": ["6265"],
    "router": ["router"],
    "switch": ["switch"],
    "firewall": ["firewall"],
    "modem": ["modem"],
    "balancer": ["balancer"],
    "access point": ["access point"],
    "hardware": ["router", "switch", "firewall", "modem", "balancer", "wireless"],
    "linux": ["linux"],
    "unix": ["unix"],
    "windows": ["windows"],
    "macos": ["macos"],
    "android": ["android"],
    "ios": ["ios"],
    "docker": ["docker"],
    "hypervisor": ["hypervisor"],
    "container": ["docker", "kubernetes"],
    "virtual": ["docker", "kubernetes", "hypervisor"],
    "python": ["python"],
    "javascript": ["javascript"],
    "golang": [" go "],
    "rust": ["rust"],
    "neural": ["neural"],
    "transformer": ["llm"],
    "llm": ["llm"],
    "language": [" c ", "python", "javascript", " go ", "rust"],
};
const LAYER_FREQ = { application: 660, presentation: 760, session: 600, transport: 520, network: 420, link: 380, physical: 300 };

// тултип
const tip = document.createElement("div");
Object.assign(tip.style, {
    position: "fixed", zIndex: 300, pointerEvents: "none",
    background: "var(--bg-elevated)", border: "1px solid var(--line-strong)",
    borderRadius: "9px", padding: "6px 12px",
    fontFamily: "'JetBrains Mono', monospace", fontSize: "11.5px",
    color: "var(--text)", display: "none", whiteSpace: "nowrap",
});
document.body.appendChild(tip);

let toastTimer = null;
function toast(msg, ms) {
    const t = $("toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.remove("hidden");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.add("hidden"), ms || 2600);
}

let audioCtx = null;
function beep(freq) {
    if (!soundOn) return;
    try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        audioCtx = audioCtx || new AC();
        const o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.frequency.value = freq || 520; o.type = "sine";
        g.gain.setValueAtTime(.07, audioCtx.currentTime);
        g.gain.exponentialRampToValueAtTime(.0001, audioCtx.currentTime + .25);
        o.connect(g); g.connect(audioCtx.destination);
        o.start(); o.stop(audioCtx.currentTime + .25);
    } catch (e) {}
}

garden.onHover = (p) => {
    if (!p) { tip.style.display = "none"; return; }
    tip.textContent = examMode ? T("tip.exam", "??? · кликни, чтобы угадать") : `RFC ${p.number} · ${p.name}`;
    tip.style.display = "block";
};

document.addEventListener("mousemove", (e) => {
    if (tip.style.display === "block") {
        tip.style.left = e.clientX + 16 + "px";
        tip.style.top  = e.clientY - 8 + "px";
    }
});

garden.onSelect = (p) => {
    if (!p) { closeCard(); return; }
    if (compareArmed) { completeCompare(p); return; }
    beep(LAYER_FREQ[p.layer] || 520);
    openCard(p);
};

function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

function renderCard(p) {
    $("pcNum").textContent = p.number
        ? `RFC ${p.number} \u00b7 ${p.year} \u00b7 ${layerLabel(p.layer)}`
        : `${cap(catLabel(p.category))} \u00b7 ${p.year} \u00b7 ${layerLabel(p.layer)}`;
    $("pcTitle").textContent = p.name;
    $("pcFullname").textContent = p.fullName || "";
    $("pcBadges").innerHTML =
        `<span class="badge st-${p.status}">${statusLabel(p.status)}</span>` +
        `<span class="badge">${catLabel(p.category)}</span>`;
    $("pcDesc").textContent = p.description || "";
    $("pcWhere").textContent = p.where
        ? T("card.where", "Где встречается: {w}").replace("{w}", p.where) : "";
    $("pcFact").innerHTML = p.fact
        ? ICON.render("lightbulb") + " " + p.fact : "";

    const rel = $("pcRelations");
    rel.innerHTML = "";
    addGroup(rel, T("card.depends", "Зависит от"), p.dependsOn);
    addGroup(rel, T("card.usedBy", "Используется в"), p.usedBy);
    addGroup(rel, T("card.replaces", "Заменил"), p.replaces);
    addGroup(rel, T("card.replaced", "Заменён на"), p.replacedBy);
    if (!rel.children.length)
        rel.innerHTML = p.number
            ? T("card.independent",
                '<div class="pc-empty">Независимый протокол — корень сада.</div>')
            : T("card.independent.kind",
                '<div class="pc-empty">Самостоятельный узел — корень сада.</div>');

    ["pcNum", "pcTitle", "pcFullname", "pcBadges", "pcDesc", "pcWhere", "pcFact", "pcRelations"].forEach((id) =>
        $(id).classList.remove("hidden"));
    $("pcReveal").classList.add("hidden");
}

function openCard(p) {
    location.hash = p.id;
    garden.focusId = p.id;
    garden.centerOn(p);
    pushRecent(p.id);
    renderCard(p);
    if (examMode) {
        // режим экзамена: скрыть ответ
        $("pcNum").textContent = p.number ? "RFC ???" : "???";
        $("pcTitle").textContent = "? ? ?";
        ["pcFullname", "pcBadges", "pcDesc", "pcWhere", "pcFact", "pcRelations"].forEach((id) =>
            $(id).classList.add("hidden"));
        $("pcReveal").classList.remove("hidden");
        $("pcReveal").onclick = () => renderCard(p);
    }
    updateFavBtn(p);
    if ($("pcProfile")) $("pcProfile").onclick = () => { location.href = "article.html?id=" + p.id; };
    $("pcLink").href = p.url || `https://www.rfc-editor.org/rfc/rfc${p.number}.txt`;
    const plt = $("pcLinkText");
    if (plt) plt.textContent = p.url
        ? T("e.source", "Открыть источник")
        : T("e.link", "Читать оригинальный RFC");
    $("protoCard").classList.remove("hidden");
}

function addGroup(container, title, ids) {
    if (!ids || !ids.length) return;
    const t = document.createElement("div");
    t.className = "pc-rel-title";
    t.textContent = title;
    container.appendChild(t);
    const wrap = document.createElement("div");
    wrap.className = "pc-rel";
    ids.forEach((id) => {
        const proto = protocolsData.protocols.find((x) => x.id === id);
        const a = document.createElement("a");
        a.textContent = proto ? proto.name : id;
        a.title = proto ? proto.fullName : id;
        a.href = "#";
        a.addEventListener("click", (ev) => {
            ev.preventDefault();
            const target = protocolsData.protocols.find((x) => x.id === id);
            if (target) openCard(target);
        });
        wrap.appendChild(a);
    });
    container.appendChild(wrap);
}

function closeCard() {
    garden.focusId = null;
    garden.pathIds = null;
    try {
        history.replaceState(null, "", location.pathname + location.search);
    } catch (e) { /* file:// может запрещать replaceState — не критично */ }
    $("protoCard").classList.add("hidden");
}

$("pcClose").addEventListener("click", closeCard);
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeCard();
    if (e.key === "/" && document.activeElement !== $("searchBox")) {
        e.preventDefault(); $("searchBox").focus();
    }
});

// ---------- фильтры ----------
function smartMatch(p, q) {
    const hay = (p.name + " " + (p.fullName || "") + " " + (p.number || "") + " " +
        (p.category || "") + " " + (p.where || "")).toLowerCase();
    if (hay.includes(q)) return true;
    const map = I18N.lang === "en" ? SYNONYMS_EN : SYNONYMS;
    for (const key in map) {
        if (q.includes(key)) {
            const terms = map[key];
            for (let i = 0; i < terms.length; i++)
                if (hay.includes(terms[i])) return true;
        }
    }
    return false;
}

function apply() {
    const q = ($("searchBox").value || "").trim().toLowerCase();
    const ids = [];
    for (const p of protocolsData.protocols) {
        const okQ = !q || smartMatch(p, q);
        const okS = statusFilter === "all" ||
            p.status === statusFilter ||
            (statusFilter === "changed" && p.replacedBy.length > 0);
        const okL = layerFilter === "all" || p.layer === layerFilter;
        const okC = catFilter === "all" || p.category === catFilter;
        const okF = !favOnly || favs.has(p.id);
        if (okQ && okS && okL && okC && okF) ids.push(p.id);
    }
    garden.pathIds = null;
    garden.setVisible(ids.length ? new Set(ids) : new Set(["__x__"]));
    $("shownCounter").textContent =
        `${ids.length} / ${protocolsData.protocols.length}`;
    closeCard();
}

function buildCatSelect() {
    const sel = $("catSelect");
    if (!sel) return;
    const cats = [];
    protocolsData.protocols.forEach((p) => {
        if (cats.indexOf(p.category) === -1) cats.push(p.category);
    });
    cats.sort();
    sel.innerHTML = "";
    const all = document.createElement("option");
    all.value = "all"; all.textContent = T("cat.all", "Все назначения");
    sel.appendChild(all);
    cats.forEach((c) => {
        const o = document.createElement("option");
        o.value = c; o.textContent = catLabel(c);
        sel.appendChild(o);
    });
    sel.value = catFilter;
}

function resetAll() {
    statusFilter = layerFilter = catFilter = "all";
    favOnly = false;
    if ($("favBtn")) $("favBtn").classList.remove("on");
    $("searchBox").value = "";
    if ($("catSelect")) $("catSelect").value = "all";
    syncChips();
    apply();
}
window.resetFilters = resetAll;

function syncChips() {
    document.querySelectorAll("[data-status]").forEach((c) =>
        c.classList.toggle("active", c.dataset.status === statusFilter));
    document.querySelectorAll("[data-layer]").forEach((c) =>
        c.classList.toggle("active", c.dataset.layer === layerFilter));
}

$("searchBox").addEventListener("input", () => apply());
document.querySelectorAll("[data-status]").forEach((c) =>
    c.addEventListener("click", () => {
        statusFilter = c.dataset.status; syncChips(); apply();
    }));
document.querySelectorAll("[data-layer]").forEach((c) =>
    c.addEventListener("click", () => {
        layerFilter = c.dataset.layer; syncChips(); apply();
    }));
if ($("catSelect")) $("catSelect").addEventListener("change", (e) => {
    catFilter = e.target.value; apply();
});
// легенда кликабельна
document.querySelectorAll(".legend [data-layer]").forEach((el) => {
    const go = () => { layerFilter = el.dataset.layer; syncChips(); apply(); };
    el.addEventListener("click", go);
    el.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
});

function statusLabel(s) {
    return T("status." + s,
        s === "active" ? "активен" : s === "updated"
         ? "обновлён" : s === "legacy" ? "устарел" : s);
}
function layerLabel(l) {
    return T("layer." + l,
        { application: "прикладной", presentation: "шифрование",
             session: "сеансовый", transport: "транспортный",
             network: "сетевой", link: "канальный",
             physical: "физический" }[l] || l);
}
function catLabel(c) {
    return T("cat." + c, (CATEGORY_RU[c] || c).replace("_", " "));
}

$("resetView").addEventListener("click", () => garden.resetView());

// export PNG
$("exportPng").addEventListener("click", () => {
    const canvas = document.getElementById("gardenCanvas");
    const link = document.createElement("a");
    link.download = "rfc-garden.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
});

// share link (вид: фильтры + камера + протокол)
$("shareLink").addEventListener("click", () => {
    const base = location.href.split("#")[0].split("?")[0];
    const params = [];
    if (statusFilter !== "all") params.push("status=" + statusFilter);
    if (layerFilter !== "all") params.push("layer=" + layerFilter);
    if (catFilter !== "all") params.push("cat=" + catFilter);
    const q = ($("searchBox").value || "").trim();
    if (q) params.push("q=" + encodeURIComponent(q));
    params.push("view=" + Math.round(garden.view.x) + "," +
        Math.round(garden.view.y) + "," + garden.view.s.toFixed(2));
    let url = base + (params.length ? "?" + params.join("&") : "");
    if (garden.focusId) url += "#" + garden.focusId;
    const done = () => toast(T("share.done", "Ссылка скопирована!"));
    if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(done, () => prompt(T("share.prompt", "Скопируйте ссылку:"), url));
    } else {
        prompt(T("share.prompt", "Скопируйте ссылку:"), url);
    }
});

// ---------- избранное ----------
function saveFavs() { store.set("rfc-garden-fav", [...favs].join(",")); }
function updateFavBtn(p) {
    const b = $("pcFav");
    if (!b || !p) return;
    b.innerHTML = favs.has(p.id)
        ? ICON.render("favOn") + " " + T("e.fav.in", "В избранном")
        : ICON.render("favOff") + " " + T("e.fav.add", "В избранное");
}
if ($("pcFav")) $("pcFav").addEventListener("click", () => {
    if (!garden.focusId) return;
    if (favs.has(garden.focusId)) favs.delete(garden.focusId);
    else favs.add(garden.focusId);
    saveFavs();
    const p = protocolsData.protocols.find((x) => x.id === garden.focusId);
    updateFavBtn(p);
    toast(favs.has(garden.focusId)
        ? T("fav.added", "Добавлено в избранное") + " " + ICON.render("favOn")
        : T("fav.removed", "Убрано из избранного"));
});
if ($("favBtn")) $("favBtn").addEventListener("click", () => {
    favOnly = !favOnly;
    $("favBtn").classList.toggle("on", favOnly);
    apply();
    if (favOnly && !favs.size) toast(T("fav.empty", "Избранное пусто — нажми в карточке") + " " + ICON.render("favOff"));
});

// ---------- недавние ----------
function getRecent() {
    return (store.get("rfc-garden-recent") || "").split(",").filter(Boolean);
}
function pushRecent(id) {
    const r = getRecent().filter((x) => x !== id);
    r.unshift(id);
    store.set("rfc-garden-recent", r.slice(0, 12).join(","));
}
function renderRecent() {
    const box = $("recentPanel");
    if (!box) return;
    const r = getRecent();
    if (!r.length) {
        box.innerHTML = '<div class="rp-title">' + T("recent.title", "Недавно открытые") +
            '</div><div class="pc-empty">' + T("recent.empty", "Пока пусто — кликни любое растение.") + '</div>';
        return;
    }
    box.innerHTML = '<div class="rp-title">' + T("recent.title", "Недавно открытые") + '</div>';
    r.forEach((id) => {
        const p = protocolsData.protocols.find((x) => x.id === id);
        if (!p) return;
        const a = document.createElement("a");
        a.textContent = `${p.name} · ${p.number}`;
        a.addEventListener("click", () => {
            const t = garden.allProtocols.find((x) => x.id === id);
            if (t) { resetFiltersSoft(); openCard(t); }
        });
        box.appendChild(a);
    });
}
function resetFiltersSoft() {
    // показать всё, не трогая строку поиска
    statusFilter = layerFilter = catFilter = "all";
    favOnly = false;
    if ($("favBtn")) $("favBtn").classList.remove("on");
    if ($("catSelect")) $("catSelect").value = "all";
    syncChips();
    apply();
}
if ($("recentBtn")) $("recentBtn").addEventListener("click", () => {
    renderRecent();
    $("recentPanel").classList.toggle("hidden");
});

// ---------- сравнение ----------
function startCompare() {
    if (!garden.focusId) { toast(T("cmp.first", "Сначала открой карточку протокола")); return; }
    compareArmed = true;
    garden.compareIds = [garden.focusId];
    closeCard();
    toast(T("cmp.arm", "Кликни второе растение для сравнения"));
}
function completeCompare(p) {
    compareArmed = false;
    if (garden.compareIds[0] === p.id) { garden.compareIds = []; return; }
    garden.compareIds = [garden.compareIds[0], p.id];
    renderCompare();
}
function cmpCol(p) {
    const conn = (p.dependsOn?.length || 0) + (p.usedBy?.length || 0);
    return `<div class="cmp-col">
        <div class="cmp-num">${p.number ? "RFC " + p.number : cap(catLabel(p.category))} · ${p.year}</div>
        <h4>${p.name}</h4>
        <div><span class="badge st-${p.status}">${statusLabel(p.status)}</span>
        <span class="badge">${layerLabel(p.layer)}</span></div>
        <p>${p.description || ""}</p>
        <div class="cmp-meta">${T("cmp.links", `Связей: {n}`).replace("{n}", conn)} · ${p.where || ""}</div>
    </div>`;
}
function renderCompare() {
    const [a, b] = garden.compareIds.map((id) =>
        protocolsData.protocols.find((x) => x.id === id));
    if (!a || !b) return;
    $("cmpCols").innerHTML = cmpCol(a) + cmpCol(b);
    $("compareCard").classList.remove("hidden");
}
if ($("pcCompare")) $("pcCompare").addEventListener("click", startCompare);
if ($("cmpClose")) $("cmpClose").addEventListener("click", () => {
    garden.compareIds = [];
    $("compareCard").classList.add("hidden");
});

// ---------- путь пакета ----------
if ($("pcPath")) $("pcPath").addEventListener("click", () => {
    if (!garden.focusId) return;
    const chain = [];
    const seen = new Set();
    let cur = garden.allProtocols.find((x) => x.id === garden.focusId);
    while (cur && !seen.has(cur.id)) {
        seen.add(cur.id);
        chain.push(cur.id);
        const next = (cur.dependsOn || [])[0];
        cur = next ? garden.allProtocols.find((x) => x.id === next) : null;
    }
    if (chain.length < 2) { toast(T("path.root", "У корня сада пути нет — он ни от чего не зависит")); return; }
    garden.pathIds = new Set(chain);
    const names = chain.map((id) => {
        const p = garden.allProtocols.find((x) => x.id === id);
        return p ? p.name : id;
    });
    toast(T("path.lbl", "Путь: ") + names.join(" → "));
});

// ---------- экзамен ----------
if ($("examBtn")) $("examBtn").addEventListener("click", () => {
    examMode = !examMode;
    garden.hideLabels = examMode;
    $("examBtn").classList.toggle("on", examMode);
    document.body.classList.toggle("exam", examMode);
    closeCard();
    toast(examMode ? T("exam.on", "Режим экзамена: названия скрыты. Кликай и угадывай!") : T("exam.off", "Экзамен окончен"));
});

// ---------- звук ----------
function syncSoundBtn() {
    if ($("soundBtn")) $("soundBtn").innerHTML = ICON.render(soundOn ? "soundOn" : "soundOff");
}
if ($("soundBtn")) $("soundBtn").addEventListener("click", () => {
    soundOn = !soundOn;
    store.set("rfc-garden-sound", soundOn ? "on" : "off");
    syncSoundBtn();
    beep(660);
});
syncSoundBtn();

// ---------- авто-тур ----------
const TOUR = [
    { id: "rfc0791", text: T("tour.1", "1/6 · Корни: IPv4 — фундамент, с него всё началось") },
    { id: "rfc0793", text: T("tour.2", "2/6 · Ствол: TCP — надёжная доставка поверх IP") },
    { id: "rfc1035", text: T("tour.3", "3/6 · Ветви: DNS превращает имена в адреса") },
    { id: "rfc2616", text: T("tour.4", "4/6 · Цветы: HTTP — язык веба") },
    { id: "rfc8446", text: T("tour.5", "5/6 · Замок: TLS 1.3 шифрует соединение") },
    { id: "rfc9000", text: T("tour.6", "6/6 · Будущее: QUIC — транспорт нового веба") },
];
let tourTimer = null, tourIdx = 0;
function stopTour() {
    if (tourTimer) clearInterval(tourTimer);
    tourTimer = null;
    if ($("tourBtn")) $("tourBtn").classList.remove("on");
    if ($("tourCaption")) $("tourCaption").classList.add("hidden");
}
function tourStep() {
    const stop = TOUR[tourIdx % TOUR.length];
    tourIdx++;
    const p = garden.allProtocols.find((x) => x.id === stop.id);
    if (p) { garden.focusId = null; garden.centerOn(p); }
    const cap = $("tourCaption");
    if (cap) {
        cap.innerHTML = "";
        cap.appendChild(document.createTextNode(stop.text));
        const b = document.createElement("button");
        b.textContent = T("tour.stop", "Стоп");
        b.addEventListener("click", stopTour);
        cap.appendChild(b);
        cap.classList.remove("hidden");
    }
}
if ($("tourBtn")) $("tourBtn").addEventListener("click", () => {
    if (tourTimer) { stopTour(); return; }
    tourIdx = 0;
    $("tourBtn").classList.add("on");
    tourStep();
    tourTimer = setInterval(tourStep, 3200);
});
if ($("gardenCanvas")) {
    $("gardenCanvas").addEventListener("mousedown", stopTour);
    $("gardenCanvas").addEventListener("wheel", stopTour);
}

// ---------- мини-карта ----------
const MIN_W = 180, MIN_H = 120;
function drawMinimap() {
    const mm = $("minimap");
    if (!mm || !garden.canvas) return;
    const ctx = mm.getContext("2d");
    if (!ctx) return;
    const cw = garden.w || garden.canvas.width || 1, ch = garden.h || garden.canvas.height || 1;
    const kx = MIN_W / cw, ky = MIN_H / ch;
    const isDark = document.body.getAttribute("data-theme") === "dark";
    ctx.clearRect(0, 0, MIN_W, MIN_H);
    ctx.fillStyle = isDark ? "rgba(10,15,18,.9)" : "rgba(238,242,239,.9)";
    ctx.fillRect(0, 0, MIN_W, MIN_H);
    for (const p of garden.allProtocols) {
        if (p.x == null) continue;
        ctx.fillStyle = p.color || "#888";
        ctx.fillRect(p.x * kx - 1, p.y * ky - 1, 2.5, 2.5);
    }
    // рамка видимой области
    const vx = -garden.view.x * kx / garden.view.s;
    const vy = -garden.view.y * ky / garden.view.s;
    const vw = cw * kx / garden.view.s, vh = ch * ky / garden.view.s;
    ctx.strokeStyle = "#34d399";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(vx, vy, vw, vh);
}
setInterval(drawMinimap, 500);
if ($("minimap")) $("minimap").addEventListener("click", (e) => {
    const r = $("minimap").getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    const cw = garden.w || garden.canvas.width || 1, ch = garden.h || garden.canvas.height || 1;
    const wx = (mx / MIN_W) * cw, wy = (my / MIN_H) * ch;
    const w = cw, h = ch;
    garden._viewTarget = { x: w / 2 - wx * garden.view.s, y: h / 2 - wy * garden.view.s };
});

// ---------- экспорт / импорт набора ----------
function download(name, text) {
    const blob = new Blob([text], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
if ($("exportSetBtn")) $("exportSetBtn").addEventListener("click", () => {
    const data = { exportedAt: new Date().toISOString(), protocols: garden.protocols };
    download("rfc-garden-set.json", JSON.stringify(data));
    toast(T("export.done", `Скачано протоколов: {n}`).replace("{n}", garden.protocols.length));
});
if ($("importSetBtn")) $("importSetBtn").addEventListener("click", () => $("fileImport").click());
if ($("fileImport")) $("fileImport").addEventListener("change", (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
        try {
            const parsed = JSON.parse(rd.result);
            const arr = Array.isArray(parsed) ? parsed : parsed.protocols;
            if (!Array.isArray(arr) || !arr.length) throw new Error("empty");
            for (const p of arr) {
                if (!p.id || !p.name || (!p.number && !p.url)) throw new Error("bad item");
                if (!Array.isArray(p.dependsOn)) p.dependsOn = [];
                if (!Array.isArray(p.usedBy)) p.usedBy = [];
                if (!p.color) p.color = "#34d399";
                if (!p.layer) p.layer = "application";
                if (!p.plant) p.plant = "sprout";
                if (!p.status) p.status = "active";
                if (!p.category) p.category = "custom";
            }
            garden.loadProtocols({ protocols: arr });
            garden.updateStats();
            buildCatSelect();
            resetAll();
            toast(T("import.ok", `Загружено протоколов: {n} (до перезагрузки страницы)`).replace("{n}", arr.length));
        } catch (err) {
            toast(T("import.fail", "Не получилось прочитать файл: нужен JSON из экспорта"));
        }
        e.target.value = "";
    };
    rd.readAsText(f);
});

// deep-link #rfc0793 — хэш захватываем ДО resetAll:
// resetAll → apply → closeCard чистит его через replaceState при старте
const initialHash = (() => { try { return location.hash || ""; } catch (e) { return ""; } })();
function fromHash() {
    const src = initialHash || location.hash;
    const m = (src || "").match(/^#([A-Za-z0-9-]+)$/);
    if (!m) return;
    const target = protocolsData.protocols.find(
        (x) => x.id.toLowerCase() === m[1].toLowerCase());
    if (target) setTimeout(() => openCard(target), 400);
}

buildCatSelect();
resetAll();

// состояние из URL: фильтры + камера (для ссылок «поделиться»)
(function applyUrlState() {
    let urlParams = null;
    try { urlParams = new URLSearchParams(location.search); }
    catch (e) { return; }
    if (!urlParams) return;
    const st = urlParams.get("status");
    if (st && ["active", "changed", "legacy"].includes(st)) statusFilter = st;
    const layerFromUrl = urlParams.get("layer");
    if (layerFromUrl && protocolsData.protocols.some((p) => p.layer === layerFromUrl))
        layerFilter = layerFromUrl;
    const cat = urlParams.get("cat");
    if (cat && protocolsData.protocols.some((p) => p.category === cat)) {
        catFilter = cat;
        if ($("catSelect")) $("catSelect").value = cat;
    }
    const q = urlParams.get("q");
    if (q) $("searchBox").value = q;
    // ручной тир качества: ?perf=low|med|high (для слабых устройств и тестов)
    const perf = urlParams.get("perf");
    if (perf && garden.setQuality) garden.setQuality(perf, true);
    // на узких экранах стартуем с общим планом (если нет сохранённого вида/хеша)
    if (!location.hash && !urlParams.get("view") && garden.w && garden.w < 700) garden.fitView();
    if (st || layerFromUrl || cat || q) { syncChips(); apply(); }
    const v = urlParams.get("view");
    if (v) {
        const parts = v.split(",").map(Number);
        if (parts.length === 3 && parts.every(isFinite)) {
            garden.view.x = parts[0];
            garden.view.y = parts[1];
            garden.view.s = Math.max(.45, Math.min(3.2, parts[2]));
        }
    }
})();

fromHash();
})();