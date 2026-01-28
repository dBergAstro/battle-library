# Battle Library Tool

## Overview
Инструмент для визуального просмотра и анализа библиотеки боёв из игры Invasion (адвенчуры).

## Текущее состояние
MVP - полностью работающее приложение для загрузки и просмотра данных о боях.

## Функциональность
- Загрузка таблиц через drag-n-drop или кнопку (CSV/JSON)
- Поддержка папок с отдельными JSON-файлами для каждой записи
- Визуальные карточки боёв с:
  - ID боя
  - Составом команды (аватары + имена героев)
  - Главой (label)
  - Номером боя (desc)
  - Типом (героический/титанический)
- Фильтрация по типу боя, главе, поиск
- Тёмная/светлая тема

## Структура данных
### Таблицы для загрузки:
1. **boss_list** (invasion_boss_list-boss_list) - основная таблица боёв
   - id, label (глава), desc (номер боя), heroId (для определения типа)
2. **boss_team** (invasion_boss_list-boss_team) - состав команды
   - id, bossId, heroId, bossLevelId
3. **boss_level** (invasion_boss_list-boss_level) - профили сложности
   - id, name
4. **hero_info** - таблица имён и иконок героев
   - id, name, icon (URL)

### Логика типа боя:
- heroId 3999-4999 = титанический
- Остальные = героический
- Записи с ID <= 226 не актуальны и отфильтрованы

## Технологии
- Frontend: React, TypeScript, Tailwind CSS, Shadcn/ui
- Обработка данных на клиенте (без backend API для данных)
- In-memory storage в браузере

## Запуск
```bash
npm run dev
```
Приложение доступно на порту 5000.

## Структура проекта
```
client/src/
├── components/
│   ├── BattleCard.tsx      # Карточка боя
│   ├── BattleFilters.tsx   # Фильтры и поиск
│   ├── DataUploader.tsx    # Загрузка файлов
│   └── ThemeToggle.tsx     # Переключатель темы
├── lib/
│   └── battleUtils.ts      # Парсинг и обработка данных
├── pages/
│   └── BattleLibrary.tsx   # Главная страница
shared/
└── schema.ts               # Типы данных
```
