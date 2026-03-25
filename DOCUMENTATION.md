# Battle Library Tool — Полная документация

## 1. СТРУКТУРА ПРОЕКТА

```
battle-library/
├── client/                        # Фронтенд (React + TypeScript + Vite)
│   └── src/
│       ├── App.tsx                # Роутинг: /, /replays, /admin
│       ├── main.tsx               # Точка входа React
│       ├── index.css              # Глобальные стили + CSS переменные темы
│       ├── components/
│       │   ├── BattleCard.tsx     # Карточка боя (ID, команда, тип, powerLevel, тотемы)
│       │   ├── ReplayCard.tsx     # Карточка записи (грейды фрагментов, питомцы)
│       │   ├── GroupedReplayCard.tsx  # Группа записей с одним составом
│       │   ├── BattleFilters.tsx  # Фильтры: тип, глава, поиск, теги
│       │   ├── CollectionSidebar.tsx  # Панель коллекции (7 глав × 8 слотов)
│       │   ├── AddToCollectionModal.tsx # Модальное добавление в коллекцию
│       │   ├── TagsModal.tsx      # Управление тегами боёв
│       │   ├── DataUploader.tsx   # Загрузка данных в админке
│       │   ├── EntityViewer.tsx   # Просмотр всех сущностей с поиском
│       │   ├── MultiSelect.tsx    # Компонент мультиселекта
│       │   └── ThemeToggle.tsx    # Переключатель тёмной/светлой темы
│       ├── pages/
│       │   ├── BattleLibrary.tsx  # Главная страница: бои + записи
│       │   ├── ReplayLibrary.tsx  # Страница записей
│       │   ├── AdminPanel.tsx     # Панель администратора
│       │   └── not-found.tsx      # 404
│       └── lib/
│           ├── battleUtils.ts     # Парсинг боёв, расчёт тотемов, сортировка
│           ├── replayUtils.ts     # Обработка записей, грейды фрагментов
│           ├── heroNames.ts       # Встроенный справочник имён (196 персонажей)
│           ├── queryClient.ts     # TanStack Query + apiRequest
│           └── utils.ts           # cn() helper
├── server/
│   ├── index.ts                   # Запуск Express + Vite dev server
│   ├── routes.ts                  # Все API endpoints
│   ├── storage.ts                 # CRUD интерфейс к PostgreSQL (Drizzle ORM)
│   ├── db.ts                      # Подключение к PostgreSQL
│   ├── vite.ts                    # Vite middleware для разработки
│   └── static.ts                  # Отдача статики в production
├── shared/
│   └── schema.ts                  # Drizzle схема + TypeScript типы (общие для фронт+бэк)
├── scripts/
│   ├── export-data.js             # Экспорт всех данных в JSON
│   └── export-icons.js            # Экспорт иконок в файловую систему
├── drizzle.config.ts              # Конфиг Drizzle ORM
├── vite.config.ts                 # Конфиг Vite
├── tailwind.config.ts             # Конфиг Tailwind CSS
└── package.json                   # Зависимости
```

---

## 2. ТЕХНОЛОГИЧЕСКИЙ СТЕК

### Фронтенд
| Технология | Версия | Зачем |
|---|---|---|
| **React** | 18 | UI фреймворк |
| **TypeScript** | 5 | Типизация |
| **Vite** | 5 | Сборщик + dev server |
| **Tailwind CSS** | 3 | Утилитарные стили |
| **Shadcn/ui** | — | Готовые компоненты (Button, Dialog, Select...) |
| **TanStack Query** | v5 | Загрузка и кэш данных с сервера |
| **Wouter** | — | Лёгкий клиентский роутер |

### Бэкенд
| Технология | Зачем |
|---|---|
| **Node.js + Express** | HTTP сервер |
| **Drizzle ORM** | Type-safe запросы к PostgreSQL |
| **PostgreSQL (Neon)** | База данных |
| **Zod** | Валидация входящих данных |

> **Для GAS-миграции:** Фронтенд нужно переписать на vanilla JS (GAS не поддерживает JSX/React). Бэкенд → Code.js в GAS. БД → Google Sheets.

---

## 3. СХЕМА БАЗЫ ДАННЫХ

### Таблица: `boss_list` (417 записей)
Основная таблица боёв.

| Поле | Тип SQL | Пример | Описание |
|---|---|---|---|
| `id` | SERIAL PK | 1 | Авто-ID |
| `game_id` | INTEGER UNIQUE | 562 | ID боя в игре |
| `label` | TEXT | "Глава 1 (Флафи)" | Название главы |
| `desc` | TEXT | "Бой 1" | Номер боя |
| `hero_id` | INTEGER | 62 | ID главного героя/босса |
| `defenders_fragments` | TEXT | `{"units":[...]...}` | JSON (если запись создана из replay) |

**Ключи:** `game_id` связывает с `boss_team.boss_game_id` и `boss_level.boss_id`

**Фильтр при отображении:** `game_id > 226` (устаревшие исключаются) и `defenders_fragments IS NULL` (исключаются записи-реплеи)

---

### Таблица: `boss_team` (1807 записей)
Состав команды противников для каждого боя.

| Поле | Тип SQL | Пример | Описание |
|---|---|---|---|
| `id` | SERIAL PK | 1 | Авто-ID |
| `boss_game_id` | INTEGER | 562 | → boss_list.game_id |
| `hero_id` | INTEGER | 26 | ID персонажа (из game data) |
| `unit_id` | INTEGER | 26 | ID юнита (совпадает с hero_id) |
| `boss_level_id` | INTEGER | 1205 | → boss_level.game_id |

**Связи:** `boss_game_id → boss_list.game_id`, `boss_level_id → boss_level.game_id`

---

### Таблица: `boss_level` (402 записи)
Уровни сложности (профили) боёв с силой противника.

| Поле | Тип SQL | Пример | Описание |
|---|---|---|---|
| `id` | SERIAL PK | 1 | Авто-ID |
| `game_id` | INTEGER UNIQUE | 1205 | ID профиля уровня |
| `boss_id` | INTEGER | 562 | → boss_list.game_id |
| `power_level` | INTEGER | 225 | Уровень силы команды |

**Связи:** `boss_id → boss_list.game_id`

---

### Таблица: `hero_icons` (184 записи)
Иконки персонажей (герои, крипы, титаны) в формате base64.

| Поле | Тип SQL | Пример | Описание |
|---|---|---|---|
| `id` | SERIAL PK | 1 | Авто-ID |
| `hero_id` | INTEGER UNIQUE | 26 | ID персонажа |
| `icon_url` | TEXT | `data:image/png;base64,...` | Base64 изображение (~50-200 KB) |
| `category` | TEXT | "hero" / "titan" / "krip" | Категория |

**Категории:** `hero` (1-999), `krip` (1000-3999), `titan` (4000-5999)
**Объём:** ~184 иконки × ~100KB ≈ ~18MB в base64 — для GAS потребуется Google Drive

---

### Таблица: `hero_names` (198 записей)
Пользовательские имена персонажей (переопределяют встроенные).

| Поле | Тип SQL | Пример | Описание |
|---|---|---|---|
| `id` | SERIAL PK | 1 | Авто-ID |
| `hero_id` | INTEGER UNIQUE | 26 | ID персонажа |
| `name` | TEXT | "Флафи" | Имя персонажа |

---

### Таблица: `hero_sort_order` (182 записи)
Порядок сортировки персонажей в карточках боёв.

| Поле | Тип SQL | Пример | Описание |
|---|---|---|---|
| `id` | SERIAL PK | 1 | Авто-ID |
| `hero_id` | INTEGER UNIQUE | 26 | ID персонажа |
| `sort_order` | REAL | 4.5 | Позиция (поддерживает дробные) |

---

### Таблица: `titan_elements` (23 записи)
Стихии титанов для расчёта тотемов.

| Поле | Тип SQL | Пример | Описание |
|---|---|---|---|
| `id` | SERIAL PK | 1 | Авто-ID |
| `titan_id` | INTEGER UNIQUE | 4001 | ID титана (4000-4999) |
| `element` | TEXT | "вода" | вода/огонь/земля/тьма/свет |
| `points` | INTEGER | 3 | Очки стихии |

**Логика тотемов:** вода/огонь/земля активируются при ≥3 очках, тьма/свет при ≥2. Макс 2 тотема на бой.

---

### Таблица: `attack_teams` (227 записей)
Записи (replays) прохождений боёв.

| Поле | Тип SQL | Пример | Описание |
|---|---|---|---|
| `id` | SERIAL PK | 1 | Авто-ID |
| `game_id` | INTEGER UNIQUE | 10001 | ID записи в игре |
| `invasion_id` | INTEGER | 5 | ID вторжения |
| `boss_id` | INTEGER | 562 | → boss_list.game_id |
| `boss_level` | INTEGER | 1205 | → boss_level.game_id |
| `chapter` | INTEGER | 1 | Номер главы (1-7) |
| `level` | INTEGER | 3 | Номер боя в главе (1-8) |
| `enemy_type` | TEXT | "Герои" / "Титаны" | Тип противника |
| `main_buff` | INTEGER | 100 | Значение основного баффа |
| `comment` | TEXT | null | Комментарий |
| `defenders_fragments` | TEXT | `{"units":[26,64...]...}` | JSON состава команды |

**Структура `defenders_fragments`:**
```json
{
  "units": [26, 64, 13, 43, 34],
  "petId": 6005,
  "favor": { "13": 6003, "26": 6001 },
  "fragments": { "13": 7, "26": 5 },
  "spirits": {
    "water": { "elemental": 3001, "elementalLevel": 5 }
  },
  "effects": { "buffName": 100 }
}
```

---

### Таблица: `pet_icons` (10 записей)
Иконки питомцев.

| Поле | Тип SQL | Пример | Описание |
|---|---|---|---|
| `id` | SERIAL PK | 1 | Авто-ID |
| `pet_id` | INTEGER UNIQUE | 6005 | ID питомца (6000-6999) |
| `icon_url` | TEXT | `data:image/png;base64,...` | Base64 иконка |

---

### Таблица: `spirit_skills` (11 записей)
Названия скилов тотемов.

| Поле | Тип SQL | Пример | Описание |
|---|---|---|---|
| `id` | SERIAL PK | 1 | Авто-ID |
| `skill_id` | INTEGER UNIQUE | 3001 | ID скила |
| `name` | TEXT | "Водный щит" | Название скила |

---

### Таблица: `spirit_icons` (11 записей)
Иконки скилов тотемов.

| Поле | Тип SQL | Пример | Описание |
|---|---|---|---|
| `id` | SERIAL PK | 1 | Авто-ID |
| `skill_id` | INTEGER UNIQUE | 3001 | ID скила |
| `icon_url` | TEXT | `data:image/png;base64,...` | Base64 иконка |

---

### Таблица: `battle_tags` (4 записи)
Пользовательские теги боёв.

| Поле | Тип SQL | Пример | Описание |
|---|---|---|---|
| `id` | SERIAL PK | 1 | Авто-ID |
| `battle_game_id` | INTEGER | 562 | → boss_list.game_id |
| `tag` | TEXT | "вода" | Тег (#вода, #огонь...) |

---

### Таблица: `collection_items` (48 записей)
Серверная коллекция (7 глав × 8 слотов).

| Поле | Тип SQL | Пример | Описание |
|---|---|---|---|
| `id` | SERIAL PK | 1 | Авто-ID |
| `item_id` | TEXT UNIQUE | "battle_562_ch1_b1" | Уникальный ключ слота |
| `item_type` | TEXT | "battle" / "replay" | Тип элемента |
| `game_id` | INTEGER | 562 | ID боя/записи |
| `label` | TEXT | "Глава 1 (Флафи)" | Название |
| `desc` | TEXT | "Бой 1" | Описание |
| `battle_type` | TEXT | "heroic" / "titanic" | Тип боя |
| `team_json` | TEXT | `[{"heroId":26,...}]` | JSON состава |
| `raw_defenders_fragments` | TEXT | `{"units":[...]}` | Оригинальный JSON |
| `main_buff` | INTEGER | 100 | Основной бафф |
| `totems_json` | TEXT | `[{"element":"water"}]` | JSON тотемов |
| `boss_hero_id` | INTEGER | 62 | ID главного героя (для звёздочки) |
| `created_at` | BIGINT | 1774425028826 | Unix timestamp мс |

---

### Таблица: `app_settings` (1 запись)
Настройки приложения.

| Поле | Тип SQL | Пример | Описание |
|---|---|---|---|
| `id` | SERIAL PK | 1 | Авто-ID |
| `key` | TEXT UNIQUE | "mainBuffName" | Ключ настройки |
| `value` | TEXT | "Атака" | Значение |

---

## 4. API ENDPOINTS

### GET /api/health
**Описание:** Проверка работоспособности  
**Возвращает:** `{ status: "ok" }`

---

### GET /api/battles
**Описание:** Все данные для библиотеки боёв (главная страница)  
**Возвращает:**
```json
{
  "bossList": [...],          // boss_list (game_id > 226, без defenders_fragments)
  "bossTeam": [...],          // boss_team (все записи)
  "bossLevel": [...],         // boss_level (все записи)
  "heroIcons": [...],         // hero_icons (id, heroId, iconUrl, category)
  "heroNames": [...],         // hero_names (id, heroId, name)
  "heroSortOrder": [...],     // hero_sort_order (id, heroId, sortOrder)
  "titanElements": [...],     // titan_elements (id, titanId, element, points)
  "attackTeams": [...],       // attack_teams (все записи)
  "petIcons": [...],          // pet_icons (id, petId, iconUrl)
  "spiritSkills": [...],      // spirit_skills
  "spiritIcons": [...],       // spirit_icons
  "maxBossId": 600            // максимальный game_id в boss_list
}
```
**Нагрузка:** Иконки передаются как base64 — ответ может быть ~20-50MB

---

### GET /api/replays
**Описание:** Данные для страницы записей  
**Возвращает:**
```json
{
  "attackTeams": [...],
  "heroIcons": [...],
  "heroNames": [...],
  "petIcons": [...],
  "spiritSkills": [...],
  "spiritIcons": [...],
  "mainBuffName": "Атака"
}
```

---

### GET /api/admin/stats
**Описание:** Статистика загруженных данных  
**Возвращает:** Количество записей в каждой таблице + mainBuffName

---

### POST /api/admin/boss-list
**Принимает:** `Array<{ id: number, label?: string, desc?: string, heroId?: number, defendersFragments?: any }>`  
**Действие:** Очищает таблицу, вставляет новые записи (только id > 226)  
**Возвращает:** `{ success: true, count: N }`

---

### POST /api/admin/boss-team
**Принимает:** `Array<{ id: number, bossId?: number, heroId?: number, unitId?: number, bossLevelId?: number }>`  
**Действие:** Очищает таблицу, вставляет записи (только bossGameId > 226)

---

### POST /api/admin/boss-level
**Принимает:** `Array<{ id: number, bossLevel?: number, bossId?: number, powerLevel?: number, rowId?: number }>`  
**Действие:** Очищает таблицу, фильтрует актуальные (rowId > 1090 или id >= 101), дедупликация по game_id

---

### POST /api/admin/hero-icons
**Принимает:** `Array<{ heroId: number, iconUrl: string, category?: string }>`  
**Действие:** Upsert по heroId (обновляет если уже есть)

---

### POST /api/admin/hero-names
**Принимает:** `Array<{ heroId: number, name: string }>`  
**Действие:** Upsert по heroId

---

### POST /api/admin/hero-sort-order
**Принимает:** `Array<{ heroId: number, sortOrder: number }>`  
**Действие:** Очищает, вставляет новые

---

### POST /api/admin/titan-elements
**Принимает:** `Array<{ titanId: number, element: string, points: number }>`  
**Действие:** Очищает, вставляет новые

---

### POST /api/admin/attack-teams
**Принимает:** `Array<{ id, invasionId, bossId, bossLevel, Chapter, Level, enemyType, mainBuff, Comment, defendersFragments }>`  
**Действие:** Очищает, вставляет новые

---

### POST /api/admin/pet-icons
**Принимает:** `Array<{ petId: number, iconUrl: string }>`  
**Действие:** Upsert по petId

---

### POST /api/admin/spirit-skills
**Принимает:** `Array<{ skillId: number, name: string }>`  
**Действие:** Очищает, вставляет новые

---

### POST /api/admin/spirit-icons
**Принимает:** `Array<{ skillId: number, iconUrl: string }>`  
**Действие:** Upsert по skillId

---

### POST /api/admin/settings/main-buff
**Принимает:** `{ name: string }`  
**Действие:** Сохраняет название основного баффа

---

### GET /api/tags
**Возвращает:** `{ tags: BattleTag[], uniqueTags: string[] }`

### GET /api/tags/unique
**Возвращает:** `{ tags: string[] }` — только уникальные теги

### POST /api/tags/:battleGameId
**Принимает:** `{ tag: string }`  
**Действие:** Добавляет тег к бою

### DELETE /api/tags/:battleGameId/:tag
**Действие:** Удаляет тег с боя

---

### GET /api/collection
**Возвращает:** `CollectionItem[]` — все элементы коллекции

### POST /api/collection
**Принимает:** `{ itemId, itemType, gameId, label, desc, battleType, team, rawDefendersFragments, mainBuff, totems, bossHeroId }`  
**Действие:** Добавляет элемент в коллекцию

### DELETE /api/collection/:itemId
**Действие:** Удаляет элемент из коллекции

### DELETE /api/collection
**Действие:** Очищает всю коллекцию

---

## 5. БИЗНЕС-ЛОГИКА (важно для GAS миграции)

### Определение типа боя
```javascript
// Героический: hero_id вне диапазона 4000-4999
// Титанический: hero_id в диапазоне 4000-4999
const isTitanic = (heroId) => heroId >= 4000 && heroId <= 4999;
```

Для записей: проверяем юниты в `defenders.units`:
```javascript
const isTitanic = defenders.units.some(id => id >= 4000 && id <= 4999);
```

### Расчёт тотемов стихий
```javascript
// Пороги активации:
const THRESHOLDS = { вода: 3, огонь: 3, земля: 3, тьма: 2, свет: 2 };

// Для каждого противника-титана (4000-5999) суммируем очки по стихиям
// Берём максимум 2 стихии с наибольшим количеством очков
```

### Грейды фрагментов
```javascript
// purple:  1-2 фрагмента  → 🟣
// orange:  3-6 фрагментов → 🟠
// red:     7+ фрагментов  → 🔴
```

### Сортировка персонажей в карточке
По `hero_sort_order.sort_order` (поддерживает дробные 4.5). Без order — сортировка по hero_id.

### Структура коллекции
- 7 глав × 8 боёв = 56 слотов
- Экспорт: `{ "boss_1": gameId, "boss_2": gameId, ... "boss_56": gameId }`
- Нумерация: boss_1..boss_8 = Глава 1 боёв 1-8, boss_9..boss_16 = Глава 2, и т.д.

---

## 6. ИКОНКИ — ВАЖНО ДЛЯ МИГРАЦИИ

**Где хранятся:** В PostgreSQL в полях `icon_url` как base64 строки  
**Формат:** `data:image/png;base64,<данные>`  
**Объём:**
- hero_icons: 184 иконки (~18 MB суммарно)
- pet_icons: 10 иконок
- spirit_icons: 11 иконок
- **Итого:** ~200 иконок

**Для Google Apps Script:**
- Иконки нужно выгрузить как файлы (см. скрипт ниже)
- Загрузить в Google Drive в папки: `icons/heroes/`, `icons/titans/`, `icons/krips/`, `icons/pets/`
- В коде GAS использовать Drive.getFileById() или публичные ссылки

---

## 7. СКРИПТЫ ЭКСПОРТА

Запускайте из консоли Replit:

```bash
# Экспорт всех данных в JSON файлы (в папку exports/)
node scripts/export-data.js

# Экспорт иконок в файлы (в папку exports/icons/)
node scripts/export-icons.js
```

---

## 8. ОТВЕТЫ НА ВОПРОСЫ ПО МИГРАЦИИ В GAS

| Вопрос | Ответ |
|---|---|
| **Где хранятся иконки?** | В PostgreSQL как base64. Нужно выгрузить в Google Drive (~200 файлов, ~20MB). Запустите `node scripts/export-icons.js` |
| **Какая БД?** | PostgreSQL (Neon). Для GAS → Google Sheets: 1 таблица = 1 лист. Главное: boss_list, boss_team, boss_level, attack_teams |
| **Сложная серверная логика?** | Умеренная: расчёт тотемов, парсинг JSON, сортировка. Всё реализуемо в Code.js |
| **Какой фреймворк на фронте?** | React + TypeScript + Vite. Нужен полный рерайт на vanilla JS для GAS |
| **Почему React, не vanilla?** | Исторически — шаблон Replit. Для GAS это проблема — GAS HTML Service не поддерживает Node.js/JSX |

### Рекомендуемая структура листов Google Sheets для GAS:
```
Лист "boss_list":   game_id | label | desc | hero_id
Лист "boss_team":   boss_game_id | hero_id | unit_id | boss_level_id
Лист "boss_level":  game_id | boss_id | power_level
Лист "attack_teams": game_id | boss_id | chapter | level | enemy_type | main_buff | defenders_fragments
Лист "hero_names":  hero_id | name
Лист "sort_order":  hero_id | sort_order
Лист "titan_elements": titan_id | element | points
Лист "tags":        battle_game_id | tag
Лист "collection":  slot_number | game_id | item_type
Лист "pet_icons":   pet_id | drive_file_id
Лист "hero_icons":  hero_id | drive_file_id | category
```
