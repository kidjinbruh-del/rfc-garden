// anim.js — пауза фоновых анимаций и отклик на палец. Подключается везде.
//
// Почему отдельный файл, а не часть motion.js: motion.js не грузится на
// главной (там main.js), а бегущая строка, шар и переливы заголовка —
// как раз на главной. Общая реализация нужна обеим системам, а лишний
// запрос в ~700 байт после gzip дешевле дублирования кода в двух файлах.
(function () {
"use strict";

var html = document.documentElement;

// --- 1. Пауза, когда анимацию не видно -----------------------------------
//
// Бегущая строка, светящийся шар и переливы заголовка крутятся бесконечно.
// На телефоне это чистая перерисовка впустую: вкладку свернули — анимации
// продолжают идти, греют корпус и садят батарею, а браузер потом выгружает
// вкладку целиком. Останавливаем их в двух случаях: документ скрыт и
// элемент уехал из экрана.
try {
    document.addEventListener("visibilitychange", function () {
        html.classList.toggle("anim-paused", !!document.hidden);
    });
} catch (e) {}

try {
    if (typeof IntersectionObserver !== "undefined") {
        var io = new IntersectionObserver(function (entries) {
            for (var i = 0; i < entries.length; i++) {
                entries[i].target.classList.toggle(
                    "anim-off", !entries[i].isIntersecting
                );
            }
        }, { threshold: 0 });
        var watched = document.querySelectorAll(
            ".marquee, .hero, .hero-orb, .hero-stats, .hero-content, .grain"
        );
        for (var j = 0; j < watched.length; j++) io.observe(watched[j]);
    }
} catch (e2) {}

// --- 2. Отклик на палец ---------------------------------------------------
//
// На сенсорных экранах :hover не срабатывает: кнопка и чик нажимаются, но
// визуально ничем не отвечают. Добавляем состояние «палец нажат», чтобы
// отличать нажатие от залипания после него.
try {
    var release = function () { html.classList.remove("is-pressing"); };
    document.addEventListener("pointerdown", function () {
        html.classList.add("is-pressing");
    }, true);
    document.addEventListener("pointerup", release, true);
    document.addEventListener("pointercancel", release, true);
    document.addEventListener("touchend", release, true);
    window.addEventListener("blur", release);
    // Подстраховка: если событие потерялось (палец увел за край экрана),
    // класс не должен остаться навсегда.
    setTimeout(release, 2500);
} catch (e3) {}
})();