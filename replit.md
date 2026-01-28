# Battle Library Tool

## Overview
Инструмент для визуального просмотра и анализа библиотеки боёв из игры Invasion (адвенчуры). 
Использует серверное хранение данных в PostgreSQL - администратор загружает данные один раз, и они становятся доступны всем пользователям.

## Текущее состояние
MVP с серверным хранением - полностью работающее приложение.

## Архитектура

### База данных (PostgreSQL + Drizzle ORM)
Таблицы:
- `boss_list` - основная таблица боёв (id, gameId, label, desc, heroId)
- `boss_team` - состав команды противников (id, bossGameId, heroId, unitId, bossLevelId)
- `boss_level` - уровни сложности боёв (id, gameId, bossId, powerLevel)
- `hero_icons` - иконки персонажей (id, heroId, iconUrl, category)
- `hero_names` - имена персонажей (id, heroId, name)

### API Endpoints
- `GET /api/battles` - получить все данные для отображения библиотеки
- `GET /api/admin/stats` - статистика по загруженным данным
- `POST /api/admin/boss-list` - загрузить данные боёв
- `POST /api/admin/boss-team` - загрузить состав команд
- `POST /api/admin/boss-level` - загрузить уровни с powerLevel
- `POST /api/admin/hero-icons` - загрузить иконки
- `POST /api/admin/hero-names` - загрузить/обновить имена героев

### Страницы
- `/` - Библиотека боёв (просмотр для всех пользователей)
- `/admin` - Панель администратора (загрузка данных)

## Функциональность

### Загрузка данных (Админ)
- Загрузка таблиц (Boss List, Boss Team, Boss Level) через CSV/JSON файл или папку
- Загрузка иконок по категориям: Герои, Крипы, Титаны
- Редактирование имён персонажей (приоритет над встроенными)
- Прогресс-бар для больших наборов данных

### Просмотр библиотеки
- Визуальные карточки боёв с:
  - ID боя (gameId)
  - Составом команды (аватары + имена героев)
  - Главой (label)
  - Номером боя (desc)
  - Типом (героический/титанический)
  - Power Level (если есть данные)
- Фильтрация по типу боя, главе, поиск
- Тёмная/светлая тема

## Структура данных

### Входные данные для загрузки:
1. **boss_list** (invasion_boss_list-boss_list)
   - id, label (глава), desc (номер боя), heroId (для определения типа)
   - Записи с ID <= 226 отфильтрованы как неактуальные
   
2. **boss_team** (invasion_boss_list-boss_team)
   - id, bossId, heroId, unitId, bossLevelId

3. **boss_level** (invasion_boss_list-boss_level)
   - id, bossId, powerLevel

### Иконки персонажей:
- Загружаются из папок по категориям (герои, крипы, титаны)
- Поддерживаемые форматы: PNG, JPG, WebP, SVG
- ID извлекается из последнего числа в имени файла (titan_big_4003.png → 4003)
- Сохраняются как base64 в базе данных

### Имена героев:
- Встроены в код (client/src/lib/heroNames.ts) - 196 персонажей
- Могут быть переопределены через админку (таблица hero_names)
- Приоритет: БД > встроенные имена

### Логика типа боя:
- heroId 3999-4999 = титанический
- Остальные = героический

## Технологии
- Frontend: React, TypeScript, Tailwind CSS, Shadcn/ui
- Backend: Express.js, Drizzle ORM
- Database: PostgreSQL (Neon)
- Валидация: Zod
- Data fetching: TanStack Query

## Запуск
```bash
npm run dev
```
Приложение доступно на порту 5000.

## Структура проекта
```
client/src/
├── components/
│   ├── BattleCard.tsx      # Карточка боя (с powerLevel)
│   ├── BattleFilters.tsx   # Фильтры и поиск
│   └── ThemeToggle.tsx     # Переключатель темы
├── lib/
│   ├── battleUtils.ts      # Парсинг и обработка данных
│   └── heroNames.ts        # Справочник имён героев (встроенные)
├── pages/
│   ├── BattleLibrary.tsx   # Главная страница библиотеки
│   └── AdminPanel.tsx      # Панель администратора
server/
├── db.ts                   # Подключение к PostgreSQL
├── storage.ts              # CRUD операции с БД
├── routes.ts               # API endpoints
shared/
└── schema.ts               # Drizzle схема + типы
```
