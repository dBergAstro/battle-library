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

// Attack Teams - записи (replays)
export const attackTeams = pgTable("attack_teams", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").notNull().unique(), // id из исходных данных
  invasionId: integer("invasion_id"),
  bossId: integer("boss_id"),
  bossLevel: integer("boss_level"),
  chapter: integer("chapter"),
  level: integer("level"), // номер боя в главе
  enemyType: text("enemy_type"), // "Герои" или "Титаны"
  mainBuff: integer("main_buff"),
  comment: text("comment"),
  defendersFragments: text("defenders_fragments"), // JSON строка
});

export const insertAttackTeamSchema = createInsertSchema(attackTeams).omit({ id: true });
export type InsertAttackTeam = z.infer<typeof insertAttackTeamSchema>;
export type AttackTeam = typeof attackTeams.$inferSelect;

// Pet Icons - иконки питомцев
export const petIcons = pgTable("pet_icons", {
  id: serial("id").primaryKey(),
  petId: integer("pet_id").notNull().unique(),
  iconUrl: text("icon_url").notNull(),
});

export const insertPetIconSchema = createInsertSchema(petIcons).omit({ id: true });
export type InsertPetIcon = z.infer<typeof insertPetIconSchema>;
export type PetIcon = typeof petIcons.$inferSelect;

// App Settings - настройки приложения
export const appSettings = pgTable("app_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
});

export const insertAppSettingSchema = createInsertSchema(appSettings).omit({ id: true });
export type InsertAppSetting = z.infer<typeof insertAppSettingSchema>;
export type AppSetting = typeof appSettings.$inferSelect;

// Spirit Skills - названия скилов тотемов
export const spiritSkills = pgTable("spirit_skills", {
  id: serial("id").primaryKey(),
  skillId: integer("skill_id").notNull().unique(),
  name: text("name").notNull(),
});

export const insertSpiritSkillSchema = createInsertSchema(spiritSkills).omit({ id: true });
export type InsertSpiritSkill = z.infer<typeof insertSpiritSkillSchema>;
export type SpiritSkill = typeof spiritSkills.$inferSelect;

// Spirit Icons - иконки скилов тотемов
export const spiritIcons = pgTable("spirit_icons", {
  id: serial("id").primaryKey(),
  skillId: integer("skill_id").notNull().unique(),
  iconUrl: text("icon_url").notNull(),
});

export const insertSpiritIconSchema = createInsertSchema(spiritIcons).omit({ id: true });
export type InsertSpiritIcon = z.infer<typeof insertSpiritIconSchema>;
export type SpiritIcon = typeof spiritIcons.$inferSelect;

// Тип боя
export type BattleType = "heroic" | "titanic";

// Типы стихий
export type ElementType = "вода" | "огонь" | "земля" | "тьма" | "свет";

// Тотем стихии
export interface TotemInfo {
  element: ElementType;
  points: number;
}

// Грейд персонажа по фрагментам
export type FragmentGrade = "purple" | "orange" | "red"; // 1-2, 3-6, 7+

// Структура скилов тотема
export interface SpiritTotemSkills {
  elemental?: number;
  primal?: number;
}

// Структура spirits в defendersFragments
export interface SpiritsData {
  water?: SpiritTotemSkills;
  fire?: SpiritTotemSkills;
  earth?: SpiritTotemSkills;
  dark?: SpiritTotemSkills;
  light?: SpiritTotemSkills;
}

// Структура defendersFragments из JSON
export interface DefendersFragments {
  units: number[];
  petId?: number;
  favor?: Record<string, number>; // heroId -> petId
  spirits?: SpiritsData; // тотемы со скилами
  fragments?: Record<string, number>; // id -> fragment count
  effects?: Record<string, number>;
}

// Обработанный член команды в записи
export interface ProcessedReplayMember {
  heroId: number;
  name: string;
  icon?: string;
  fragmentCount: number;
  grade: FragmentGrade;
  favorPetId?: number; // питомец в покровительстве
  favorPetIcon?: string;
}

// Обработанный скил тотема
export interface ProcessedSpiritSkill {
  skillId: number;
  name: string;
  icon?: string;
}

// Обработанный тотем со скилами
export interface ProcessedTotem {
  element: "water" | "fire" | "earth" | "dark" | "light";
  elementRu: string;
  skills: ProcessedSpiritSkill[];
}

// Обработанная запись для отображения
export interface ProcessedReplay {
  id: number;
  gameId: number;
  chapter: number;
  level: number;
  enemyType: "Герои" | "Титаны";
  mainBuff?: number;
  comment?: string;
  mainPetId?: number;
  mainPetIcon?: string;
  team: ProcessedReplayMember[];
  totems?: ProcessedTotem[]; // тотемы со скилами для титанов
}

// Обработанные данные боя для отображения
export interface ProcessedBattle {
  id: number;
  gameId: number;
  chapterNumber: number; // номер главы (1-7)
  adventureName: string; // название адвенчуры
  originalLabel: string; // оригинальный label
  battleNumber: string;
  type: BattleType;
  powerLevel?: number;
  isMixedPowerLevel?: boolean; // true если команда имеет разные bossLevelId
  totems: TotemInfo[]; // до 2 тотемов стихий
  team: {
    heroId: number;
    name: string;
    icon?: string;
    sortOrder?: number;
  }[];
}
