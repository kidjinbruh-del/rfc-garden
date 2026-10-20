// promo-intro.js — skippable cinematic intro on the home page.
// Plays promo.html once per tab, then reveals the live garden. `?promo=1`
// forces a replay, `?skipPromo=1` bypasses it.
(function () {
    "use strict";

    const root = document.documentElement;
    if (!root.classList.contains("promo-intro")) return;

    const layer = document.getElementById("promoIntro");
    const frame = document.getElementById("promoFrame");
    const skip = document.getElementById("promoSkip");
    if (!layer || !frame || !skip) return;

    const GARDEN_SEEN = "rfc-garden-promo-seen";
    let closed = false;
    let timer = 0;
    let loaded = false;
    const failTimer = setTimeout(() => {
        if (!loaded) close(false);
    }, 6000);

    try {
        if (window.rfcGarden && window.rfcGarden.stop) window.rfcGarden.stop();
    } catch (e) {}

    function close(markSeen) {
        if (closed) return;
        closed = true;
        clearTimeout(timer);
        clearTimeout(failTimer);
        if (markSeen !== false) {
            try { sessionStorage.setItem(GARDEN_SEEN, "1"); } catch (e) {}
        }
        layer.classList.add("out");
        try { skip.blur(); } catch (e) {}
        setTimeout(() => {
            try { layer.remove(); } catch (e) {}
            root.classList.remove("promo-intro");
            try {
                if (window.rfcGarden && window.rfcGarden.start) window.rfcGarden.start();
            } catch (e) {}
        }, 560);
    }

    frame.src = frame.getAttribute("data-src") || "promo.html?embed=1";
    frame.addEventListener("load", () => {
        loaded = true;
        clearTimeout(failTimer);
    });
    skip.addEventListener("click", close);
    window.addEventListener("keydown", (e) => {
        if (e.key === "Escape") close();
    });
    window.addEventListener("message", (e) => {
        if (e.source !== frame.contentWindow) return;
        if (e.data && e.data.type === "rfc-promo-done") close();
    });
    frame.addEventListener("error", () => close(false));

    timer = setTimeout(close, 12600);
    setTimeout(() => {
        if (!closed) {
            try { skip.focus({ preventScroll: true }); } catch (e) {}
        }
    }, 300);
})();
