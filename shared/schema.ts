import { pgTable, serial, integer, text } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Boss List - основная таблица боёв (Drizzle ORM)
export const bossList = pgTable("boss_list", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").notNull().unique(),
  label: text("label"),
  desc: text("desc"),
  heroId: integer("hero_id"),
});

export const bossListRelations = relations(bossList, ({ many }) => ({
  team: many(bossTeam),
}));

export const insertBossListSchema = createInsertSchema(bossList).omit({ id: true });
export type InsertBossList = z.infer<typeof insertBossListSchema>;
export type BossList = typeof bossList.$inferSelect;

// Boss Team - состав противников (Drizzle ORM)
export const bossTeam = pgTable("boss_team", {
  id: serial("id").primaryKey(),
  bossGameId: integer("boss_game_id").notNull(),
  heroId: integer("hero_id"),
  unitId: integer("unit_id"),
  bossLevelId: integer("boss_level_id"),
});

export const bossTeamRelations = relations(bossTeam, ({ one }) => ({
  boss: one(bossList, {
    fields: [bossTeam.bossGameId],
    references: [bossList.gameId],
  }),
}));

export const insertBossTeamSchema = createInsertSchema(bossTeam).omit({ id: true });
export type InsertBossTeam = z.infer<typeof insertBossTeamSchema>;
export type BossTeam = typeof bossTeam.$inferSelect;

// Hero Icons - иконки персонажей (Drizzle ORM)
export const heroIcons = pgTable("hero_icons", {
  id: serial("id").primaryKey(),
  heroId: integer("hero_id").notNull().unique(),
  iconUrl: text("icon_url").notNull(),
});

export const insertHeroIconSchema = createInsertSchema(heroIcons).omit({ id: true });
export type InsertHeroIcon = z.infer<typeof insertHeroIconSchema>;
export type HeroIcon = typeof heroIcons.$inferSelect;

// Тип боя
export type BattleType = "heroic" | "titanic";

// Обработанные данные боя для отображения (не в БД)
export interface ProcessedBattle {
  id: number;
  gameId: number;
  chapter: string;
  battleNumber: string;
  type: BattleType;
  team: {
    heroId: number;
    name: string;
    icon?: string;
  }[];
}

// Zod схемы для валидации входящих данных (при загрузке файлов)
export const bossListInputSchema = z.object({
  id: z.number(),
  label: z.string().optional(),
  desc: z.string().optional(),
  heroId: z.number().optional(),
});

export const bossTeamInputSchema = z.object({
  id: z.number(),
  bossId: z.number().optional(),
  heroId: z.number().optional(),
  unitId: z.number().optional(),
  bossLevelId: z.number().optional(),
});

export type BossListInput = z.infer<typeof bossListInputSchema>;
export type BossTeamInput = z.infer<typeof bossTeamInputSchema>;
