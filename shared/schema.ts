import { pgTable, serial, integer, text, real } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Boss List - основная таблица боёв
export const bossList = pgTable("boss_list", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").notNull().unique(),
  label: text("label"),
  desc: text("desc"),
  heroId: integer("hero_id"),
});

export const bossListRelations = relations(bossList, ({ many }) => ({
  team: many(bossTeam),
  levels: many(bossLevel),
}));

export const insertBossListSchema = createInsertSchema(bossList).omit({ id: true });
export type InsertBossList = z.infer<typeof insertBossListSchema>;
export type BossList = typeof bossList.$inferSelect;

// Boss Team - состав противников
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
  level: one(bossLevel, {
    fields: [bossTeam.bossLevelId],
    references: [bossLevel.gameId],
  }),
}));

export const insertBossTeamSchema = createInsertSchema(bossTeam).omit({ id: true });
export type InsertBossTeam = z.infer<typeof insertBossTeamSchema>;
export type BossTeam = typeof bossTeam.$inferSelect;

// Boss Level - уровни сложности боёв с powerLevel
export const bossLevel = pgTable("boss_level", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").notNull().unique(),
  bossId: integer("boss_id"),
  powerLevel: integer("power_level"),
});

export const bossLevelRelations = relations(bossLevel, ({ one }) => ({
  boss: one(bossList, {
    fields: [bossLevel.bossId],
    references: [bossList.gameId],
  }),
}));

export const insertBossLevelSchema = createInsertSchema(bossLevel).omit({ id: true });
export type InsertBossLevel = z.infer<typeof insertBossLevelSchema>;
export type BossLevel = typeof bossLevel.$inferSelect;

// Hero Icons - иконки персонажей
export const heroIcons = pgTable("hero_icons", {
  id: serial("id").primaryKey(),
  heroId: integer("hero_id").notNull().unique(),
  iconUrl: text("icon_url").notNull(),
  category: text("category"),
});

export const insertHeroIconSchema = createInsertSchema(heroIcons).omit({ id: true });
export type InsertHeroIcon = z.infer<typeof insertHeroIconSchema>;
export type HeroIcon = typeof heroIcons.$inferSelect;

// Hero Names - имена персонажей
export const heroNames = pgTable("hero_names", {
  id: serial("id").primaryKey(),
  heroId: integer("hero_id").notNull().unique(),
  name: text("name").notNull(),
});

export const insertHeroNameSchema = createInsertSchema(heroNames).omit({ id: true });
export type InsertHeroName = z.infer<typeof insertHeroNameSchema>;
export type HeroName = typeof heroNames.$inferSelect;

// Hero Sort Order - порядок сортировки героев/титанов
export const heroSortOrder = pgTable("hero_sort_order", {
  id: serial("id").primaryKey(),
  heroId: integer("hero_id").notNull().unique(),
  sortOrder: real("sort_order").notNull(),
});

export const insertHeroSortOrderSchema = createInsertSchema(heroSortOrder).omit({ id: true });
export type InsertHeroSortOrder = z.infer<typeof insertHeroSortOrderSchema>;
export type HeroSortOrder = typeof heroSortOrder.$inferSelect;

// Titan Elements - стихии титанов
export const titanElements = pgTable("titan_elements", {
  id: serial("id").primaryKey(),
  titanId: integer("titan_id").notNull().unique(),
  element: text("element").notNull(), // вода, огонь, земля, тьма, свет
  points: integer("points").notNull(),
});

export const insertTitanElementSchema = createInsertSchema(titanElements).omit({ id: true });
export type InsertTitanElement = z.infer<typeof insertTitanElementSchema>;
export type TitanElement = typeof titanElements.$inferSelect;

// Тип боя
export type BattleType = "heroic" | "titanic";

// Типы стихий
export type ElementType = "вода" | "огонь" | "земля" | "тьма" | "свет";

// Тотем стихии
export interface TotemInfo {
  element: ElementType;
  points: number;
}

// Обработанные данные боя для отображения
export interface ProcessedBattle {
  id: number;
  gameId: number;
  chapter: string;
  battleNumber: string;
  type: BattleType;
  powerLevel?: number;
  totems: TotemInfo[]; // до 2 тотемов стихий
  team: {
    heroId: number;
    name: string;
    icon?: string;
    sortOrder?: number;
  }[];
}
