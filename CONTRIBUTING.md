# CONTRIBUTING — RFC Garden

[Русский](#ru) · [English](#en)

<a id="ru"></a>
## Русский

### Как помочь
- **Контент**: новые растения (протоколы, железо, ОС) — см. «Как добавить протокол».
- **Код**: баги, производительность, доступность, новые режимы из [IDEAS.md](IDEAS.md).
- **Переводы**: словарь в `js/i18n.js` (ключи `data-i18n` обязаны существовать — проверяет `check-i18n`).
- **Дизайн**: палитры, motion-варианты, иконки в `js/icons.js`.

### Коммиты — Conventional Commits
```
feat: краткое описание          # новая фича
fix: краткое описание           # багфикс
docs: ...                       # доки/README
test: ...                       # тесты
perf: ...                       # производительность
refactor: ...                   # рефакторинг без смены поведения
```
Область приветствуется: `feat(garden): ...`, `fix(i18n): ...`. Один коммит — одна тема.

### Pull Request
1. Форк → ветка `feat/что-то` или `fix/что-то`.
2. `node tests/run-all.js` — все сюиты зелёные.
3. В описании PR: что сделано, как проверить (страница + шаги), скриншот до/после для визуала.
4. Не ломать: статику (`file://`), тесты-стабы (везде guards + `try/catch`), i18n-первенство скрипта.

### Тесты
```bash
node tests/run-all.js          # всё (11 сюит)
node tests/check-achievements.js  # одна сюита
```
Новый JS-модуль — только `querySelector*` для DOM (не `getElementById`: его отслеживает `check-ids`), без обращений к несуществующим API без `typeof`-гардов.

### Как добавить протокол
1. Объект в `PROTOCOLS.json` **и** `js/data.js` (синхронно): `id, number, name, fullName, year, status, layer, category, plant, description, where, fact, dependsOn, usedBy, replaces, replacedBy, color`.
2. Паспорт в `js/profiles.js` (история, разновидности, практика, квиз).
3. Ключи EN — в `js/i18n.js`, если добавляешь `data-i18n`.
4. `node tests/run-all.js` (счётчики 72 обновятся сами — данные refactor-friendly).

### Как добавить растение (новый визуальный тип)
1. Геометрия — в `_buildGeo(type)` (`js/garden.js`), отрисовка — метод `drawX()`.
2. Ключ в `_floraSig()` (иначе спрайт-кэш вернёт чужое тело).
3. Проверь `flora-lab.html` глазами + `perf-smoke` (≥30 FPS).

### Стиль кода
- ES2017+, без модулей; `try/catch` вокруг всего DOM; русские комментарии по делу, без воды.
- CSS: токены из `:root`, никаких `!important` без причины; анимации только `transform`/`opacity` (+ `translate` для axis-кейсов).
- Никаких эмодзи в UI — только SVG из `js/icons.js`.

### Контакты
Вопросы — в GitHub Issues. Автор: Трофимов Петр.

---

<a id="en"></a>
## English

### How to help
- **Content**: new plants (protocols, hardware, OS) — see below.
- **Code**: bugs, performance, accessibility, modes from [IDEAS.md](IDEAS.md).
- **Translations**: dictionary in `js/i18n.js` (every `data-i18n` key must exist — enforced by `check-i18n`).
- **Design**: palettes, motion variants, icons in `js/icons.js`.

### Commits — Conventional Commits
Same format as above (`feat:`, `fix:`, `docs:`, `test:`, `perf:`, `refactor:`), scope welcome (`feat(garden): ...`). One commit — one topic.

### Pull Requests
1. Fork → branch `feat/something` or `fix/something`.
2. `node tests/run-all.js` — all suites green.
3. PR description: what, how to verify (page + steps), before/after screenshot for visuals.
4. Don't break: static `file://` usage, test stubs (guards + `try/catch` everywhere), i18n-first script order.

### Tests
```bash
node tests/run-all.js
```
New JS modules: `querySelector*` only (never `getElementById` — tracked by `check-ids`), `typeof`-guards for any API that may not exist.

### How to add a protocol
1. Object in `PROTOCOLS.json` **and** `js/data.js` (in sync): `id, number, name, fullName, year, status, layer, category, plant, description, where, fact, dependsOn, usedBy, replaces, replacedBy, color`.
2. Profile in `js/profiles.js` (history, varieties, practice, quiz).
3. EN keys in `js/i18n.js` for any new `data-i18n`.
4. `node tests/run-all.js`.

### How to add a plant type
1. Geometry in `_buildGeo(type)`, renderer `drawX()` (`js/garden.js`).
2. Key in `_floraSig()` (or the sprite cache will serve a foreign body).
3. Eyeball `flora-lab.html` + `perf-smoke` (≥30 FPS).

### Code style
- ES2017+, no modules; `try/catch` around all DOM; concise comments.
- CSS: `:root` tokens, no `!important` without reason; animate `transform`/`opacity` only (+ `translate` for axis cases).
- No emojis in UI — SVG from `js/icons.js` only.

### Contacts
Questions — GitHub Issues. Author: Petr Trofimov.
