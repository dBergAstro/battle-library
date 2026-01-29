import type { Express } from "express";
import type { Server } from "http";
import { z } from "zod";
import { storage } from "./storage";

// Преобразование строк в числа
const coerceNumber = z.union([z.number(), z.string().transform(v => {
  const n = Number(v);
  return isNaN(n) ? null : n;
})]).nullable().optional();

const coerceNumberRequired = z.union([z.number(), z.string().transform(v => Number(v))]);

// Более гибкие схемы для поддержки разных форматов входных данных
const bossListInputSchema = z.array(z.object({
  id: coerceNumberRequired,
  label: z.string().optional().nullable(),
  desc: z.string().optional().nullable(),
  heroId: coerceNumber,
}).passthrough());

const bossTeamInputSchema = z.array(z.object({
  rowId: coerceNumber,
  id: coerceNumberRequired,
  unitId: coerceNumber,
  heroId: coerceNumber,
  bossId: coerceNumber,
  bossLevelId: coerceNumber,
}).passthrough());

const bossLevelInputSchema = z.array(z.object({
  rowId: coerceNumber,
  id: coerceNumberRequired,
  bossLevel: coerceNumber,
  bossId: coerceNumber,
  powerLevel: coerceNumber,
}).passthrough());

const heroIconsInputSchema = z.array(z.object({
  heroId: z.number(),
  iconUrl: z.string().max(2000000),
  category: z.string().optional().nullable(),
}));

const heroNamesInputSchema = z.array(z.object({
  heroId: z.number(),
  name: z.string(),
}));

const heroSortOrderInputSchema = z.array(z.object({
  heroId: z.number(),
  sortOrder: z.number(),
}));

const titanElementsInputSchema = z.array(z.object({
  titanId: z.number(),
  element: z.string(),
  points: z.number(),
}));

const attackTeamsInputSchema = z.array(z.object({
  id: coerceNumberRequired,
  invasionId: coerceNumber,
  bossId: coerceNumber,
  bossLevel: coerceNumber,
  Chapter: coerceNumber,
  Level: coerceNumber,
  enemyType: z.string().optional().nullable(),
  mainBuff: coerceNumber,
  Comment: z.string().optional().nullable(),
  defendersFragments: z.any().optional().nullable(),
}).passthrough());

const petIconsInputSchema = z.array(z.object({
  petId: z.number(),
  iconUrl: z.string().max(2000000),
}));

const spiritSkillsInputSchema = z.array(z.object({
  skillId: z.number(),
  name: z.string(),
}));

const spiritIconsInputSchema = z.array(z.object({
  skillId: z.number(),
  iconUrl: z.string().max(2000000),
}));

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Get all data for library (battles + replays)
  app.get("/api/battles", async (_req, res) => {
    try {
      const [bossListData, bossTeamData, bossLevelData, heroIconsData, heroNamesData, heroSortOrderData, titanElementsData, attackTeamsData, petIconsData, spiritSkillsData, spiritIconsData] = await Promise.all([
        storage.getAllBossList(),
        storage.getAllBossTeam(),
        storage.getAllBossLevel(),
        storage.getAllHeroIcons(),
        storage.getAllHeroNames(),
        storage.getAllHeroSortOrder(),
        storage.getAllTitanElements(),
        storage.getAllAttackTeams(),
        storage.getAllPetIcons(),
        storage.getAllSpiritSkills(),
        storage.getAllSpiritIcons(),
      ]);

      // Calculate max boss ID for recommended new battle IDs
      const maxBossId = bossListData.reduce((max, boss) => Math.max(max, boss.gameId), 0);

      res.json({
        bossList: bossListData,
        bossTeam: bossTeamData,
        bossLevel: bossLevelData,
        heroIcons: heroIconsData,
        heroNames: heroNamesData,
        heroSortOrder: heroSortOrderData,
        titanElements: titanElementsData,
        attackTeams: attackTeamsData,
        petIcons: petIconsData,
        spiritSkills: spiritSkillsData,
        spiritIcons: spiritIconsData,
        maxBossId,
      });
    } catch (error) {
      console.error("Error fetching battles:", error);
      res.status(500).json({ error: "Failed to fetch battles" });
    }
  });

  // Upload Boss List
  app.post("/api/admin/boss-list", async (req, res) => {
    try {
      const parsed = bossListInputSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid data format", details: parsed.error.issues });
      }

      await storage.clearBossList();
      const mapped = parsed.data
        .filter((item) => item.id > 226)
        .map((item) => ({
          gameId: item.id,
          label: item.label || null,
          desc: item.desc || null,
          heroId: item.heroId || null,
        }));

      await storage.insertBossList(mapped);
      res.json({ success: true, count: mapped.length });
    } catch (error) {
      console.error("Error uploading boss list:", error);
      res.status(500).json({ error: "Failed to upload boss list" });
    }
  });

  // Upload Boss Team
  // Формат: id = bossId (ID боя), unitId = ID юнита/героя
  app.post("/api/admin/boss-team", async (req, res) => {
    try {
      const parsed = bossTeamInputSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid data format", details: parsed.error.issues });
      }

      await storage.clearBossTeam();
      // Фильтруем записи для актуальных боёв (bossId > 226)
      const mapped = parsed.data
        .map((item) => ({
          // id в исходных данных = bossId (ID боя)
          bossGameId: item.bossId ?? item.id,
          heroId: item.heroId || null,
          unitId: item.unitId || null,
          bossLevelId: item.bossLevelId || null,
        }))
        .filter((item) => item.bossGameId > 226);

      await storage.insertBossTeam(mapped);
      res.json({ success: true, count: mapped.length });
    } catch (error) {
      console.error("Error uploading boss team:", error);
      res.status(500).json({ error: "Failed to upload boss team" });
    }
  });

  // Upload Boss Level
  // Формат: id = gameId уровня, bossLevel = ID босса, powerLevel = уровень мощности
  // Фильтруем записи с rowId > 1090 (актуальные профили с level = 1)
  app.post("/api/admin/boss-level", async (req, res) => {
    try {
      const parsed = bossLevelInputSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid data format", details: parsed.error.issues });
      }

      await storage.clearBossLevel();
      
      // Фильтруем записи:
      // - Для CSV с rowId: берём rowId > 1090 (актуальные профили с level = 1)
      // - Для JSON из папки: берём id >= 101 (актуальные профили сложности)
      const hasRowId = parsed.data.some((item) => item.rowId != null);
      const filtered = hasRowId 
        ? parsed.data.filter((item) => (item.rowId ?? 0) > 1090)
        : parsed.data.filter((item) => item.id >= 101);
      
      // Дедупликация по gameId (берём последнюю запись с одинаковым id)
      const seenIds = new Map<number, typeof filtered[0]>();
      for (const item of filtered) {
        seenIds.set(item.id, item);
      }
      
      const mapped = Array.from(seenIds.values()).map((item) => ({
        gameId: item.id,
        bossId: item.bossLevel ?? item.bossId ?? null,
        powerLevel: item.powerLevel || null,
      }));

      await storage.insertBossLevel(mapped);
      res.json({ success: true, count: mapped.length });
    } catch (error) {
      console.error("Error uploading boss level:", error);
      res.status(500).json({ error: "Failed to upload boss level" });
    }
  });

  // Upload Hero Icons
  app.post("/api/admin/hero-icons", async (req, res) => {
    try {
      const parsed = heroIconsInputSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid data format", details: parsed.error.issues });
      }

      // Дедупликация по heroId+category (берём последнюю запись)
      const seen = new Map<string, typeof parsed.data[0]>();
      for (const item of parsed.data) {
        const key = `${item.heroId}_${item.category || ''}`;
        seen.set(key, item);
      }
      const deduplicated = Array.from(seen.values());

      await storage.insertHeroIcons(deduplicated);
      res.json({ success: true, count: deduplicated.length });
    } catch (error) {
      console.error("Error uploading hero icons:", error);
      res.status(500).json({ error: "Failed to upload hero icons" });
    }
  });

  // Upload Hero Names
  app.post("/api/admin/hero-names", async (req, res) => {
    try {
      const parsed = heroNamesInputSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid data format", details: parsed.error.issues });
      }

      await storage.insertHeroNames(parsed.data);
      res.json({ success: true, count: parsed.data.length });
    } catch (error) {
      console.error("Error uploading hero names:", error);
      res.status(500).json({ error: "Failed to upload hero names" });
    }
  });

  // Upload Hero Sort Order
  app.post("/api/admin/hero-sort-order", async (req, res) => {
    try {
      const parsed = heroSortOrderInputSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid data format", details: parsed.error.issues });
      }

      // Дедупликация по heroId (берём последнюю запись)
      const seen = new Map<number, typeof parsed.data[0]>();
      for (const item of parsed.data) {
        seen.set(item.heroId, item);
      }
      const deduplicated = Array.from(seen.values());

      await storage.clearHeroSortOrder();
      await storage.insertHeroSortOrder(deduplicated);
      res.json({ success: true, count: deduplicated.length });
    } catch (error) {
      console.error("Error uploading hero sort order:", error);
      res.status(500).json({ error: "Failed to upload hero sort order" });
    }
  });

  // Upload Titan Elements
  app.post("/api/admin/titan-elements", async (req, res) => {
    try {
      const parsed = titanElementsInputSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid data format", details: parsed.error.issues });
      }

      await storage.clearTitanElements();
      await storage.insertTitanElements(parsed.data);
      res.json({ success: true, count: parsed.data.length });
    } catch (error) {
      console.error("Error uploading titan elements:", error);
      res.status(500).json({ error: "Failed to upload titan elements" });
    }
  });

  // Get stats
  app.get("/api/admin/stats", async (_req, res) => {
    try {
      const [bossListData, bossTeamData, bossLevelData, heroIconsData, heroNamesData, heroSortOrderData, titanElementsData, attackTeamsData, petIconsData] = await Promise.all([
        storage.getAllBossList(),
        storage.getAllBossTeam(),
        storage.getAllBossLevel(),
        storage.getAllHeroIcons(),
        storage.getAllHeroNames(),
        storage.getAllHeroSortOrder(),
        storage.getAllTitanElements(),
        storage.getAllAttackTeams(),
        storage.getAllPetIcons(),
      ]);

      const mainBuffName = await storage.getSetting("mainBuffName");

      // Разделяем записи на героические и титанические
      const heroicReplays = attackTeamsData.filter(r => r.enemyType === "Герои").length;
      const titanicReplays = attackTeamsData.filter(r => r.enemyType === "Титаны").length;

      res.json({
        bossList: bossListData.length,
        bossTeam: bossTeamData.length,
        bossLevel: bossLevelData.length,
        heroIcons: heroIconsData.length,
        heroNames: heroNamesData.length,
        heroSortOrder: heroSortOrderData.length,
        titanElements: titanElementsData.length,
        attackTeams: attackTeamsData.length,
        heroicReplays,
        titanicReplays,
        petIcons: petIconsData.length,
        mainBuffName: mainBuffName,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Upload Attack Teams (Replays)
  app.post("/api/admin/attack-teams", async (req, res) => {
    try {
      const parsed = attackTeamsInputSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid data format", details: parsed.error.issues });
      }

      await storage.clearAttackTeams();
      const mapped = parsed.data.map((item) => ({
        gameId: item.id,
        invasionId: item.invasionId || null,
        bossId: item.bossId || null,
        bossLevel: item.bossLevel || null,
        chapter: item.Chapter || null,
        level: item.Level || null,
        enemyType: item.enemyType || null,
        mainBuff: item.mainBuff || null,
        comment: item.Comment || null,
        defendersFragments: item.defendersFragments ? JSON.stringify(item.defendersFragments) : null,
      }));

      await storage.insertAttackTeams(mapped);
      res.json({ success: true, count: mapped.length });
    } catch (error) {
      console.error("Error uploading attack teams:", error);
      res.status(500).json({ error: "Failed to upload attack teams" });
    }
  });

  // Upload Pet Icons
  app.post("/api/admin/pet-icons", async (req, res) => {
    try {
      const parsed = petIconsInputSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid data format", details: parsed.error.issues });
      }

      // Дедупликация по petId
      const seen = new Map<number, typeof parsed.data[0]>();
      for (const item of parsed.data) {
        seen.set(item.petId, item);
      }
      const deduplicated = Array.from(seen.values());

      await storage.insertPetIcons(deduplicated);
      res.json({ success: true, count: deduplicated.length });
    } catch (error) {
      console.error("Error uploading pet icons:", error);
      res.status(500).json({ error: "Failed to upload pet icons" });
    }
  });

  // Set Main Buff Name
  app.post("/api/admin/settings/main-buff", async (req, res) => {
    try {
      const { name } = req.body;
      if (typeof name !== "string") {
        return res.status(400).json({ error: "Invalid name" });
      }
      await storage.setSetting("mainBuffName", name);
      res.json({ success: true });
    } catch (error) {
      console.error("Error setting main buff name:", error);
      res.status(500).json({ error: "Failed to set main buff name" });
    }
  });

  // Get Replays data
  app.get("/api/replays", async (_req, res) => {
    try {
      const [attackTeamsData, heroIconsData, heroNamesData, petIconsData, spiritSkillsData, spiritIconsData] = await Promise.all([
        storage.getAllAttackTeams(),
        storage.getAllHeroIcons(),
        storage.getAllHeroNames(),
        storage.getAllPetIcons(),
        storage.getAllSpiritSkills(),
        storage.getAllSpiritIcons(),
      ]);

      const mainBuffName = await storage.getSetting("mainBuffName");

      res.json({
        attackTeams: attackTeamsData,
        heroIcons: heroIconsData,
        heroNames: heroNamesData,
        petIcons: petIconsData,
        spiritSkills: spiritSkillsData,
        spiritIcons: spiritIconsData,
        mainBuffName: mainBuffName,
      });
    } catch (error) {
      console.error("Error fetching replays:", error);
      res.status(500).json({ error: "Failed to fetch replays" });
    }
  });

  // Upload Spirit Skills
  app.post("/api/admin/spirit-skills", async (req, res) => {
    try {
      const parsed = spiritSkillsInputSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid data format", details: parsed.error.issues });
      }

      await storage.clearSpiritSkills();
      await storage.insertSpiritSkills(parsed.data);
      res.json({ success: true, count: parsed.data.length });
    } catch (error) {
      console.error("Error uploading spirit skills:", error);
      res.status(500).json({ error: "Failed to upload spirit skills" });
    }
  });

  // Upload Spirit Icons
  app.post("/api/admin/spirit-icons", async (req, res) => {
    try {
      const parsed = spiritIconsInputSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid data format", details: parsed.error.issues });
      }

      // Дедупликация по skillId
      const seen = new Map<number, typeof parsed.data[0]>();
      for (const item of parsed.data) {
        seen.set(item.skillId, item);
      }
      const deduplicated = Array.from(seen.values());

      await storage.insertSpiritIcons(deduplicated);
      res.json({ success: true, count: deduplicated.length });
    } catch (error) {
      console.error("Error uploading spirit icons:", error);
      res.status(500).json({ error: "Failed to upload spirit icons" });
    }
  });

  // Battle Tags API
  app.get("/api/tags", async (_req, res) => {
    try {
      const tags = await storage.getAllBattleTags();
      const uniqueTags = await storage.getAllUniqueTags();
      res.json({ tags, uniqueTags });
    } catch (error) {
      console.error("Error fetching tags:", error);
      res.status(500).json({ error: "Failed to fetch tags" });
    }
  });

  app.get("/api/tags/unique", async (_req, res) => {
    try {
      const uniqueTags = await storage.getAllUniqueTags();
      res.json({ tags: uniqueTags });
    } catch (error) {
      console.error("Error fetching unique tags:", error);
      res.status(500).json({ error: "Failed to fetch unique tags" });
    }
  });

  app.post("/api/tags/:battleGameId", async (req, res) => {
    try {
      const battleGameId = parseInt(req.params.battleGameId, 10);
      const { tag } = req.body;
      if (!tag || typeof tag !== "string") {
        return res.status(400).json({ error: "Tag is required" });
      }
      await storage.addBattleTag(battleGameId, tag.toLowerCase().trim());
      res.json({ success: true });
    } catch (error) {
      console.error("Error adding tag:", error);
      res.status(500).json({ error: "Failed to add tag" });
    }
  });

  app.delete("/api/tags/:battleGameId/:tag", async (req, res) => {
    try {
      const battleGameId = parseInt(req.params.battleGameId, 10);
      const tag = decodeURIComponent(req.params.tag);
      await storage.removeBattleTag(battleGameId, tag);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing tag:", error);
      res.status(500).json({ error: "Failed to remove tag" });
    }
  });

  // Collection endpoints
  app.get("/api/collection", async (_req, res) => {
    try {
      const items = await storage.getAllCollectionItems();
      res.json(items);
    } catch (error) {
      console.error("Error fetching collection:", error);
      res.status(500).json({ error: "Failed to fetch collection" });
    }
  });

  app.post("/api/collection", async (req, res) => {
    try {
      const { itemId, itemType, gameId, label, desc, battleType, team, rawDefendersFragments } = req.body;
      const numericGameId = typeof gameId === 'string' ? parseInt(gameId, 10) : gameId;
      if (isNaN(numericGameId)) {
        res.status(400).json({ error: "Invalid gameId" });
        return;
      }
      await storage.addCollectionItem({
        itemId,
        itemType,
        gameId: numericGameId,
        label: label || null,
        desc: desc || null,
        battleType: battleType || null,
        teamJson: team ? JSON.stringify(team) : null,
        rawDefendersFragments: rawDefendersFragments || null,
        createdAt: Date.now(),
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Error adding to collection:", error);
      res.status(500).json({ error: "Failed to add to collection" });
    }
  });

  app.delete("/api/collection/:itemId", async (req, res) => {
    try {
      const itemId = decodeURIComponent(req.params.itemId);
      await storage.removeCollectionItem(itemId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing from collection:", error);
      res.status(500).json({ error: "Failed to remove from collection" });
    }
  });

  app.delete("/api/collection", async (_req, res) => {
    try {
      await storage.clearCollection();
      res.json({ success: true });
    } catch (error) {
      console.error("Error clearing collection:", error);
      res.status(500).json({ error: "Failed to clear collection" });
    }
  });

  return httpServer;
}
