# Changelog — RFC Garden

Формат: [Keep a Changelog](https://keepachangelog.com/). Версии: [Semantic Versioning](https://semver.org/).
Format: Keep a Changelog. Versioning: Semantic Versioning.

## [Unreleased]

## [1.2.0] - 2026-09-13
### Added
- Motion-система на всех страницах: `motion.js`, 8 вариантов (`deck/bloom/axis/pop/bars/reading/sheet/steps`), бегущая строка 72 имён под навбаром.
- `glossary.html`: 88 терминов, поиск, алфавит RU+EN.
- Режим «Диагноз» в квизе (5 сценариев поломок).
- `achievements.js` (8 ачивок гербария), `progress.js` (виджет «Изучено N из 72»).
- Techno-flora v5: L-системы + Perlin, оптоволоконные стебли, кристаллы, стеклянные плоды; FLORA-ручки и `flora-lab.html`.
- Skip-links, print-правила, `content-visibility` для длинных списков.
- Herbarium entrance главной: blur H1, letter-spacing подзаголовка, bounce кнопок, каскад иконок, click-ripple.
- `docs/` (7 документов), issue/PR-шаблоны, `deploy.yml`.
- `tests/check-achievements.js` (11-я сюита).
### Changed
- Сад: спрайт-кэш тел растений, culling за кадром, LOD сока (+49% FPS на софтверном рендере).
- Интро-оверлей убран с главной; текст появляется каскадом с воротами от FOUT.
### Fixed
- Deep-link холодного старта (`resetAll` стирал хэш раньше `fromHash`).
- Порог reveal для контейнеров выше вьюпорта; схлопнутые бары статистики; TDZ-краш `spr`.
- Навбар на мобильных (горизонтальный скролл меню); fixed-элементы сада под полосой.

## [1.1.0] - 2026-09-13
### Added
- NetPulse-демо (`demo.html` + evidence).
- Справочник Linux (100+ карточек), Programming, Virtualization (`handbook.js`).

## [1.0.0] - 2026-09-12
### Added
- Первая публичная версия: 72 объекта, 7 ярусов OSI, Canvas-сад, тёмная/светлая тема, `file://` без сборки.
- Энциклопедия (72 паспорта), статьи, таймлайн, квиз, экзамен, тур, сравнение, путь пакета, избранное.
- Шпаргалка, статистика, лабораторные, гайды, i18n RU/EN, SVG-иконки вместо эмодзи.
- CI (GitHub Actions), MIT.
