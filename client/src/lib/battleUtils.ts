import type { ProcessedBattle, BattleType, ElementType, TotemInfo } from "@shared/schema";
import { getHeroName as getDefaultHeroName } from "./heroNames";

// Типы для данных с сервера
export interface ServerBossList {
  id: number;
  gameId: number;
  label: string | null;
  desc: string | null;
  heroId: number | null;
}

export interface ServerBossTeam {
  id: number;
  bossGameId: number;
  heroId: number | null;
  unitId: number | null;
  bossLevelId: number | null;
}

export interface ServerBossLevel {
  id: number;
  gameId: number;
  bossId: number | null;
  powerLevel: number | null;
}

export interface ServerHeroIcon {
  id: number;
  heroId: number;
  iconUrl: string;
  category: string | null;
}

export interface ServerHeroName {
  id: number;
  heroId: number;
  name: string;
}

export interface ServerHeroSortOrder {
  id: number;
  heroId: number;
  sortOrder: number;
}

export interface ServerTitanElement {
  id: number;
  titanId: number;
  element: string;
  points: number;
}

export function determineBattleType(heroId: number | null | undefined): BattleType {
  if (heroId && heroId >= 3999 && heroId <= 4999) {
    return "titanic";
  }
  return "heroic";
}

// Вычисляем номер главы из gameId или label
export function extractChapter(gameId: number, label: string | null): number {
  // Для новых боёв (>= 338) парсим номер главы из label
  if (gameId >= 338 && label) {
    const match = label.match(/(\d+)\s*глава/i);
    if (match) {
      return parseInt(match[1], 10);
    }
  }
  
  // Для старых боёв (< 338) вычисляем главу
  // 7 глав по 8 боёв = 56 боёв на адвенчуру
  const positionInAdventure = (gameId - 227) % 56;
  return Math.floor(positionInAdventure / 8) + 1;
}

// Извлекаем название адвенчуры из label
export function extractAdventureName(gameId: number, label: string | null): string {
  if (gameId >= 338 && label) {
    // "Адвенчура Каскада 1 глава" -> "Каскада"
    const match = label.match(/Адвенчура\s+(\S+)/i);
    if (match) {
      return match[1];
    }
  }
  
  // Для старых боёв определяем адвенчуру по номеру
  const adventureIndex = Math.floor((gameId - 227) / 56);
  const oldAdventures = ["Легаси 1", "Легаси 2"];
  return oldAdventures[adventureIndex] || `Легаси ${adventureIndex + 1}`;
}

// Порог очков для активации тотема
const ELEMENT_THRESHOLDS: Record<string, number> = {
  "вода": 3,
  "огонь": 3,
  "земля": 3,
  "тьма": 2,
  "свет": 2,
};

// Эмодзи для стихий
export const ELEMENT_EMOJIS: Record<string, string> = {
  "вода": "💧",
  "огонь": "🔥",
  "земля": "🌍",
  "тьма": "🌑",
  "свет": "☀️",
};

function calculateTotems(
  teamMembers: { heroId: number }[],
  titanElementsMap: Map<number, { element: string; points: number }>
): TotemInfo[] {
  // Считаем очки по стихиям
  const elementPoints: Record<string, number> = {};

  for (const member of teamMembers) {
    const titanData = titanElementsMap.get(member.heroId);
    if (titanData) {
      elementPoints[titanData.element] = (elementPoints[titanData.element] || 0) + titanData.points;
    }
  }

  // Определяем какие стихии достигли порога
  const activeTotems: TotemInfo[] = [];
  
  for (const [element, points] of Object.entries(elementPoints)) {
    const threshold = ELEMENT_THRESHOLDS[element];
    if (threshold && points >= threshold) {
      activeTotems.push({ element: element as ElementType, points });
    }
  }

  // Сортируем по количеству очков (больше = приоритетнее) и берём максимум 2
  activeTotems.sort((a, b) => b.points - a.points);
  return activeTotems.slice(0, 2);
}

export function processBattlesFromServer(
  bossList: ServerBossList[],
  bossTeam: ServerBossTeam[],
  bossLevel: ServerBossLevel[],
  heroIcons: ServerHeroIcon[],
  heroNames: ServerHeroName[],
  heroSortOrder: ServerHeroSortOrder[],
  titanElements: ServerTitanElement[]
): ProcessedBattle[] {
  const iconMap = new Map(heroIcons.map((h) => [h.heroId, h.iconUrl]));
  const nameMap = new Map(heroNames.map((h) => [h.heroId, h.name]));
  const sortOrderMap = new Map(heroSortOrder.map((h) => [h.heroId, h.sortOrder]));
  const titanElementsMap = new Map(titanElements.map((t) => [t.titanId, { element: t.element, points: t.points }]));
  const levelMap = new Map(bossLevel.map((l) => [l.gameId, l.powerLevel]));

  const getHeroNameFn = (heroId: number): string => {
    return nameMap.get(heroId) || getDefaultHeroName(heroId);
  };

  const battles: ProcessedBattle[] = bossList.map((boss) => {
    const battleType = determineBattleType(boss.heroId);
    
    let teamMembers = bossTeam
      .filter((t) => t.bossGameId === boss.gameId)
      .slice(0, 5)
      .map((t) => {
        const heroId = t.heroId ?? t.unitId ?? 0;
        return {
          heroId: heroId,
          name: getHeroNameFn(heroId),
          icon: iconMap.get(heroId),
          sortOrder: sortOrderMap.get(heroId),
        };
      });

    // Сортируем команду по sortOrder (если есть), иначе по heroId
    teamMembers.sort((a, b) => {
      const orderA = a.sortOrder ?? Infinity;
      const orderB = b.sortOrder ?? Infinity;
      if (orderA !== orderB) return orderA - orderB;
      return a.heroId - b.heroId;
    });

    // Вычисляем тотемы только для титанических боёв
    const totems = battleType === "titanic" 
      ? calculateTotems(teamMembers, titanElementsMap) 
      : [];

    // Находим powerLevel для команды и проверяем на смешанность
    const teamBossLevelIds = bossTeam
      .filter((t) => t.bossGameId === boss.gameId && t.bossLevelId != null)
      .map((t) => t.bossLevelId!);
    
    // Получаем уникальные bossLevelId
    const uniqueBossLevelIds = Array.from(new Set(teamBossLevelIds));
    const isMixedPowerLevel = uniqueBossLevelIds.length > 1;
    
    // Берём powerLevel из первого bossLevelId или максимальный если смешанный
    let powerLevel: number | undefined;
    if (uniqueBossLevelIds.length > 0) {
      const powerLevels = uniqueBossLevelIds.map(id => levelMap.get(id)).filter((v): v is number => v != null);
      powerLevel = powerLevels.length > 0 ? Math.max(...powerLevels) : undefined;
    }

    return {
      id: boss.id,
      gameId: boss.gameId,
      chapterNumber: extractChapter(boss.gameId, boss.label),
      adventureName: extractAdventureName(boss.gameId, boss.label),
      originalLabel: boss.label ?? "",
      battleNumber: boss.desc ?? "Unknown Battle",
      type: battleType,
      powerLevel: powerLevel,
      isMixedPowerLevel: isMixedPowerLevel,
      totems: totems,
      team: teamMembers,
    };
  });

  return battles.sort((a, b) => b.gameId - a.gameId);
}

// Типы для загрузки файлов
export interface InputBossList {
  id: number;
  label?: string;
  desc?: string;
  heroId?: number;
}

export interface InputBossTeam {
  id: number;
  bossId?: number;
  heroId?: number;
  unitId?: number;
  bossLevelId?: number;
}

export interface InputBossLevel {
  id: number;
  bossId?: number;
  powerLevel?: number;
}

export function parseCSV(text: string): Record<string, unknown>[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows: Record<string, unknown>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, unknown> = {};
    headers.forEach((header, idx) => {
      let value: unknown = values[idx] || "";
      if (typeof value === "string") {
        value = value.replace(/^"|"$/g, "").trim();
        if (isNumericField(header)) {
          const num = Number(value);
          if (!isNaN(num) && value !== "") {
            value = num;
          }
        }
      }
      row[header] = value;
    });
    rows.push(row);
  }

  return rows;
}

function isNumericField(fieldName: string): boolean {
  const numericFields = ["id", "heroId", "bossId", "bossLevelId", "unitId", "powerLevel"];
  return numericFields.includes(fieldName);
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

export function parseJSON(text: string): Record<string, unknown>[] {
  try {
    const data = JSON.parse(text);
    if (Array.isArray(data)) {
      return data;
    }
    return [data];
  } catch {
    return [];
  }
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateBossList(data: Record<string, unknown>[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (data.length === 0) {
    errors.push("Данные пустые");
    return { valid: false, errors, warnings };
  }

  // Проверяем что это данные, а не схема таблицы
  const sample = data[0];
  if ("columns" in sample || "table" in sample) {
    errors.push("Это файл схемы, а не данные. Загрузите папку с JSON файлами данных.");
    return { valid: false, errors, warnings };
  }

  if (!("id" in sample)) {
    errors.push("Отсутствует поле 'id'");
  }

  if (!("label" in sample)) {
    warnings.push("Отсутствует поле 'label' (глава)");
  }
  if (!("desc" in sample)) {
    warnings.push("Отсутствует поле 'desc' (номер боя)");
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function validateBossTeam(data: Record<string, unknown>[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (data.length === 0) {
    errors.push("Данные пустые");
    return { valid: false, errors, warnings };
  }

  const sample = data[0];
  const hasId = "id" in sample;
  const hasBossId = "bossId" in sample;
  const hasHeroId = "heroId" in sample;
  const hasUnitId = "unitId" in sample;

  if (!hasId && !hasBossId) {
    errors.push("Отсутствует поле 'id' или 'bossId' для связи с боем");
  }
  if (!hasHeroId && !hasUnitId) {
    errors.push("Отсутствует поле 'heroId' или 'unitId'");
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function validateBossLevel(data: Record<string, unknown>[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (data.length === 0) {
    errors.push("Данные пустые");
    return { valid: false, errors, warnings };
  }

  const sample = data[0];
  if (!("id" in sample)) {
    errors.push("Отсутствует поле 'id'");
  }
  if (!("powerLevel" in sample)) {
    warnings.push("Отсутствует поле 'powerLevel'");
  }

  return { valid: errors.length === 0, errors, warnings };
}

// Парсинг данных имён героев из текста
// Формат: "id\tname" или "id name" на каждой строке
export function parseHeroNamesText(text: string): Array<{ heroId: number; name: string }> {
  const lines = text.trim().split("\n");
  const result: Array<{ heroId: number; name: string }> = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Разделитель: табуляция или первый пробел
    const tabIndex = trimmed.indexOf("\t");
    let heroId: number;
    let name: string;

    if (tabIndex !== -1) {
      heroId = parseInt(trimmed.slice(0, tabIndex), 10);
      name = trimmed.slice(tabIndex + 1).trim();
    } else {
      const spaceIndex = trimmed.indexOf(" ");
      if (spaceIndex === -1) continue;
      heroId = parseInt(trimmed.slice(0, spaceIndex), 10);
      name = trimmed.slice(spaceIndex + 1).trim();
    }

    if (!isNaN(heroId) && name) {
      result.push({ heroId, name });
    }
  }

  return result;
}

// Парсинг данных порядка сортировки из текста
// Формат: "id\torder" или "id order" на каждой строке
export function parseSortOrderText(text: string): Array<{ heroId: number; sortOrder: number }> {
  const lines = text.trim().split("\n");
  const result: Array<{ heroId: number; sortOrder: number }> = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Разделители: табуляция или пробел
    const parts = trimmed.split(/[\t\s]+/);
    if (parts.length >= 2) {
      const heroId = parseInt(parts[0], 10);
      const sortOrder = parseFloat(parts[1]);

      if (!isNaN(heroId) && !isNaN(sortOrder)) {
        result.push({ heroId, sortOrder });
      }
    }
  }

  return result;
}

// Парсинг данных стихий титанов из текста
// Формат: "id element points" на каждой строке
export function parseTitanElementsText(text: string): Array<{ titanId: number; element: string; points: number }> {
  const lines = text.trim().split("\n");
  const result: Array<{ titanId: number; element: string; points: number }> = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Разделители: табуляция или пробел
    const parts = trimmed.split(/[\t\s]+/);
    if (parts.length >= 3) {
      const titanId = parseInt(parts[0], 10);
      const element = parts[1].toLowerCase();
      const points = parseInt(parts[2], 10);

      if (!isNaN(titanId) && !isNaN(points) && element) {
        result.push({ titanId, element, points });
      }
    }
  }

  return result;
}
