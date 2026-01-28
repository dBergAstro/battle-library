import type { Express } from "express";
import type { Server } from "http";
import { z } from "zod";
import { storage } from "./storage";

const bossListInputSchema = z.array(z.object({
  id: z.number(),
  label: z.string().optional().nullable(),
  desc: z.string().optional().nullable(),
  heroId: z.number().optional().nullable(),
}));

const bossTeamInputSchema = z.array(z.object({
  id: z.number(),
  bossId: z.number().optional().nullable(),
  heroId: z.number().optional().nullable(),
  unitId: z.number().optional().nullable(),
  bossLevelId: z.number().optional().nullable(),
}));

const bossLevelInputSchema = z.array(z.object({
  id: z.number(),
  bossId: z.number().optional().nullable(),
  powerLevel: z.number().optional().nullable(),
}));

const heroIconsInputSchema = z.array(z.object({
  heroId: z.number(),
  iconUrl: z.string().max(500000),
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

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Get all data for library
  app.get("/api/battles", async (_req, res) => {
    try {
      const [bossListData, bossTeamData, bossLevelData, heroIconsData, heroNamesData, heroSortOrderData, titanElementsData] = await Promise.all([
        storage.getAllBossList(),
        storage.getAllBossTeam(),
        storage.getAllBossLevel(),
        storage.getAllHeroIcons(),
        storage.getAllHeroNames(),
        storage.getAllHeroSortOrder(),
        storage.getAllTitanElements(),
      ]);

      res.json({
        bossList: bossListData,
        bossTeam: bossTeamData,
        bossLevel: bossLevelData,
        heroIcons: heroIconsData,
        heroNames: heroNamesData,
        heroSortOrder: heroSortOrderData,
        titanElements: titanElementsData,
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
  app.post("/api/admin/boss-team", async (req, res) => {
    try {
      const parsed = bossTeamInputSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid data format", details: parsed.error.issues });
      }

      await storage.clearBossTeam();
      const mapped = parsed.data.map((item) => ({
        bossGameId: item.bossId ?? item.id,
        heroId: item.heroId || null,
        unitId: item.unitId || null,
        bossLevelId: item.bossLevelId || null,
      }));

      await storage.insertBossTeam(mapped);
      res.json({ success: true, count: mapped.length });
    } catch (error) {
      console.error("Error uploading boss team:", error);
      res.status(500).json({ error: "Failed to upload boss team" });
    }
  });

  // Upload Boss Level
  app.post("/api/admin/boss-level", async (req, res) => {
    try {
      const parsed = bossLevelInputSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid data format", details: parsed.error.issues });
      }

      await storage.clearBossLevel();
      const mapped = parsed.data.map((item) => ({
        gameId: item.id,
        bossId: item.bossId || null,
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

      await storage.insertHeroIcons(parsed.data);
      res.json({ success: true, count: parsed.data.length });
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

      await storage.clearHeroSortOrder();
      await storage.insertHeroSortOrder(parsed.data);
      res.json({ success: true, count: parsed.data.length });
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
      const [bossListData, bossTeamData, bossLevelData, heroIconsData, heroNamesData, heroSortOrderData, titanElementsData] = await Promise.all([
        storage.getAllBossList(),
        storage.getAllBossTeam(),
        storage.getAllBossLevel(),
        storage.getAllHeroIcons(),
        storage.getAllHeroNames(),
        storage.getAllHeroSortOrder(),
        storage.getAllTitanElements(),
      ]);

      res.json({
        bossList: bossListData.length,
        bossTeam: bossTeamData.length,
        bossLevel: bossLevelData.length,
        heroIcons: heroIconsData.length,
        heroNames: heroNamesData.length,
        heroSortOrder: heroSortOrderData.length,
        titanElements: titanElementsData.length,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  return httpServer;
}
