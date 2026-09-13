# ARCHITECTURE / Архитектура

## RU
Статика без сборки: HTML-страницы + один `css/style.css` + классические скрипты (без модулей, порядок важен — `i18n.js` всегда первый).

- **Данные**: `js/data.js` (72 объекта, source of truth) + `js/profiles.js` (паспорта) + `PROTOCOLS.json` (экспорт, синхронность проверяет `check-data`).
- **Движок сада** (`js/garden.js`, класс `ProtocolGarden`): layout по 7 ярусам OSI → рёбра (`_relink`) → кадр: фон → связи → частицы → растения → подписи. Тела запекаются в спрайты (ключ `_floraSig`), culling за кадром, LOD.
- **Страницы**: `explore.js` (состояние фильтров/карточек), `main.js` (главная), `motion.js` (все остальные: полоса, reveal, glow, прогресс), `handbook.js` (3 справочника), `theme.js`, инлайн-скрипты (timeline/stats/quiz/cheatsheet/encyclopedia).
- **Прогресс**: `achievements.js` слушает сад через хэш+MutationObserver (explore.js не правится); `progress.js` только читает localStorage.
- **Состояние в URL**: `#id` (deep-link), `?layer/?view` (explore), `?perf=` (тир качества).
- **Тесты**: 11 сюит на чистом Node (`vm` + стабы DOM/canvas), CI на push.

## EN
Static site, no build: pages + one `css/style.css` + classic scripts (order matters — `i18n.js` first).

- **Data**: `js/data.js` (72 objects, source of truth) + `js/profiles.js` + `PROTOCOLS.json` (sync enforced by `check-data`).
- **Engine** (`js/garden.js`, `ProtocolGarden`): 7-tier OSI layout → edges (`_relink`) → frame: background → edges → particles → plants → labels. Bodies baked to sprites (`_floraSig` key), offscreen culling, LOD.
- **Pages**: `explore.js` (filters/cards state), `main.js` (home), `motion.js` (all other pages), `handbook.js`, `theme.js`, inline builders.
- **Progress**: `achievements.js` observes via hash+MutationObserver (never patches `explore.js`); `progress.js` reads localStorage.
- **URL state**: `#id`, `?layer/?view`, `?perf=`.
- **Tests**: 11 suites on plain Node (`vm` + stubs), CI on push.
