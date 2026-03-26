# Battle Library — GAS Backend Reference

> Этот файл автоматически обновляется из `google-app-scripts` монорепо.
> Источник: `projects/battle-library/gas/Code.js`
> Актуальная версия деплоя: **v72**

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
   │                           └─ uploadIconsBatch() ───►│ icon sheets (base64)
```

### Стек
- **Backend:** Google Apps Script (JavaScript ES5)
- **Storage:** Google Sheets (19 листов) + PropertiesService (коллекция)
- **Icons:** base64 прямо в Google Sheets (не Drive)
- **Deploy:** clasp CLI → `npm run sync-ui -- battle-library` деплоит React bundle

### Важные ограничения GAS
- ES5 only (нет стрелочных функций, let/const, шаблонных строк на сервере)
- `google.script.run` — единственный способ вызвать сервер с клиента
- Нет промисов в GAS-среде выполнения
- Нет CORS — всё через `google.script.run`, REST не работает в GAS prod

---

## Google Sheets — Структура листов

| Лист | Константа | Заголовки | Назначение |
|------|-----------|-----------|------------|
| `boss_list` | `SHEET_BOSS_LIST` | `game_id, label, desc, hero_id, defenders_fragments` | Список боёв (id > 226) |
| `boss_team` | `SHEET_BOSS_TEAM` | `boss_game_id, hero_id, unit_id, boss_level_id` | Команды героев |
| `boss_level` | `SHEET_BOSS_LEVEL` | `game_id, boss_id, power_level` | Уровни мощи |
| `attack_teams` | `SHEET_ATTACK_TEAMS` | `game_id, invasion_id, boss_id, boss_level, chapter, level, enemy_type, main_buff, comment, defenders_fragments` | Записи (replays) |
| `hero_icons` | `SHEET_HERO_ICONS` | `id, base64, filename` | Иконки героев (base64) |
| `pet_icons` | `SHEET_PET_ICONS` | `id, base64, filename` | Иконки питомцев (base64) |
| `spirit_icons` | `SHEET_SPIRIT_ICONS` | `id, base64, filename` | Иконки духов (base64) |
| `titan_icons` | `SHEET_TITAN_ICONS` | `id, base64, filename` | Иконки титанов (base64) |
| `creep_icons` | `SHEET_CREEP_ICONS` | `id, base64, filename` | Иконки крипов (base64) |
| `hero_names` | `SHEET_HERO_NAMES` | `hero_id, name` | Русские имена героев |
| `sort_order` | `SHEET_SORT_ORDER` | `hero_id, sort_order` | Порядок сортировки |
| `titan_elements` | `SHEET_TITAN_ELEMENTS` | `titan_id, element, points` | Стихии титанов |
| `spirit_skills` | `SHEET_SPIRIT_SKILLS` | `skill_id, name` | Навыки духов |
| `talismans` | `SHEET_TALISMANS` | `talisman_id, name, effect_key, description` | Талисманы |
| `talisman_icons` | `SHEET_TALISMAN_ICONS` | `talisman_id, base64, filename` | Иконки талисманов (base64) |
| `tags` | `SHEET_TAGS` | `battle_game_id, tag` | Пользовательские теги |
| `app_settings` | `SHEET_APP_SETTINGS` | `key, value` | Настройки приложения |
| `logs` | `SHEET_LOGS` | `time, level, function, message, data` | Серверные логи |

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
  heroIcons:     IconItem[];          // hero_icons { id, base64, filename }
  heroNames:     HeroNameItem[];      // hero_names { hero_id, name }
  heroSortOrder: SortOrderItem[];     // sort_order { hero_id, sort_order }
  titanElements: TitanElementItem[];  // titan_elements { titan_id, element, points }
  attackTeams:   AttackTeamItem[];    // attack_teams
  petIcons:      IconItem[];          // pet_icons { id, base64, filename }
  spiritSkills:  SpiritSkillItem[];   // spirit_skills { skill_id, name }
  spiritIcons:   IconItem[];          // spirit_icons { id, base64, filename }
  talismans:     TalismanItem[];      // talismans { talisman_id, name, effect_key, description }
  talismanIcons: IconItem[];          // talisman_icons { talisman_id, base64, filename }
  maxBossId:     number;
}
```

#### `getReplays()` → `ReplaysData`
Возвращает данные для отображения записей (replays).

```typescript
interface ReplaysData {
  attackTeams:  AttackTeamItem[];
  heroIcons:    IconItem[];
  heroNames:    HeroNameItem[];
  petIcons:     IconItem[];
  spiritSkills: SpiritSkillItem[];
  spiritIcons:  IconItem[];
  mainBuffName: string;   // активный бафф (из app_settings, ключ 'mainBuffName')
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
  itemId: string;  // формат: "ch{N}-{bossId}"
}
```

#### `getAdminStats()` → `AdminStats`
```typescript
interface AdminStats {
  bossList:           number;
  bossTeam:           number;
  bossLevel:          number;
  heroIcons:          number;
  heroNames:          number;
  heroSortOrder:      number;
  titanElements:      number;
  attackTeams:        number;        // кол-во записей (replays)
  heroicReplays:      number;        // enemy_type = "герои"
  titanicReplays:     number;        // enemy_type = "титаны"
  petIcons:           number;
  spiritSkills:       number;
  spiritIcons:        number;
  talismans:          number;
  talismanIcons:      number;
  mainBuffName:       string;        // активный бафф (legacy, слот A)
  mainBuffNameA:      string;        // бафф слота A
  mainBuffEffectKeyA: string;        // ключ эффекта слота A
  mainBuffNameB:      string;        // бафф слота B
  mainBuffEffectKeyB: string;        // ключ эффекта слота B
  lastDataSync:       string | null;
  lastIconSync:       string | null;
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

#### `getServerLogs()` → `{ logs: LogEntry[] }`
Последние 50 серверных логов (из листа `logs`).
```typescript
interface LogEntry {
  timestamp: string;
  level:     'INFO' | 'WARN' | 'ERROR';
  function:  string;
  message:   string;
  data:      string;
}
```

---

### Запись данных

#### `saveTag(battleGameId: string, tag: string)` → `{ success: true } | ErrorResult`
Добавляет тег к бою. Дубликаты игнорируются.

#### `deleteTag(battleGameId: string, tag: string)` → `{ success: true } | ErrorResult`

#### `saveCollectionItem(data: CollectionItem)` → `{ success: true } | ErrorResult`

#### `deleteCollectionItem(itemId: string)` → `{ success: true } | ErrorResult`

#### `clearCollection()` → `{ success: true } | ErrorResult`

#### `setMainBuffName(name: string)` → `{ success: true } | ErrorResult`
Устанавливает активный бафф (записывает в `app_settings`, ключ `mainBuffName`).

#### `saveMainBuffName(slot: string, name: string, effectKey: string)` → `{ success: true } | ErrorResult`
Сохраняет настройки баффа по слоту. Записывает в `app_settings`:
- `mainBuffName{slot}` → `name`
- `mainBuffEffectKey{slot}` → `effectKey`
- Если `slot === 'A'` — дополнительно обновляет `mainBuffName` (legacy)

```typescript
// Вызов:
gsRun('saveMainBuffName', 'A', 'Бафф Атаки', 'allParamsValueIncrease')
gsRun('saveMainBuffName', 'B', 'Бафф Защиты', 'defenceIncrease')
```

#### `saveBuffNames(namesJson: string)` → `{ success: true, count: number } | ErrorResult`
Сохраняет список всех баффов. **Аргумент — JSON-строка:** `JSON.stringify(["Бафф A", "Бафф B"])`.

---

### Admin API

#### `adminUpload(type: string, data: object[])` → `{ success: true, count: number } | ErrorResult`
Загружает данные в листы. Все типы используют **полную замену** (`_clearAndWrite`).

| type | Лист | Логика |
|------|------|--------|
| `boss-list` | boss_list | Полная замена (фильтр id > 226) |
| `boss-team` | boss_team | Полная замена (фильтр bossGameId > 226) |
| `boss-level` | boss_level | Полная замена |
| `attack-teams` | attack_teams | Полная замена |
| `hero-names` | hero_names | Полная замена |
| `sort-order` | sort_order | Полная замена |
| `titan-elements` | titan_elements | Полная замена |
| `spirit-skills` | spirit_skills | Полная замена |
| `talismans` | talismans | Полная замена |
| `talisman-icons` | talisman_icons | Upsert по talisman_id |
| `hero-icons` | hero_icons | Upsert по id |
| `pet-icons` | pet_icons | Upsert по id |
| `spirit-icons` | spirit_icons | Upsert по id |

⚠️ **Важно:** поля принимаются в обоих форматах — camelCase (`heroId`) и snake_case (`hero_id`).

#### `uploadIconsBatch(category: string, icons: IconUploadItem[])` → `{ success: true, count: number } | ErrorResult`
Сохраняет иконки как base64 прямо в Google Sheets. **Не использует Google Drive.**

```typescript
type IconCategory = 'hero' | 'pet' | 'spirit' | 'titan' | 'creep';

interface IconUploadItem {
  id:       string | number;   // entity ID
  base64:   string;            // base64 PNG (без data:image/...;base64, префикса)
  filename: string;            // {category}_{id}.png
}
// Лист: {category}_icons, заголовки: id, base64, filename
// Логика: upsert (обновить если id есть, добавить если нет)
```

---

### GitLab Sync

#### `saveGitLabToken(token: string)` → `{ success: true } | ErrorResult`
#### `getGitLabTokenStatus()` → `{ configured: boolean, email?: string }`
#### `syncFromGitLab(branch: string)` → `{ success: true, added: object } | ErrorResult`

---

### Утилиты (запускаются только из редактора Apps Script)

| Функция | Описание |
|---------|----------|
| `setupSpreadsheetId(id)` | Сохраняет Spreadsheet ID в ScriptProperties (один раз) |
| `setupSheet()` | Создаёт все листы с правильными заголовками |
| `clearAllSheetData()` | Очищает игровые данные (сохраняет tags, app_settings, logs) |
| `setupIcons()` | Загружает иконки с GitHub на Drive (устарело) |
| `migrateIconUrls()` | Конвертирует старые Drive URLs |

---

## gasApi.ts — Паттерн вызова GAS функций

```typescript
// Определение среды (URL-based — надёжнее чем проверка google.script.run)
const IS_GAS_ENV = window.location.hostname.endsWith('googleusercontent.com');

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

### Таблица соответствия gasApi.ts ↔ GAS функций

| gasApi метод | GAS функция | Примечание |
|-------------|-------------|------------|
| `getBattles()` | `getBattles()` | |
| `getReplays()` | `getReplays()` | |
| `getTags()` | `getTags()` | |
| `getCollection()` | `getCollection()` | |
| `getAdminStats()` | `getAdminStats()` | |
| `getBuffConfig()` | `getBuffConfig()` | |
| `getServerLogs()` | `getServerLogs()` | |
| `saveTag(id, tag)` | `saveTag(id, tag)` | 2 аргумента |
| `deleteTag(id, tag)` | `deleteTag(id, tag)` | 2 аргумента |
| `saveCollectionItem(data)` | `saveCollectionItem(data)` | |
| `deleteCollectionItem(id)` | `deleteCollectionItem(id)` | |
| `clearCollection()` | `clearCollection()` | |
| `setMainBuffName(name)` | `setMainBuffName(name)` | legacy |
| `saveMainBuffName(slot, name, key)` | `saveMainBuffName(slot, name, key)` | 3 аргумента |
| `saveBuffNames(arr)` | `saveBuffNames(JSON.stringify(arr))` | JSON string! |
| `adminUpload(type, data)` | `adminUpload(type, data)` | 2 аргумента |
| `uploadIconsBatch(cat, icons)` | `uploadIconsBatch(cat, icons)` | 2 аргумента |
| `syncFromGitLab(branch)` | `syncFromGitLab(branch)` | |

---

## Обработка ошибок

Все GAS функции возвращают `{ error: string }` при ошибке — **никогда не бросают исключения**.

```typescript
interface ErrorResult { error: string; }
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
