/* theme.js — переключение и сохранение темы */
(function () {
    function apply(t) {
        // Атрибут ставится в обоих случаях, а не только для тёмной темы.
        //
        // Значения переменных лежат так: тёмные — в :root, светлые — в
        // [data-theme="light"]. Если светлую тему обозначать ОТСУТСТВИЕМ
        // атрибута, то страница берёт :root, то есть остаётся тёмной, а код,
        // который спрашивает тему через getAttribute("data-theme") === "dark"
        // (garden.js, explore.js), считает её светлой и рисует светлый сад
        // внутри тёмной страницы. На телефоне с светлой системой это и было
        // видно: белёсый прямоугольник с подписями протоколов поверх
        // заголовка, который не читается.
        document.body.setAttribute("data-theme", t);
        const btn = document.getElementById("themeToggle");
        if (btn) btn.innerHTML = t === "dark"
            ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.3 11.3l1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.3-11.3l1.4-1.4"/></svg>'
            : '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/></svg>';
    }
    function current() { return localStorage.getItem("rfc-garden-theme")
        || (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"); }
    apply(current());
    document.addEventListener("DOMContentLoaded", () => {
        apply(current());
        const btn = document.getElementById("themeToggle");
        if (btn) btn.addEventListener("click", () => {
            const t = document.body.getAttribute("data-theme") === "dark" ? "light" : "dark";
            localStorage.setItem("rfc-garden-theme", t);
            apply(t);
        });
    });
})();