# Battle Library — GAS Backend Reference

> Этот файл автоматически обновляется из `google-app-scripts` монорепо.
> Источник: `projects/battle-library/gas/Code.js`
> Актуальная версия деплоя — смотри `.clasp.json` в монорепо.

---

## Архитектура

```
Replit (React UI)          GAS Backend              Google Sheets
   │                           │                         │
   ├─ gasApi.ts ──────────────►│ google.script.run        │
   │  (IS_GAS_ENV=true)        │                         │
   │                           ├─ getBattles() ─────────►│ boss_list, boss_team...
   │                           ├─ getReplays() ─────────►│ attack_teams
   │                           ├─ getTags() ────────────►│ tags
   │                           ├─ getCollection() ──────►│ PropertiesService (per-user)
   │                           ├─ adminUpload() ────────►│ (все листы)
   │                           └─ uploadIconsBatch() ───►│ Google Drive + icon sheets
```

### Стек
- **Backend:** Google Apps Script (JavaScript ES5)
- **Storage:** Google Sheets (13 листов) + PropertiesService (коллекция)
- **Icons:** Google Drive (папка "BattleLibrary Icons")
- **Deploy:** clasp CLI → `npm run sync-ui -- battle-library` деплоит React bundle

### Важные ограничения GAS
- ES5 only (нет стрелочных функций, let/const, шаблонных строк на сервере)
- `google.script.run` — единственный способ вызвать сервер с клиента
- Один аргумент на вызов — несколько аргументов через `multiArgs(a, b)` → `[a, b]`
- Нет промисов в GAS-среде выполнения
- Нет CORS — всё через `google.script.run`, REST не работает в GAS prod

---

## Google Sheets — Структура листов

| Лист | Константа | Назначение |
|------|-----------|------------|
| `boss_list` | `SHEET_BOSS_LIST` | Список боёв (id > 226, без replays) |
| `boss_team` | `SHEET_BOSS_TEAM` | Команды героев для каждого боя |
| `boss_level` | `SHEET_BOSS_LEVEL` | Уровни мощи (Power Level) |
| `attack_teams` | `SHEET_ATTACK_TEAMS` | Записи (replays) — содержат `defenders_fragments` |
| `hero_icons` | `SHEET_HERO_ICONS` | id → Drive thumbnail URL для героев |
| `pet_icons` | `SHEET_PET_ICONS` | id → Drive thumbnail URL для питомцев |
| `spirit_icons` | `SHEET_SPIRIT_ICONS` | id → Drive thumbnail URL для духов |
| `hero_names` | `SHEET_HERO_NAMES` | id → name (русское имя героя) |
| `sort_order` | `SHEET_SORT_ORDER` | heroId → sortOrder (порядок сортировки) |
| `titan_elements` | `SHEET_TITAN_ELEMENTS` | heroId → element (стихия титана) |
| `spirit_skills` | `SHEET_SPIRIT_SKILLS` | Навыки духов |
| `tags` | `SHEET_TAGS` | battle_game_id → tag (пользовательские теги) |
| `app_settings` | `SHEET_APP_SETTINGS` | key → value (mainBuffName, buffNames, lastDataSync, lastIconSync) |

### Как отличить бои от записей (replays)
- `boss_list` с `defenders_fragments = ''` → **бой**
- `attack_teams` с `defenders_fragments != ''` → **запись (replay)**

---

## GAS API — Все серверные функции

### Чтение данных

#### `getBattles()` → `BattlesData`
Возвращает все данные для вкладки "Библиотека".

```typescript
interface BattlesData {
  bossList:      BossListItem[];      // boss_list (только id > 226, без replays)
  bossTeam:      BossTeamItem[];      // boss_team
  bossLevel:     BossLevelItem[];     // boss_level
  heroIcons:     IconItem[];          // hero_icons { id, url }
  heroNames:     HeroNameItem[];      // hero_names { id, name }
  heroSortOrder: SortOrderItem[];     // sort_order { heroId, sortOrder }
  titanElements: TitanElementItem[];  // titan_elements { heroId, element }
  attackTeams:   AttackTeamItem[];    // attack_teams
  petIcons:      IconItem[];          // pet_icons
  spiritSkills:  SpiritSkillItem[];   // spirit_skills
  spiritIcons:   IconItem[];          // spirit_icons
  maxBossId:     number;
}
```

#### `getReplays()` → `ReplaysData`
Возвращает данные для отображения записей (replays).

```typescript
interface ReplaysData {
  attackTeams:  AttackTeamItem[];   // attack_teams (с defenders_fragments)
  heroIcons:    IconItem[];
  heroNames:    HeroNameItem[];
  petIcons:     IconItem[];
  spiritSkills: SpiritSkillItem[];
  spiritIcons:  IconItem[];
  mainBuffName: string;             // активный бафф
}
```

#### `getTags()` → `{ tags: TagItem[] }`
```typescript
interface TagItem {
  battle_game_id: string;
  tag: string;
}
```

#### `getCollection()` → `{ items: CollectionItem[] }`
Личная коллекция текущего пользователя (хранится в `PropertiesService.getUserProperties()`).
```typescript
interface CollectionItem {
  itemId: string;  // формат: "ch{N}-{bossId}" — используется для routing по PropertiesService
  // ... любые поля которые сохранял фронтенд
}
```

#### `getAdminStats()` → `AdminStats`
```typescript
interface AdminStats {
  bossList:       number;   // кол-во боёв
  bossTeam:       number;
  bossLevel:      number;
  heroIcons:      number;
  heroNames:      number;
  heroSortOrder:  number;
  titanElements:  number;
  attackTeams:    number;   // кол-во записей
  heroicReplays:  number;   // записи с enemy_type = "герои"
  titanicReplays: number;   // записи с enemy_type = "титаны"
  petIcons:       number;
  spiritSkills:   number;
  spiritIcons:    number;
  mainBuffName:   string;
  lastDataSync:   string | null;
  lastIconSync:   string | null;
}
```

#### `getBuffConfig()` → `BuffConfig`
```typescript
interface BuffConfig {
  success: boolean;
  active:  string;    // активный бафф (mainBuffName)
  names:   string[];  // все известные баффы
}
```

#### `getLogs()` → `{ logs: LogEntry[] }`
Последние 50 серверных логов (из листа 'logs').

---

### Запись данных

#### `saveTag(battleGameId: string, tag: string)` → `{ success: true } | ErrorResult`
Добавляет тег к бою. Дубликаты игнорируются.

#### `deleteTag(battleGameId: string, tag: string)` → `{ success: true } | ErrorResult`

#### `saveCollectionItem(data: CollectionItem)` → `{ success: true } | ErrorResult`
Сохраняет/обновляет элемент личной коллекции. `itemId` должен содержать `ch{N}` для routing.

#### `deleteCollectionItem(itemId: string)` → `{ success: true } | ErrorResult`

#### `clearCollection()` → `{ success: true } | ErrorResult`
Полностью очищает коллекцию текущего пользователя.

#### `setMainBuffName(name: string)` → `{ success: true } | ErrorResult`
Устанавливает активный бафф.

#### `saveBuffNames(namesJson: string)` → `{ success: true, count: number } | ErrorResult`
Сохраняет список всех баффов. **Аргумент — JSON-строка массива:** `JSON.stringify(["Бафф A", "Бафф B"])`.

---

### Admin API

#### `adminUpload(type: string, data: object[])` → `{ success: true, count: number } | ErrorResult`
Загружает данные в листы. Логика **аддитивная** (новые записи добавляются, существующие не перезаписываются) для `boss-*` и `attack-teams`. Для `hero-names`, `sort-order`, `titan-elements`, `spirit-skills` — **полная замена**.

| type | Лист | Логика |
|------|------|--------|
| `boss-list` | boss_list | Аддитивная (дедупликация по id) |
| `boss-team` | boss_team | Аддитивная (дедупликация по bossId+heroId+unitId) |
| `boss-level` | boss_level | Аддитивная (дедупликация по id) |
| `attack-teams` | attack_teams | Аддитивная (дедупликация по id) |
| `hero-names` | hero_names | Полная замена |
| `sort-order` | sort_order | Полная замена |
| `titan-elements` | titan_elements | Полная замена |
| `spirit-skills` | spirit_skills | Полная замена |
| `hero-icons` | hero_icons | Полная замена (только URLs, не Drive upload) |
| `pet-icons` | pet_icons | Полная замена |
| `spirit-icons` | spirit_icons | Полная замена |
| `talismans` | talismans | ⚠️ **Не реализовано в GAS** — см. ниже |
| `talisman-icons` | talisman_icons | ⚠️ **Не реализовано в GAS** — см. ниже |

⚠️ **Важно:** поля принимаются в обоих форматах — camelCase (`heroId`) и snake_case (`hero_id`).

#### `uploadIconsBatch(category: string, icons: IconUploadItem[])` → `{ success: true, uploaded: number, errors: number } | ErrorResult`
Загружает иконки на Google Drive и сохраняет thumbnail URLs в листы.

```typescript
type IconCategory = 'hero' | 'pet' | 'spirit' | 'titan' | 'creep';

interface IconUploadItem {
  id:       string | number;   // entity ID
  base64:   string;            // base64-encoded PNG (без data:image/png;base64, префикса)
  filename: string;            // {category}_{id}.png
}
```

---

### ⚠️ Не реализовано в GAS — требует доработки Code.js

#### Талисманы (`talismans` / `talisman-icons`)

Фронтенд (AdminPanel) поддерживает загрузку талисманов, но в GAS `adminUpload` эти типы не обработаны.

**Маршруты фронтенда и что ожидается от GAS:**

**Важно:** Оригинальный фронтенд шлёт талисманы как `{ text: "..." }` (сырой текст) на REST API, а Express их парсит. В GAS-режиме `gasFetchInterceptor.ts` парсит текст **до вызова GAS**, поэтому GAS всегда получает уже готовый массив.

**1. `adminUpload("talismans", data)` — загрузка определений талисманов**

GAS получает уже распарсенный массив (парсинг текста выполнен в interceptor'е):
```typescript
// data = TalismanItem[]
interface TalismanItem {
  talismanId:   number;   // числовой ID
  name:         string;   // название (например "Молния")
  effectKey:    string;   // базовая часть ключа эффекта (например "talismanLightning")
  description?: string;   // описание (опционально)
}
```

Нужно создать лист `talismans` в Sheets с колонками: `talismanId | name | effectKey | description`.  
Логика записи: **полная замена** (аналогично `hero-names`).

**2. `adminUpload("talisman-icons", data)` — загрузка иконок талисманов**

GAS получает уже нормализованный массив иконок (interceptor извлекает `body.icons` за фронтенда):
```typescript
// data = TalismanIconItem[]
interface TalismanIconItem {
  talismanId: number;
  iconUrl:    string;  // base64 data URL: "data:image/png;base64,..."
}
```

Нужно создать лист `talisman_icons` с колонками: `talismanId | iconUrl`.  
Логика: **полная замена** по `talismanId`.

**Что нужно добавить в Code.js:**
```javascript
// В функции adminUpload — добавить два новых case:
case 'talismans':
  // data = [{ talismanId, name, effectKey, description }, ...]
  // Полная замена листа talismans
  // Колонки: talismanId, name, effectKey, description
  break;

case 'talisman-icons':
  // data = [{ talismanId, iconUrl }, ...]
  // Полная замена листа talisman_icons
  // Колонки: talismanId, iconUrl
  break;
```

**Примечание:** `uploadIconsBatch` для талисманов **не нужен** — иконки хранятся как base64 data URL в листе `talisman_icons`, Drive-загрузка не требуется (в отличие от героев/питомцев/духов).

---

### GitLab Sync (внутренний)

#### `saveGitLabToken(token: string)` → `{ success: true } | ErrorResult`
Сохраняет GitLab API токен в `PropertiesService.getUserProperties()`.

#### `getGitLabTokenStatus()` → `{ configured: boolean, email?: string }`

#### `syncFromGitLab(branch: string)` → `{ success: true, added: object } | ErrorResult`
Синхронизирует данные из ветки `gitlab.nexters.io/heroes/lib-storage`.

---

### Утилиты (не вызываются с фронтенда)

| Функция | Запуск | Описание |
|---------|--------|----------|
| `setupSpreadsheetId(id)` | Из редактора (один раз) | Сохраняет Spreadsheet ID в ScriptProperties |
| `setupSheet()` | Из редактора (один раз) | Создаёт все листы с заголовками |
| `setupIcons()` | Из редактора (при необходимости) | Загружает иконки с GitHub на Drive |
| `migrateIconUrls()` | Из редактора (один раз) | Конвертирует старые Drive URLs в thumbnail формат |

---

## Frontend Data Layer (data.html)

В GAS prod фронтенд использует эти функции из `data.html` (Vanilla JS).
В Replit dev — аналогичные REST вызовы.

| Функция в data.html | GAS функция | Описание |
|---------------------|-------------|----------|
| `loadBattles(cb)` | `getBattles()` | Кэшируется в `BL.data.battles` |
| `loadReplays(cb)` | `getReplays()` | Кэшируется в `BL.data.replays` |
| `loadTags(cb)` | `getTags()` | Кэшируется в `BL.data.tags` |
| `loadCollection(cb)` | `getCollection()` | Кэшируется в `BL.data.collection` |
| `loadAdminStats(cb)` | `getAdminStats()` | Без кэша |
| `addTag(id, tag, cb)` | `saveTag(id, tag)` | multiArgs |
| `removeTag(id, tag, cb)` | `deleteTag(id, tag)` | multiArgs |
| `addToCollection(data, cb)` | `saveCollectionItem(data)` | |
| `removeFromCollection(id, cb)` | `deleteCollectionItem(id)` | |
| `clearAllCollection(cb)` | `clearCollection()` | |
| `uploadAdminData(type, data, cb)` | `adminUpload(type, data)` | multiArgs |
| `uploadIconsBatch(cat, icons, cb)` | `uploadIconsBatch(cat, icons)` | multiArgs |
| `saveMainBuffName(name, cb)` | `setMainBuffName(name)` | |
| `saveBuffNames(arr, cb)` | `saveBuffNames(JSON.stringify(arr))` | JSON string! |
| `getBuffConfig(cb)` | `getBuffConfig()` | |
| `getServerLogs(cb)` | `getLogs()` | |
| `syncFromGitLab(branch, cb)` | `syncFromGitLab(branch)` | |

---

## gasApi.ts — Паттерн интеграции

```typescript
// Определение среды
const IS_GAS_ENV = typeof google !== 'undefined' && !!google?.script?.run;

// Вызов GAS функции
function gsRun<T>(fnName: string, ...args: unknown[]): Promise<T> {
  return new Promise((resolve, reject) => {
    const runner = google.script.run
      .withSuccessHandler((r: unknown) => {
        const result = r as GasResult<T>;
        if (result?.error) reject(new Error(result.error));
        else resolve(result as T);
      })
      .withFailureHandler((err: unknown) => reject(err));
    (runner as any)[fnName](...args);
  });
}
```

### Правило multiArgs
Когда нужно передать **несколько аргументов** в GAS, они приходят как **один массив**.
GAS-сервер получает их через `arguments[0]` (массив), а не отдельными параметрами.

**В GAS `adminUpload(type, data)` вызывается корректно — сервер принимает два аргумента.**
На стороне `google.script.run` передача нескольких аргументов работает напрямую:
```typescript
(runner as any).adminUpload(type, data);  // два аргумента — OK
```

---

## Обработка ошибок

Все GAS функции возвращают `{ error: string }` при ошибке — **никогда не бросают исключения**.

```typescript
interface ErrorResult {
  error: string;
}
type GasResult<T> = T | ErrorResult;

function isError(r: unknown): r is ErrorResult {
  return typeof r === 'object' && r !== null && 'error' in r;
}
```

---

## Деплой workflow

```
1. Replit: npm run build:gas:push
   └─ собирает React → projects/battle-library/gas/index.html
   └─ git commit + git push origin main

2. Cursor (gas-tools монорепо):
   └─ npm run sync-ui -- battle-library
      ├─ скачивает index.html из GitHub raw
      ├─ сохраняет локально
      └─ npm run deploy -- battle-library → clasp push → version → deployment
```

URL продакшна:
```
https://script.google.com/a/macros/nexters.com/s/AKfycbzNveXw_EmK4wKWxlYia3JRsdLzhX8S6KAvjxB5gOZv1Tsv_2lbg0nFGCswQ4e1o1WHWg/exec
```
