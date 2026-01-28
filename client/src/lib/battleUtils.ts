import type { BossList, BossTeam, ProcessedBattle, BattleType } from "@shared/schema";
import { getHeroName } from "./heroNames";

export function determineBattleType(heroId: number | undefined): BattleType {
  if (heroId && heroId >= 3999 && heroId <= 4999) {
    return "titanic";
  }
  return "heroic";
}

export function processBattles(
  bossList: BossList[],
  bossTeam: BossTeam[],
  heroIcons: Map<number, string>
): ProcessedBattle[] {
  const battles: ProcessedBattle[] = bossList
    .filter((boss) => boss.id > 226)
    .map((boss) => {
      const teamMembers = bossTeam
        .filter((t) => {
          const teamBossId = t.bossId ?? t.id;
          return teamBossId === boss.id;
        })
        .slice(0, 5)
        .map((t) => {
          return {
            heroId: t.heroId,
            name: getHeroName(t.heroId),
            icon: heroIcons.get(t.heroId),
          };
        });

      return {
        id: boss.id,
        chapter: String(boss.label ?? "Unknown Chapter"),
        battleNumber: String(boss.desc ?? "Unknown Battle"),
        type: determineBattleType(boss.heroId),
        team: teamMembers,
      };
    });

  return battles.sort((a, b) => b.id - a.id);
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
  const numericFields = ["id", "heroId", "bossId", "bossLevelId"];
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

  const sample = data[0];
  if (!("id" in sample)) {
    errors.push("Отсутствует поле 'id'");
  }

  const hasLabel = "label" in sample;
  const hasDesc = "desc" in sample;

  if (!hasLabel) {
    warnings.push("Отсутствует поле 'label' (глава)");
  }
  if (!hasDesc) {
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

  if (!hasId && !hasBossId) {
    errors.push("Отсутствует поле 'id' или 'bossId' для связи с боем");
  }
  if (!hasHeroId) {
    errors.push("Отсутствует поле 'heroId'");
  }

  return { valid: errors.length === 0, errors, warnings };
}

