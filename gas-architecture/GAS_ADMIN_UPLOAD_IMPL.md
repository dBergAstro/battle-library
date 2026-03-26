# GAS adminUpload() — Полная реализация

> **Статус:** Данные не сохраняются. Необходимо заменить/обновить реализацию `adminUpload()` в Code.js.
>
> Этот файл содержит готовый код для вставки в Code.js (ES5 синтаксис).

---

## Проблема

Фронтенд вызывает `google.script.run.adminUpload(type, data)`, но данные не записываются в Google Sheets.

## Что именно отправляет фронтенд (форматы данных)

### `boss-list`
```json
[
  { "id": 500, "label": "Глава 5", "desc": "Бой 3", "heroId": 4100, "defendersFragments": null }
]
```
Поля: `id` (game_id), `label`, `desc`, `heroId` или `hero_id`, `defendersFragments` или `defenders_fragments`

### `boss-team`
```json
[
  { "id": 500, "heroId": 10, "unitId": 10, "bossLevelId": 101 }
]
```
Поля: `id` или `bossId` (boss_game_id), `heroId` или `hero_id`, `unitId` или `unit_id`, `bossLevelId` или `boss_level_id`

### `boss-level`
```json
[
  { "id": 101, "bossId": 500, "powerLevel": 75000 }
]
```
Поля: `id` (game_id), `bossId` или `bossLevel` или `boss_id`, `powerLevel` или `power_level`

### `attack-teams`
```json
[
  {
    "id": 12345,
    "invasionId": 1,
    "bossId": 500,
    "bossLevel": 101,
    "chapter": 5,
    "level": 3,
    "enemyType": "Герои",
    "mainBuff": 3,
    "comment": "",
    "defendersFragments": "{\"units\":[...]}"
  }
]
```

### `hero-names`
```json
[{ "heroId": 10, "name": "Аэлинда" }]
```

### `sort-order`
```json
[{ "heroId": 10, "sortOrder": 1.5 }]
```

### `titan-elements`
```json
[{ "titanId": 4001, "element": "вода", "points": 3 }]
```

### `spirit-skills`
```json
[{ "skillId": 1, "name": "Атака" }]
```

### `talismans` (через `adminUpload`)
```json
[
  { "talismanId": 1001, "name": "Талисман Силы", "effectKey": "talismanPower", "description": "Увеличивает атаку" }
]
```
Поля: `talismanId`, `name`, `effectKey`, `description` (опционально)

### `talisman-icons` (через `adminUpload`)
```json
[
  { "talismanId": 1001, "iconUrl": "data:image/png;base64,XXX" }
]
```
Поля: `talismanId`, `iconUrl` (data URL с префиксом или без)

### `uploadIconsBatch` (отдельная GAS функция, не через adminUpload)
```json
category: "hero" | "pet" | "spirit" | "titan" | "creep"
icons: [{ "id": 10, "base64": "XXX", "filename": "hero_10.png" }]
```
Фронтенд нормализует иконки перед вызовом — префикс `data:image/...;base64,` уже снят, поле `filename` уже задано.

---

## Структура листов Google Sheets

| Лист | Заголовки (строка 1) |
|------|----------------------|
| `boss_list` | `game_id, label, desc, hero_id, defenders_fragments` |
| `boss_team` | `boss_game_id, hero_id, unit_id, boss_level_id` |
| `boss_level` | `game_id, boss_id, power_level` |
| `attack_teams` | `game_id, invasion_id, boss_id, boss_level, chapter, level, enemy_type, main_buff, comment, defenders_fragments` |
| `hero_names` | `hero_id, name` |
| `sort_order` | `hero_id, sort_order` |
| `titan_elements` | `titan_id, element, points` |
| `spirit_skills` | `skill_id, name` |
| `talismans` | `talisman_id, name, effect_key, description` |
| `talisman_icons` | `talisman_id, base64, filename` |
| `hero_icons` | `id, base64, filename` |
| `pet_icons` | `id, base64, filename` |
| `spirit_icons` | `id, base64, filename` |
| `titan_icons` | `id, base64, filename` |
| `creep_icons` | `id, base64, filename` |

---

## Готовый код для Code.js

Вставить ВМЕСТО или ПОСЛЕ существующего `adminUpload()`:

```javascript
/**
 * adminUpload — загружает данные в листы Google Sheets.
 * Вызывается с фронтенда через: google.script.run.adminUpload(type, data)
 *
 * @param {string} type - тип данных
 * @param {Array} data - массив объектов
 * @return {{ success: boolean, count: number } | { error: string }}
 */
function adminUpload(type, data) {
  try {
    gasLog('INFO', 'adminUpload', 'called type=' + type + ' count=' + (Array.isArray(data) ? data.length : '?'));

    if (!Array.isArray(data) || data.length === 0) {
      return { error: 'data must be a non-empty array' };
    }

    var ss = getSpreadsheet();
    var count = 0;

    if (type === 'boss-list') {
      count = _uploadBossList(ss, data);
    } else if (type === 'boss-team') {
      count = _uploadBossTeam(ss, data);
    } else if (type === 'boss-level') {
      count = _uploadBossLevel(ss, data);
    } else if (type === 'attack-teams') {
      count = _uploadAttackTeams(ss, data);
    } else if (type === 'hero-names') {
      count = _uploadHeroNames(ss, data);
    } else if (type === 'sort-order') {
      count = _uploadSortOrder(ss, data);
    } else if (type === 'titan-elements') {
      count = _uploadTitanElements(ss, data);
    } else if (type === 'spirit-skills') {
      count = _uploadSpiritSkills(ss, data);
    } else if (type === 'talismans') {
      count = _uploadTalismans(ss, data);
    } else if (type === 'talisman-icons') {
      count = _uploadTalismanIcons(ss, data);
    } else {
      gasLog('WARN', 'adminUpload', 'unknown type: ' + type);
      return { error: 'unknown type: ' + type };
    }

    gasLog('INFO', 'adminUpload', 'done type=' + type + ' saved=' + count);
    return { success: true, count: count };

  } catch (e) {
    gasLog('ERROR', 'adminUpload', e.message, { type: type, stack: e.stack });
    return { error: e.message };
  }
}

// ─── Вспомогательные функции ──────────────────────────────────────────────────

/**
 * Очищает лист (кроме строки заголовка) и записывает новые данные.
 * @param {Sheet} sheet
 * @param {Array<Array>} rows - массив строк (без заголовка)
 */
function _clearAndWrite(sheet, rows) {
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.deleteRows(2, lastRow - 1);
  }
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }
  return rows.length;
}

/**
 * Добавляет строки к листу, дедупликация по ключу.
 * @param {Sheet} sheet
 * @param {Array<Array>} newRows
 * @param {number} keyCol - индекс колонки для дедупликации (0-based)
 */
function _appendDedup(sheet, newRows, keyCol) {
  var lastRow = sheet.getLastRow();
  var existingKeys = {};

  if (lastRow > 1) {
    var existing = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < existing.length; i++) {
      existingKeys[String(existing[i][0])] = true;
    }
  }

  var toAdd = [];
  for (var j = 0; j < newRows.length; j++) {
    var key = String(newRows[j][keyCol]);
    if (!existingKeys[key]) {
      existingKeys[key] = true;
      toAdd.push(newRows[j]);
    }
  }

  if (toAdd.length > 0) {
    var startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, toAdd.length, toAdd[0].length).setValues(toAdd);
  }
  return toAdd.length;
}

/** boss_list: заголовки: game_id, label, desc, hero_id, defenders_fragments */
function _uploadBossList(ss, data) {
  var sheet = ss.getSheetByName('boss_list');
  if (!sheet) { sheet = ss.insertSheet('boss_list'); sheet.appendRow(['game_id', 'label', 'desc', 'hero_id', 'defenders_fragments']); }

  var rows = [];
  for (var i = 0; i < data.length; i++) {
    var d = data[i];
    var gameId = Number(d.id || d.game_id || 0);
    if (gameId <= 226) continue; // фильтр актуальных боёв
    var df = d.defendersFragments || d.defenders_fragments || '';
    if (df && typeof df === 'object') df = JSON.stringify(df);
    rows.push([
      gameId,
      d.label || '',
      d.desc || '',
      Number(d.heroId || d.hero_id || 0) || '',
      df || ''
    ]);
  }

  // Полная замена
  return _clearAndWrite(sheet, rows);
}

/** boss_team: заголовки: boss_game_id, hero_id, unit_id, boss_level_id */
function _uploadBossTeam(ss, data) {
  var sheet = ss.getSheetByName('boss_team');
  if (!sheet) { sheet = ss.insertSheet('boss_team'); sheet.appendRow(['boss_game_id', 'hero_id', 'unit_id', 'boss_level_id']); }

  var rows = [];
  for (var i = 0; i < data.length; i++) {
    var d = data[i];
    // bossId в исходниках = game_id боя; поле называется id или bossId
    var bossGameId = Number(d.bossId || d.boss_game_id || d.id || d.boss_id || 0);
    if (bossGameId <= 226) continue;
    rows.push([
      bossGameId,
      Number(d.heroId || d.hero_id || 0) || '',
      Number(d.unitId || d.unit_id || 0) || '',
      Number(d.bossLevelId || d.boss_level_id || 0) || ''
    ]);
  }

  // Полная замена
  return _clearAndWrite(sheet, rows);
}

/** boss_level: заголовки: game_id, boss_id, power_level */
function _uploadBossLevel(ss, data) {
  var sheet = ss.getSheetByName('boss_level');
  if (!sheet) { sheet = ss.insertSheet('boss_level'); sheet.appendRow(['game_id', 'boss_id', 'power_level']); }

  var rows = [];
  for (var i = 0; i < data.length; i++) {
    var d = data[i];
    var gameId = Number(d.id || d.game_id || 0);
    if (!gameId) continue;
    rows.push([
      gameId,
      Number(d.bossId || d.bossLevel || d.boss_id || 0) || '',
      Number(d.powerLevel || d.power_level || 0) || ''
    ]);
  }

  // Дедупликация по game_id (полная замена)
  return _clearAndWrite(sheet, rows);
}

/**
 * attack_teams: заголовки: game_id, invasion_id, boss_id, boss_level,
 *   chapter, level, enemy_type, main_buff, comment, defenders_fragments
 */
function _uploadAttackTeams(ss, data) {
  var sheet = ss.getSheetByName('attack_teams');
  if (!sheet) {
    sheet = ss.insertSheet('attack_teams');
    sheet.appendRow(['game_id', 'invasion_id', 'boss_id', 'boss_level', 'chapter', 'level', 'enemy_type', 'main_buff', 'comment', 'defenders_fragments']);
  }

  var rows = [];
  for (var i = 0; i < data.length; i++) {
    var d = data[i];
    var gameId = Number(d.id || d.game_id || 0);
    if (!gameId) continue;
    var df = d.defendersFragments || d.defenders_fragments || '';
    if (df && typeof df === 'object') df = JSON.stringify(df);
    rows.push([
      gameId,
      Number(d.invasionId || d.invasion_id || 0) || '',
      Number(d.bossId || d.boss_id || 0) || '',
      Number(d.bossLevel || d.boss_level || 0) || '',
      Number(d.chapter || 0) || '',
      Number(d.level || 0) || '',
      d.enemyType || d.enemy_type || '',
      Number(d.mainBuff || d.main_buff || 0) || '',
      d.comment || '',
      df || ''
    ]);
  }

  // Полная замена
  return _clearAndWrite(sheet, rows);
}

/** hero_names: заголовки: hero_id, name */
function _uploadHeroNames(ss, data) {
  var sheet = ss.getSheetByName('hero_names');
  if (!sheet) { sheet = ss.insertSheet('hero_names'); sheet.appendRow(['hero_id', 'name']); }

  var rows = [];
  for (var i = 0; i < data.length; i++) {
    var d = data[i];
    var heroId = Number(d.heroId || d.hero_id || 0);
    if (!heroId) continue;
    rows.push([heroId, d.name || '']);
  }

  return _clearAndWrite(sheet, rows);
}

/** sort_order: заголовки: hero_id, sort_order */
function _uploadSortOrder(ss, data) {
  var sheet = ss.getSheetByName('sort_order');
  if (!sheet) { sheet = ss.insertSheet('sort_order'); sheet.appendRow(['hero_id', 'sort_order']); }

  var rows = [];
  for (var i = 0; i < data.length; i++) {
    var d = data[i];
    var heroId = Number(d.heroId || d.hero_id || 0);
    if (!heroId) continue;
    rows.push([heroId, Number(d.sortOrder || d.sort_order || 0)]);
  }

  return _clearAndWrite(sheet, rows);
}

/** titan_elements: заголовки: titan_id, element, points */
function _uploadTitanElements(ss, data) {
  var sheet = ss.getSheetByName('titan_elements');
  if (!sheet) { sheet = ss.insertSheet('titan_elements'); sheet.appendRow(['titan_id', 'element', 'points']); }

  var rows = [];
  for (var i = 0; i < data.length; i++) {
    var d = data[i];
    var titanId = Number(d.titanId || d.titan_id || d.heroId || d.hero_id || 0);
    if (!titanId) continue;
    rows.push([titanId, d.element || '', Number(d.points || 0)]);
  }

  return _clearAndWrite(sheet, rows);
}

/** spirit_skills: заголовки: skill_id, name */
function _uploadSpiritSkills(ss, data) {
  var sheet = ss.getSheetByName('spirit_skills');
  if (!sheet) { sheet = ss.insertSheet('spirit_skills'); sheet.appendRow(['skill_id', 'name']); }

  var rows = [];
  for (var i = 0; i < data.length; i++) {
    var d = data[i];
    var skillId = Number(d.skillId || d.skill_id || d.id || 0);
    if (!skillId) continue;
    rows.push([skillId, d.name || '']);
  }

  return _clearAndWrite(sheet, rows);
}

/** talismans: заголовки: talisman_id, name, effect_key, description */
function _uploadTalismans(ss, data) {
  var sheet = ss.getSheetByName('talismans');
  if (!sheet) { sheet = ss.insertSheet('talismans'); sheet.appendRow(['talisman_id', 'name', 'effect_key', 'description']); }

  var rows = [];
  for (var i = 0; i < data.length; i++) {
    var d = data[i];
    var talismanId = Number(d.talismanId || d.talisman_id || d.id || 0);
    if (!talismanId) continue;
    rows.push([talismanId, d.name || '', d.effectKey || d.effect_key || '', d.description || '']);
  }

  return _clearAndWrite(sheet, rows);
}

/**
 * talisman-icons: заголовки: talisman_id, base64, filename
 * Фронтенд передаёт [{talismanId, iconUrl}] — iconUrl может быть data URL или чистым base64.
 */
function _uploadTalismanIcons(ss, data) {
  var sheet = ss.getSheetByName('talisman_icons');
  if (!sheet) { sheet = ss.insertSheet('talisman_icons'); sheet.appendRow(['talisman_id', 'base64', 'filename']); }

  var rows = [];
  for (var i = 0; i < data.length; i++) {
    var d = data[i];
    var talismanId = Number(d.talismanId || d.talisman_id || d.id || 0);
    if (!talismanId) continue;
    var rawUrl = d.base64 || d.iconUrl || '';
    var base64 = rawUrl.indexOf(',') !== -1 ? rawUrl.split(',')[1] : rawUrl;
    var filename = d.filename || ('talisman_' + talismanId + '.png');
    rows.push([talismanId, base64, filename]);
  }

  // Дедупликация по talisman_id — новая иконка заменяет старую
  var existingSheet = ss.getSheetByName('talisman_icons');
  var lastRow = existingSheet.getLastRow();
  var existingMap = {};
  if (lastRow > 1) {
    var existing = existingSheet.getRange(2, 1, lastRow - 1, 3).getValues();
    for (var j = 0; j < existing.length; j++) {
      existingMap[String(existing[j][0])] = j + 2; // row number (1-based)
    }
  }

  var toAppend = [];
  for (var k = 0; k < rows.length; k++) {
    var key = String(rows[k][0]);
    if (existingMap[key]) {
      // Обновляем существующую строку
      existingSheet.getRange(existingMap[key], 1, 1, 3).setValues([rows[k]]);
    } else {
      toAppend.push(rows[k]);
    }
  }
  if (toAppend.length > 0) {
    var startRow = existingSheet.getLastRow() + 1;
    existingSheet.getRange(startRow, 1, toAppend.length, 3).setValues(toAppend);
  }
  return rows.length;
}

/**
 * uploadIconsBatch — загружает иконки по категории.
 * Вызывается напрямую (не через adminUpload):
 *   google.script.run.uploadIconsBatch(category, icons)
 *
 * @param {string} category - "hero" | "pet" | "spirit" | "titan" | "creep"
 * @param {Array} icons - [{id, base64, filename}] (фронтенд нормализует перед отправкой)
 * @return {{ success: boolean, count: number } | { error: string }}
 */
function uploadIconsBatch(category, icons) {
  try {
    gasLog('INFO', 'uploadIconsBatch', 'category=' + category + ' count=' + (Array.isArray(icons) ? icons.length : '?'));

    if (!category) return { error: 'category is required' };
    if (!Array.isArray(icons) || icons.length === 0) return { error: 'icons must be a non-empty array' };

    var sheetName = category + '_icons'; // hero_icons, pet_icons, spirit_icons, titan_icons, creep_icons
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(['id', 'base64', 'filename']);
    }

    // Построить карту существующих ID → номер строки
    var lastRow = sheet.getLastRow();
    var existingMap = {};
    if (lastRow > 1) {
      var existing = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (var i = 0; i < existing.length; i++) {
        existingMap[String(existing[i][0])] = i + 2;
      }
    }

    var toAppend = [];
    for (var j = 0; j < icons.length; j++) {
      var icon = icons[j];
      var id = String(icon.id || '');
      if (!id) continue;
      var base64 = icon.base64 || '';
      // На случай если data URL всё же пришёл с префиксом
      if (base64.indexOf(',') !== -1) base64 = base64.split(',')[1];
      var filename = icon.filename || (category + '_' + id + '.png');
      var row = [id, base64, filename];

      if (existingMap[id]) {
        // Обновляем существующую запись
        sheet.getRange(existingMap[id], 1, 1, 3).setValues([row]);
      } else {
        toAppend.push(row);
      }
    }

    if (toAppend.length > 0) {
      var startRow = sheet.getLastRow() + 1;
      sheet.getRange(startRow, 1, toAppend.length, 3).setValues(toAppend);
    }

    gasLog('INFO', 'uploadIconsBatch', 'done category=' + category + ' saved=' + icons.length);
    return { success: true, count: icons.length };

  } catch (e) {
    gasLog('ERROR', 'uploadIconsBatch', e.message, { category: category, stack: e.stack });
    return { error: e.message };
  }
}
```

---

## Также необходимо: `getServerLogs()`

Добавить (или заменить `getLogs()`):

```javascript
function getServerLogs() {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName('logs');
    if (!sheet || sheet.getLastRow() <= 1) {
      return { logs: [] };
    }

    var lastRow = sheet.getLastRow();
    var startRow = Math.max(2, lastRow - 49);
    var numRows = lastRow - startRow + 1;
    var data = sheet.getRange(startRow, 1, numRows, 5).getValues();

    var logs = [];
    for (var i = data.length - 1; i >= 0; i--) {
      var row = data[i];
      if (!row[0]) continue;
      var ts = row[0];
      var tsStr = ts instanceof Date ? ts.toISOString() : String(ts);
      logs.push({
        timestamp: tsStr,
        level: row[1] || 'INFO',
        'function': row[2] || '',
        message: row[3] || '',
        data: row[4] || ''
      });
    }

    return { logs: logs };
  } catch (e) {
    return { error: e.message };
  }
}
```

---

## `saveMainBuffName(slot, name, effectKey)` — сохранение настроек баффа

Вызывается из фронтенда при сохранении баффа A или Б.

**Аргументы:**
- `slot` — строка `"A"` или `"B"`
- `name` — название баффа (строка)
- `effectKey` — ключ эффекта (строка, например `allParamsValueIncrease`)

**Что делает:** сохраняет два значения в лист `settings` (ключ → значение):
- `mainBuffName<slot>` → `name`
- `mainBuffEffectKey<slot>` → `effectKey`

**Лист settings:** строки `[ключ, значение]`. Обновлять upsert-ом (найти строку с нужным ключом — заменить значение; если нет — добавить).

```javascript
function saveMainBuffName(slot, name, effectKey) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName('settings') || ss.insertSheet('settings');

    function upsert(key, value) {
      var data = sheet.getDataRange().getValues();
      for (var i = 0; i < data.length; i++) {
        if (data[i][0] === key) {
          sheet.getRange(i + 1, 2).setValue(value);
          return;
        }
      }
      sheet.appendRow([key, value]);
    }

    upsert('mainBuffName' + slot, name);
    upsert('mainBuffEffectKey' + slot, effectKey);

    return { success: true };
  } catch (e) {
    return { error: e.message };
  }
}
```

---

## Важные замечания

1. **ES5 синтаксис**: никаких `let`, `const`, стрелочных функций, шаблонных строк
2. **`gasLog()`**: вызовы предполагают что утилита уже есть в Code.js (из GAS_LOGGING_SPEC.md). Если нет — удалить вызовы `gasLog()` или добавить функцию
3. **`getSpreadsheet()`**: должна существовать в Code.js (читает ID из ScriptProperties)
4. **Листы**: `_clearAndWrite()` удаляет строки 2+ и записывает новые — т.е. полная замена. Если нужна аддитивная логика — использовать `_appendDedup()`
5. **Фильтр boss_list**: пропускает боссов с `id <= 226` (они неактуальные)
6. **Размер данных**: `attack_teams` с `defenders_fragments` может быть большим — если GAS возвращает timeout, нужна чанковая загрузка (отдельный разговор)
