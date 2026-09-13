# DATA / Данные

## RU
Источник истины — `js/data.js` (`protocolsData.protocols`, 72 объекта). `PROTOCOLS.json` — экспорт той же структуры (обновлять синхронно).

Поля объекта:
- `id` (string, напр. `"rfc0793"`), `number` (RFC-номер или `null` у сущностей), `name`, `fullName`, `year`, `status` (`active|updated|legacy`), `layer` (7 ярусов OSI), `category`, `plant` (`tree|vine|flower|mushroom|sprout`), `description`, `where`, `fact`, `color` (hex).
- Связи: `dependsOn[]`, `usedBy[]`, `replaces[]`, `replacedBy[]` — id из того же списка.
- Сущности (железо/ОС/...): `number: null` + `url` (внешний источник).

Пример:
```json
{ "id": "rfc0793", "number": 793, "name": "TCP", "year": 1981,
  "status": "active", "layer": "transport", "plant": "vine",
  "dependsOn": ["rfc0791"], "usedBy": ["rfc2616"], "color": "#2196F3" }
```

Паспорта энциклопедии — `js/profiles.js` (`PROFILES[id]`: origin, how, varieties[], practice[], quiz[]).

## EN
Source of truth — `js/data.js` (72 objects). `PROTOCOLS.json` mirrors it (keep in sync).

Fields: `id`, `number` (RFC number or `null` for entities), `name`, `fullName`, `year`, `status` (`active|updated|legacy`), `layer` (7 OSI tiers), `category`, `plant` (`tree|vine|flower|mushroom|sprout`), `description`, `where`, `fact`, `color` (hex). Relations: `dependsOn[]`, `usedBy[]`, `replaces[]`, `replacedBy[]`. Entities add `url`. Example above. Encyclopedia profiles — `js/profiles.js`.
