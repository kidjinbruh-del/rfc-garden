# VISUAL / Визуал

## RU
- **Палитра**: фон `#0a0f12`, текст `#e6edf3`, акцент изумруд `#34d399`; растения — свой цвет + общее жемчужное ядро `#dff6ff` (единство палитры).
- **Растения**: L-системы + Perlin-шум, запечённые в геокэш; стебель-труба (ореол → тело → ядро), кристаллы-кайты с гранями и бликом, стеклянные орбы, LED-точки, бегущие импульсы.
- **Фон**: вертикальный градиент, 2 туманности, 90 звёзд, сетка, виньетка.
- **Motion**: только `transform`/`opacity` (+ `translate` для axis); каскады 70мс; тиры low/med/high; `prefers-reduced-motion` гасит всё.
- **Типографика**: Inter (текст) + JetBrains Mono (цифры/код); ворота `html.ready` против FOUT.
- **Иконки**: 70 SVG, stroke 1.5px (`js/icons.js`). Эмодзи в UI запрещены.

## EN
- **Palette**: bg `#0a0f12`, text `#e6edf3`, accent emerald `#34d399`; plants — own color + shared pearl core `#dff6ff`.
- **Plants**: L-systems + Perlin noise baked to geo-cache; tube stems (halo → body → core), faceted kite crystals, glass orbs, LED dots, travelling pulses.
- **Background**: vertical gradient, 2 nebulae, 90 stars, grid, vignette.
- **Motion**: `transform`/`opacity` only (+ `translate` for axis); 70ms cascades; low/med/high tiers; `prefers-reduced-motion` kills everything.
- **Type**: Inter + JetBrains Mono; `html.ready` gate against FOUT.
- **Icons**: 70 SVGs, 1.5px stroke. No emojis in UI.
