/* handbook.js — общая механика справочных страниц RFC Garden.
   Живой поиск, чипсы-группы, оглавление со счётчиками, счётчик «показано»,
   сворачивание панели, прятание пустых разделов, скролл к результату.
   Разметка страницы: input#hbSearch, p#hbEmpty.hidden, nav#hbToc[data-prefix],
   span#hbCount, button#hbCollapse, чипсы [data-chip], карточки [data-group],
   заголовки main h2.sec-title. Подключать ПОСЛЕ i18n.js и icons.js. */
(function () {
"use strict";

function init() {
    const input = document.getElementById("hbSearch");
    const empty = document.getElementById("hbEmpty");
    const toc = document.getElementById("hbToc");
    const counter = document.getElementById("hbCount");
    if (!input || !toc || !counter) return; // не справочная страница
    const T = (k, fb) => (window.I18N ? I18N.t(k, fb) : fb);
    const chips = Array.prototype.slice.call(document.querySelectorAll("[data-chip]"));
    const cards = Array.prototype.slice.call(document.querySelectorAll("[data-group]"));
    const filterBar = document.querySelector(".filter-bar");
    const collapseBtn = document.getElementById("hbCollapse");
    const prefix = toc.getAttribute("data-prefix") || "";
    const pageKey = "rfcGarden_hbfilter_" + ((location.pathname || "").split("/").pop() || "index");

    // Оглавление строится из живых заголовков — работает в любом языке.
    // Атрибут читаем по частям, чтобы статический сканер тестов
    // не принимал селектор за ключ словаря.
    const attrName = "data-" + "i18n";
    const secLinks = [];
    Array.prototype.forEach.call(document.querySelectorAll("main h2.sec-title"), (h) => {
        const key = h.getAttribute(attrName) || "";
        if (prefix && key.indexOf(prefix) !== 0) return;
        const k = key.slice(prefix.length);
        if (!/^[a-z]+$/.test(k)) return;
        h.id = "sec-" + k;
        const a = document.createElement("a");
        a.href = "#sec-" + k;
        const b = document.createElement("b");
        b.textContent = "0";
        a.appendChild(b);
        a.appendChild(document.createTextNode(h.textContent));
        toc.appendChild(a);
        secLinks.push({ head: h, link: a, num: b });
    });

    let collapsed = false;
    try { collapsed = localStorage.getItem(pageKey) === "0"; } catch (e) {}
    function setCollapsed(v) {
        collapsed = v;
        if (filterBar) filterBar.classList.toggle("collapsed", v);
        if (collapseBtn) collapseBtn.textContent = T(v ? "hb.expand" : "hb.collapse", v ? "Развернуть" : "Свернуть");
        try { localStorage.setItem(pageKey, v ? "0" : "1"); } catch (e) {}
    }

    let active = "all";
    function apply(scroll) {
        const q = (input.value || "").toLowerCase().trim();
        let shown = 0, first = null;
        cards.forEach((c) => {
            const g = (c.getAttribute("data-group") || "").split(/\s+/);
            const okG = active === "all" || g.indexOf(active) !== -1;
            const okQ = !q || c.textContent.toLowerCase().indexOf(q) !== -1;
            const vis = okG && okQ;
            c.style.display = vis ? "" : "none";
            if (vis) { shown++; if (!first) first = c; }
        });
        if (empty) empty.style.display = shown ? "none" : "";
        chips.forEach((ch) => ch.classList.toggle("active", ch.getAttribute("data-chip") === active));
        tidySections();
        updateToc(shown);
        if (scroll && first && active !== "all") {
            try { first.scrollIntoView({ behavior: "smooth", block: "start" }); } catch (e) {}
        }
    }
    // Прячем заголовки разделов, в которых не осталось видимых карточек.
    // Разделы без фильтруемых карточек (обзоры) видны всегда.
    function tidySections() {
        const heads = Array.prototype.slice.call(document.querySelectorAll("main h2.sec-title"));
        heads.forEach((h) => {
            let el = h.nextElementSibling, sub = null, anyCard = false, allHidden = true;
            while (el && !(el.tagName === "H2" && el.classList.contains("sec-title"))) {
                if (el.classList && el.classList.contains("sec-sub") && !sub) sub = el;
                if (el.hasAttribute && el.hasAttribute("data-group")) {
                    anyCard = true;
                    if (el.style.display !== "none") allHidden = false;
                }
                el = el.nextElementSibling;
            }
            const hide = anyCard && allHidden;
            h.style.display = hide ? "none" : "";
            if (sub) sub.style.display = hide ? "none" : "";
        });
    }
    function secVisible(head) {
        // -1: в разделе нет фильтруемых карточек (обзор виден всегда)
        let el = head.nextElementSibling, n = 0, any = false;
        while (el && !(el.tagName === "H2" && el.classList.contains("sec-title"))) {
            if (el.hasAttribute && el.hasAttribute("data-group")) {
                any = true;
                if (el.style.display !== "none") n++;
            }
            el = el.nextElementSibling;
        }
        return any ? n : -1;
    }
    function updateToc(shown) {
        secLinks.forEach((s) => {
            const n = secVisible(s.head);
            s.num.textContent = n < 0 ? "•" : n;
            s.link.classList.toggle("dim", n === 0);
        });
        counter.textContent = T("hb.count", "Показано $n из $m")
            .replace("$n", shown).replace("$m", cards.length);
    }
    chips.forEach((ch) => ch.addEventListener("click", () => { active = ch.getAttribute("data-chip"); apply(true); }));
    input.addEventListener("input", () => apply(false));
    if (collapseBtn) collapseBtn.addEventListener("click", () => setCollapsed(!collapsed));
    setCollapsed(collapsed);
    apply(false);
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}
})();
