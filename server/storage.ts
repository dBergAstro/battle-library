import { 
  bossList, bossTeam, bossLevel, heroIcons, heroNames,
  type InsertBossList, type InsertBossTeam, type InsertBossLevel, 
  type InsertHeroIcon, type InsertHeroName,
  type BossList, type BossTeam, type BossLevel, type HeroIcon, type HeroName
} from "@shared/schema";
import { db } from "./db";
import { gt, sql } from "drizzle-orm";

export interface IStorage {
  getAllBossList(): Promise<BossList[]>;
  insertBossList(data: InsertBossList[]): Promise<void>;
  clearBossList(): Promise<void>;
  
  getAllBossTeam(): Promise<BossTeam[]>;
  insertBossTeam(data: InsertBossTeam[]): Promise<void>;
  clearBossTeam(): Promise<void>;
  
  getAllBossLevel(): Promise<BossLevel[]>;
  insertBossLevel(data: InsertBossLevel[]): Promise<void>;
  clearBossLevel(): Promise<void>;
  
  getAllHeroIcons(): Promise<HeroIcon[]>;
  insertHeroIcons(data: InsertHeroIcon[]): Promise<void>;
  clearHeroIcons(): Promise<void>;
  
  getAllHeroNames(): Promise<HeroName[]>;
  insertHeroNames(data: InsertHeroName[]): Promise<void>;
  clearHeroNames(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Boss List
  async getAllBossList(): Promise<BossList[]> {
    return await db.select().from(bossList).where(gt(bossList.gameId, 226));
  }

  async insertBossList(data: InsertBossList[]): Promise<void> {
    if (data.length === 0) return;
    
    const BATCH_SIZE = 100;
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE);
      await db.insert(bossList).values(batch).onConflictDoUpdate({
        target: bossList.gameId,
        set: {
          label: sql`excluded.label`,
          desc: sql`excluded.desc`,
          heroId: sql`excluded.hero_id`,
        },
      });
    }
  }

  async clearBossList(): Promise<void> {
    await db.delete(bossList);
  }

  // Boss Team
  async getAllBossTeam(): Promise<BossTeam[]> {
    return await db.select().from(bossTeam);
  }

  async insertBossTeam(data: InsertBossTeam[]): Promise<void> {
    if (data.length === 0) return;
    
    const BATCH_SIZE = 100;
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE);
      await db.insert(bossTeam).values(batch);
    }
  }

  async clearBossTeam(): Promise<void> {
    await db.delete(bossTeam);
  }

  // Boss Level
  async getAllBossLevel(): Promise<BossLevel[]> {
    return await db.select().from(bossLevel);
  }

  async insertBossLevel(data: InsertBossLevel[]): Promise<void> {
    if (data.length === 0) return;
    
    const BATCH_SIZE = 100;
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE);
      await db.insert(bossLevel).values(batch).onConflictDoUpdate({
        target: bossLevel.gameId,
        set: {
          bossId: sql`excluded.boss_id`,
          powerLevel: sql`excluded.power_level`,
        },
      });
    }
  }

  async clearBossLevel(): Promise<void> {
    await db.delete(bossLevel);
  }

  // Hero Icons
  async getAllHeroIcons(): Promise<HeroIcon[]> {
    return await db.select().from(heroIcons);
  }

  async insertHeroIcons(data: InsertHeroIcon[]): Promise<void> {
    if (data.length === 0) return;
    
    const BATCH_SIZE = 50;
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE);
      await db.insert(heroIcons).values(batch).onConflictDoUpdate({
        target: heroIcons.heroId,
        set: {
          iconUrl: sql`excluded.icon_url`,
          category: sql`excluded.category`,
        },
      });
    }
  }

  async clearHeroIcons(): Promise<void> {
    await db.delete(heroIcons);
  }

  // Hero Names
  async getAllHeroNames(): Promise<HeroName[]> {
    return await db.select().from(heroNames);
  }

  async insertHeroNames(data: InsertHeroName[]): Promise<void> {
    if (data.length === 0) return;
    
    const BATCH_SIZE = 100;
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE);
      await db.insert(heroNames).values(batch).onConflictDoUpdate({
        target: heroNames.heroId,
        set: {
          name: sql`excluded.name`,
        },
      });
    }
  }

  async clearHeroNames(): Promise<void> {
    await db.delete(heroNames);
  }
}

export const storage = new DatabaseStorage();
