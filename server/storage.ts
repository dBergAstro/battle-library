import { bossList, bossTeam, heroIcons, type InsertBossList, type InsertBossTeam, type InsertHeroIcon, type BossList, type BossTeam, type HeroIcon } from "@shared/schema";
import { db, pool } from "./db";
import { gt, sql } from "drizzle-orm";

export interface IStorage {
  getAllBossList(): Promise<BossList[]>;
  insertBossList(data: InsertBossList[]): Promise<void>;
  clearBossList(): Promise<void>;
  
  getAllBossTeam(): Promise<BossTeam[]>;
  insertBossTeam(data: InsertBossTeam[]): Promise<void>;
  clearBossTeam(): Promise<void>;
  
  getAllHeroIcons(): Promise<HeroIcon[]>;
  insertHeroIcons(data: InsertHeroIcon[]): Promise<void>;
  clearHeroIcons(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
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
        },
      });
    }
  }

  async clearHeroIcons(): Promise<void> {
    await db.delete(heroIcons);
  }
}

export const storage = new DatabaseStorage();
