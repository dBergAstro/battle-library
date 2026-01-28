import { z } from "zod";

// Boss List - основная таблица боёв
export const bossListSchema = z.object({
  id: z.number(),
  label: z.string().optional(), // Глава
  desc: z.string().optional(), // Номер боя в главе
  heroId: z.number().optional(), // Для определения типа боя
});

export type BossList = z.infer<typeof bossListSchema>;

// Boss Team - состав противников
export const bossTeamSchema = z.object({
  id: z.number(),
  bossId: z.number().optional(), // Связь с boss_list
  heroId: z.number().optional(), // ID героя/титана (альтернатива unitId)
  unitId: z.number().optional(), // ID юнита (альтернатива heroId)
  bossLevelId: z.number().optional(), // Профиль сложности
});

export type BossTeam = z.infer<typeof bossTeamSchema>;

// Boss Level - профили сложности
export const bossLevelSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
});

export type BossLevel = z.infer<typeof bossLevelSchema>;

// Hero Info - таблица конвертации ID в имена и иконки
export const heroInfoSchema = z.object({
  id: z.number(),
  name: z.string(),
  icon: z.string().optional(), // URL или путь к иконке
});

export type HeroInfo = z.infer<typeof heroInfoSchema>;

// Тип боя
export type BattleType = "heroic" | "titanic";

// Обработанные данные боя для отображения
export interface ProcessedBattle {
  id: number;
  chapter: string;
  battleNumber: string;
  type: BattleType;
  team: {
    heroId: number;
    name: string;
    icon?: string;
  }[];
}

// Состояние загруженных данных
export interface LoadedData {
  bossList: BossList[];
  bossTeam: BossTeam[];
  bossLevel: BossLevel[];
  heroInfo: HeroInfo[];
}
