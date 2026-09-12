// main.js — логика главной страницы
(function () {
"use strict";

if (document.getElementById('gardenCanvas') && typeof ProtocolGarden !== 'undefined') {
    const garden = new ProtocolGarden('gardenCanvas');
    window.rfcGarden = garden;
    garden.loadProtocols(protocolsData);

    // ручной тир качества: ?perf=low|med|high (для слабых устройств и тестов)
    try {
        const perf = new URLSearchParams(location.search).get("perf");
        if (perf && garden.setQuality) garden.setQuality(perf, true);
    } catch (e) {}

    garden.start();

    // при сворачивании/прокрутке страницы останавливаем hero-сад, чтобы не тратить CPU
    if (typeof IntersectionObserver !== "undefined") {
        const hero = document.getElementById('gardenCanvas');
        if (hero) {
            const io = new IntersectionObserver((entries) => {
                const visible = entries.some((e) => e.isIntersecting);
                if (visible && !garden.animationId) garden.start();
                else if (!visible && garden.animationId) garden.stop();
            }, { rootMargin: "200px" });
            io.observe(hero);
            garden._io = io;
        }
    }
}

function animateValue(el, end, duration) {
    const t0 = performance.now();
    (function step(t) {
        const k = Math.min((t - t0) / duration, 1);
        el.textContent = Math.floor(k * end);
        if (k < 1) requestAnimationFrame(step);
    })(performance.now());
}

setTimeout(() => {
    const pc = document.getElementById('protocolCount');
    const cc = document.getElementById('connectionCount');
    if (!pc || pc.textContent === '0') {
        let conn = 0;
        protocolsData.protocols.forEach(p => conn += (p.dependsOn?.length || 0));
        animateValue(pc, protocolsData.protocols.length, 1400);
        animateValue(cc, conn, 1400);
    }
}, 900);

document.querySelectorAll('.layer-card').forEach((card) => {
    const url = new URL(card.href);
    const layer = url.searchParams.get('layer');
    if (!layer) return;
    const n = protocolsData.protocols.filter((p) => p.layer === layer).length;
    const span = card.querySelector('.lc-count');
    if (span) span.textContent = n + " " + I18N.t("main.protocols", "объектов");
});

console.log('RFC Garden: главная инициализирована');
})();
