# GAS Code.js — Logging Specification

> Этот файл описывает все изменения, которые нужно внести в `Code.js` для реализации серверного логирования.
> Все изменения копируются вручную в gas-tools монорепо.

---

## 1. Новый лист `logs`

Создать лист `logs` в Google Sheets с колонками:

| Колонка | Тип | Описание |
|---------|-----|----------|
| `timestamp` | string | ISO 8601 дата/время записи |
| `level` | string | `DEBUG`, `INFO`, `WARN`, `ERROR` |
| `function` | string | Имя серверной функции |
| `message` | string | Описание события |
| `data` | string | JSON-данные (обрезаются до 500 символов) |

Добавить константу листа:

```javascript
var SHEET_LOGS = 'logs';
```

В функции `setupSheet()` добавить создание листа:

```javascript
// В setupSheet() — добавить после существующих листов:
createSheetIfMissing(ss, SHEET_LOGS, ['timestamp', 'level', 'function', 'message', 'data']);
```

---

## 2. Утилита `gasLog(level, fn, message, data)`

Добавить в начало `Code.js` (после констант листов):

```javascript
/**
 * Записывает лог в лист 'logs'.
 * @param {string} level — DEBUG | INFO | WARN | ERROR
 * @param {string} fn — имя функции
 * @param {string} message — сообщение
 * @param {*} [data] — опциональные данные (объект, массив, строка)
 */
function gasLog(level, fn, message, data) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_LOGS);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_LOGS);
      sheet.appendRow(['timestamp', 'level', 'function', 'message', 'data']);
    }

    var dataStr = '';
    if (data !== undefined && data !== null) {
      try {
        dataStr = JSON.stringify(data);
        if (dataStr.length > 500) {
          dataStr = dataStr.substring(0, 497) + '...';
        }
      } catch (e) {
        dataStr = String(data).substring(0, 500);
      }
    }

    var timestamp = new Date().toISOString();
    sheet.appendRow([timestamp, level, fn, message, dataStr]);

    // Trim to last 500 rows (+ 1 header)
    var totalRows = sheet.getLastRow();
    if (totalRows > 501) {
      sheet.deleteRows(2, totalRows - 501);
    }
  } catch (e) {
    // Silent fail — logging should never break the main flow
    Logger.log('gasLog error: ' + e.message);
  }
}
```

---

## 3. Обёртка публичных функций

Каждую публичную GAS-функцию нужно обернуть в try/catch с логированием входа, выхода и ошибок.

### Паттерн обёртки

```javascript
function exampleFunction(arg1, arg2) {
  gasLog('INFO', 'exampleFunction', 'entry', { arg1: arg1 });
  try {
    // ... оригинальная логика ...
    var result = originalLogic();
    var count = Array.isArray(result) ? result.length : (result && result.items ? result.items.length : 1);
    gasLog('INFO', 'exampleFunction', 'exit', { count: count });
    return result;
  } catch (e) {
    gasLog('ERROR', 'exampleFunction', e.message, { stack: e.stack });
    return { error: e.message };
  }
}
```

### Конкретные функции для обёртки

#### `getBattles()`

```javascript
function getBattles() {
  gasLog('INFO', 'getBattles', 'entry');
  try {
    // ... существующая логика (оставить как есть) ...
    var result = /* существующий код возврата */;
    gasLog('INFO', 'getBattles', 'exit', {
      bossList: result.bossList ? result.bossList.length : 0,
      bossTeam: result.bossTeam ? result.bossTeam.length : 0,
      heroIcons: result.heroIcons ? result.heroIcons.length : 0
    });
    return result;
  } catch (e) {
    gasLog('ERROR', 'getBattles', e.message, { stack: e.stack });
    return { error: e.message };
  }
}
```

#### `getReplays()`

```javascript
function getReplays() {
  gasLog('INFO', 'getReplays', 'entry');
  try {
    var result = /* существующий код */;
    gasLog('INFO', 'getReplays', 'exit', {
      attackTeams: result.attackTeams ? result.attackTeams.length : 0
    });
    return result;
  } catch (e) {
    gasLog('ERROR', 'getReplays', e.message, { stack: e.stack });
    return { error: e.message };
  }
}
```

#### `getTags()`

```javascript
function getTags() {
  gasLog('INFO', 'getTags', 'entry');
  try {
    var result = /* существующий код */;
    gasLog('INFO', 'getTags', 'exit', {
      count: result.tags ? result.tags.length : 0
    });
    return result;
  } catch (e) {
    gasLog('ERROR', 'getTags', e.message, { stack: e.stack });
    return { error: e.message };
  }
}
```

#### `getCollection()`

```javascript
function getCollection() {
  gasLog('INFO', 'getCollection', 'entry');
  try {
    var result = /* существующий код */;
    gasLog('INFO', 'getCollection', 'exit', {
      count: result.items ? result.items.length : 0
    });
    return result;
  } catch (e) {
    gasLog('ERROR', 'getCollection', e.message, { stack: e.stack });
    return { error: e.message };
  }
}
```

#### `adminUpload(type, data)`

```javascript
function adminUpload(type, data) {
  var count = Array.isArray(data) ? data.length : 0;
  gasLog('INFO', 'adminUpload', 'entry', { type: type, count: count });
  try {
    var result = /* существующий код */;
    gasLog('INFO', 'adminUpload', 'exit', { type: type, result: result });
    return result;
  } catch (e) {
    gasLog('ERROR', 'adminUpload', e.message, { type: type, stack: e.stack });
    return { error: e.message };
  }
}
```

#### `uploadIconsBatch(category, icons)`

```javascript
function uploadIconsBatch(category, icons) {
  var count = Array.isArray(icons) ? icons.length : 0;
  gasLog('INFO', 'uploadIconsBatch', 'entry', { category: category, count: count });
  try {
    var result = /* существующий код */;
    gasLog('INFO', 'uploadIconsBatch', 'exit', { category: category, uploaded: result.uploaded, errors: result.errors });
    return result;
  } catch (e) {
    gasLog('ERROR', 'uploadIconsBatch', e.message, { category: category, stack: e.stack });
    return { error: e.message };
  }
}
```

#### `saveTag(battleGameId, tag)`

```javascript
function saveTag(battleGameId, tag) {
  gasLog('INFO', 'saveTag', 'entry', { battleGameId: battleGameId, tag: tag });
  try {
    var result = /* существующий код */;
    gasLog('INFO', 'saveTag', 'exit');
    return result;
  } catch (e) {
    gasLog('ERROR', 'saveTag', e.message, { battleGameId: battleGameId });
    return { error: e.message };
  }
}
```

#### `deleteTag(battleGameId, tag)`

```javascript
function deleteTag(battleGameId, tag) {
  gasLog('INFO', 'deleteTag', 'entry', { battleGameId: battleGameId, tag: tag });
  try {
    var result = /* существующий код */;
    gasLog('INFO', 'deleteTag', 'exit');
    return result;
  } catch (e) {
    gasLog('ERROR', 'deleteTag', e.message, { battleGameId: battleGameId });
    return { error: e.message };
  }
}
```

#### `saveCollectionItem(data)`

```javascript
function saveCollectionItem(data) {
  gasLog('INFO', 'saveCollectionItem', 'entry', { itemId: data ? data.itemId : null });
  try {
    var result = /* существующий код */;
    gasLog('INFO', 'saveCollectionItem', 'exit');
    return result;
  } catch (e) {
    gasLog('ERROR', 'saveCollectionItem', e.message);
    return { error: e.message };
  }
}
```

#### `deleteCollectionItem(itemId)`

```javascript
function deleteCollectionItem(itemId) {
  gasLog('INFO', 'deleteCollectionItem', 'entry', { itemId: itemId });
  try {
    var result = /* существующий код */;
    gasLog('INFO', 'deleteCollectionItem', 'exit');
    return result;
  } catch (e) {
    gasLog('ERROR', 'deleteCollectionItem', e.message, { itemId: itemId });
    return { error: e.message };
  }
}
```

#### `clearCollection()`

```javascript
function clearCollection() {
  gasLog('INFO', 'clearCollection', 'entry');
  try {
    var result = /* существующий код */;
    gasLog('INFO', 'clearCollection', 'exit');
    return result;
  } catch (e) {
    gasLog('ERROR', 'clearCollection', e.message);
    return { error: e.message };
  }
}
```

#### `setMainBuffName(name)` (a.k.a. `saveMainBuffName`)

```javascript
function saveMainBuffName(name) {
  gasLog('INFO', 'saveMainBuffName', 'entry', { name: name });
  try {
    var result = /* существующий код */;
    gasLog('INFO', 'saveMainBuffName', 'exit');
    return result;
  } catch (e) {
    gasLog('ERROR', 'saveMainBuffName', e.message, { name: name });
    return { error: e.message };
  }
}
```

#### `saveBuffNames(namesJson)`

```javascript
function saveBuffNames(namesJson) {
  gasLog('INFO', 'saveBuffNames', 'entry', { raw: namesJson ? namesJson.substring(0, 100) : null });
  try {
    var result = /* существующий код */;
    gasLog('INFO', 'saveBuffNames', 'exit', { count: result.count });
    return result;
  } catch (e) {
    gasLog('ERROR', 'saveBuffNames', e.message);
    return { error: e.message };
  }
}
```

#### `syncFromGitLab(branch)`

```javascript
function syncFromGitLab(branch) {
  gasLog('INFO', 'syncFromGitLab', 'entry', { branch: branch });
  try {
    var result = /* существующий код */;
    gasLog('INFO', 'syncFromGitLab', 'exit', { added: result.added });
    return result;
  } catch (e) {
    gasLog('ERROR', 'syncFromGitLab', e.message, { branch: branch, stack: e.stack });
    return { error: e.message };
  }
}
```

---

## 4. Функция `getServerLogs()`

Добавить новую публичную функцию:

```javascript
/**
 * Возвращает последние 50 серверных логов.
 * Вызывается с клиента через google.script.run.getServerLogs()
 * @return {{ logs: Array<{timestamp: string, level: string, function: string, message: string, data: string}> }}
 */
function getServerLogs() {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_LOGS);
    if (!sheet || sheet.getLastRow() <= 1) {
      return { logs: [] };
    }

    var lastRow = sheet.getLastRow();
    var startRow = Math.max(2, lastRow - 49); // Last 50 rows
    var numRows = lastRow - startRow + 1;
    var data = sheet.getRange(startRow, 1, numRows, 5).getValues();

    var logs = [];
    for (var i = data.length - 1; i >= 0; i--) {
      var row = data[i];
      if (!row[0]) continue;
      logs.push({
        timestamp: row[0],
        level: row[1] || 'INFO',
        function: row[2] || '',
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

## 5. Операции с листами — логирование

При каждой операции чтения/записи листа можно добавить DEBUG-логи для трассировки:

```javascript
function readSheet(sheetName) {
  gasLog('DEBUG', 'readSheet', 'reading ' + sheetName);
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    gasLog('WARN', 'readSheet', 'sheet not found: ' + sheetName);
    return [];
  }
  var data = sheet.getDataRange().getValues();
  gasLog('DEBUG', 'readSheet', 'read ' + sheetName, { rows: data.length - 1 });
  return data;
}
```

---

## Итого: Чеклист изменений в Code.js

- [ ] Добавить константу `SHEET_LOGS = 'logs'`
- [ ] Добавить лист `logs` в `setupSheet()`
- [ ] Добавить функцию `gasLog(level, fn, message, data)`
- [ ] Обернуть `getBattles()` — entry/exit/error
- [ ] Обернуть `getReplays()` — entry/exit/error
- [ ] Обернуть `getTags()` — entry/exit/error
- [ ] Обернуть `getCollection()` — entry/exit/error
- [ ] Обернуть `adminUpload()` — entry/exit/error
- [ ] Обернуть `uploadIconsBatch()` — entry/exit/error
- [ ] Обернуть `saveTag()` — entry/exit/error
- [ ] Обернуть `deleteTag()` — entry/exit/error
- [ ] Обернуть `saveCollectionItem()` — entry/exit/error
- [ ] Обернуть `deleteCollectionItem()` — entry/exit/error
- [ ] Обернуть `clearCollection()` — entry/exit/error
- [ ] Обернуть `saveMainBuffName()` — entry/exit/error
- [ ] Обернуть `saveBuffNames()` — entry/exit/error
- [ ] Обернуть `syncFromGitLab()` — entry/exit/error
- [ ] Добавить функцию `getServerLogs()` — возврат последних 50 логов
- [ ] (Опционально) Добавить DEBUG-логи в утилиты чтения/записи листов
