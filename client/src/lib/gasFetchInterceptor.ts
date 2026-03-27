/**
 * gasFetchInterceptor.ts
 *
 * В GAS-среде нет Express-сервера, поэтому все fetch(/api/...) вернут 404.
 * Этот модуль перехватывает window.fetch и маршрутизирует REST-вызовы
 * через google.script.run — без изменений в компонентах.
 *
 * Референс маппинга: gas-architecture/GAS_BACKEND.md
 */

import { logGasCall } from "./gasLogger";
import { getEnvMode } from "./envMode";

/**
 * Normalizes icon items from the REST format used by the frontend
 * to the format expected by GAS uploadIconsBatch.
 *
 * Frontend sends: { heroId/petId/skillId, iconUrl: "data:image/png;base64,XXX", category? }
 * GAS expects:    { id, base64: "XXX" (no data-URL prefix), filename: "{cat}_{id}.png" }
 */
function normalizeIconsForGas(
  rawIcons: any[],
  category: string
): Array<{ id: string | number; base64: string; filename: string }> {
  return rawIcons.map((icon: any) => {
    // Resolve entity ID — field name varies by category
    const id =
      icon.id ??
      icon.heroId ??
      icon.petId ??
      icon.skillId ??
      icon.talismanId ??
      icon.creepId ??
      icon.titanId ??
      "";

    // Strip the "data:image/...;base64," prefix if present
    const rawUrl: string = icon.base64 ?? icon.iconUrl ?? "";
    const base64 = rawUrl.includes(",") ? rawUrl.split(",")[1] : rawUrl;

    const filename = `${category}_${id}.png`;

    return { id, base64, filename };
  });
}

function normalizeIconItems(
  icons: any[],
  idField: string,
  snakeIdField?: string
): Array<{ [key: string]: any }> {
  return (icons ?? []).map((item: any) => {
    // New sheet format: { id, base64, filename }
    const rawBase64: string | undefined = item.base64;
    const base64Url = rawBase64
      ? (rawBase64.startsWith("data:") ? rawBase64 : `data:image/jpeg;base64,${rawBase64}`)
      : undefined;

    // Old sheet format had drive_url column. uploadIconsBatch writes base64 into that same column
    // when the sheet already existed with old headers — so drive_url may contain raw base64 (not a URL).
    const rawDriveUrl: string | undefined = item.drive_url;
    const driveOrBase64Url = rawDriveUrl
      ? (rawDriveUrl.startsWith("http")
          ? rawDriveUrl                                          // real Google Drive URL
          : `data:image/jpeg;base64,${rawDriveUrl}`)            // raw base64 in drive_url column
      : undefined;

    const rawId = item[idField] ?? (snakeIdField ? item[snakeIdField] : undefined) ?? item.id;
    return {
      [idField]: rawId != null ? Number(rawId) : rawId,
      // Priority: iconUrl (REST) → explicit URL → base64 column → drive_url column (may be base64)
      iconUrl: item.iconUrl ?? item.url ?? base64Url ?? driveOrBase64Url,
    };
  });
}

function normalizeSpiritSkills(
  skills: any[]
): Array<{ skillId: number; name: string }> {
  return (skills ?? []).map((item: any) => ({
    skillId: Number(item.skillId ?? item.skill_id ?? item.id),
    name: item.name,
  }));
}

function normalizeHeroNames(
  names: any[]
): Array<{ heroId: number; name: string }> {
  return (names ?? []).map((item: any) => ({
    heroId: Number(item.heroId ?? item.hero_id ?? item.id),
    name: item.name,
  }));
}

function normalizeTalismans(
  rawTalismans: any[],
  rawTalismanIcons: any[]
): Array<{ talismanId: number; name: string; effectKey: string; description?: string | null; iconUrl?: string | null }> {
  // Build icon lookup: talismanId → data-URL
  // Supports both old sheet format (talisman_id / drive_url / filename) and
  // new format (id / base64 / filename).
  const iconMap = new Map<number, string>();
  (rawTalismanIcons ?? []).forEach((icon: any) => {
    const tid = icon.talismanId ?? icon.talisman_id ?? icon.id;
    if (!tid) return;
    // drive_url column may hold raw base64 (old upload) or an http Drive URL
    const rawVal: string | undefined =
      icon.base64 ?? icon.iconUrl ?? icon.url ?? icon.drive_url;
    if (!rawVal) return;
    const dataUrl = rawVal.startsWith("data:")
      ? rawVal
      : rawVal.startsWith("http")
        ? rawVal                                      // real Drive URL — keep as-is
        : `data:image/jpeg;base64,${rawVal}`;        // raw base64 in any column
    iconMap.set(Number(tid), dataUrl);
  });

  return (rawTalismans ?? []).map((t: any) => {
    const tid = t.talismanId ?? t.talisman_id ?? t.id;
    return {
      talismanId: Number(tid),
      name: t.name ?? "",
      effectKey: t.effectKey ?? t.effect_key ?? "",
      description: t.description ?? null,
      iconUrl: t.iconUrl ?? iconMap.get(Number(tid)) ?? null,
    };
  });
}

function normalizeEntityArrays(raw: any): any {
  const heroIconsNorm  = normalizeIconItems(raw.heroIcons  ?? raw.hero_icons,  "heroId", "hero_id");
  const creepIconsNorm = normalizeIconItems(raw.creepIcons ?? raw.creep_icons, "heroId", "hero_id");
  const titanIconsNorm = normalizeIconItems(raw.titanIcons ?? raw.titan_icons, "heroId", "hero_id");

  // In REST mode, all icon types are unified in heroIcons.
  // In GAS mode, they come in separate arrays — merge them so the frontend sees one map.
  const allHeroIcons = [...heroIconsNorm, ...creepIconsNorm, ...titanIconsNorm];

  return {
    ...raw,
    heroIcons:    allHeroIcons,
    heroNames:    normalizeHeroNames(raw.heroNames ?? raw.hero_names),
    petIcons:     normalizeIconItems(raw.petIcons   ?? raw.pet_icons,    "petId",   "pet_id"),
    creepIcons:   creepIconsNorm,
    titanIcons:   titanIconsNorm,
    spiritIcons:  normalizeIconItems(raw.spiritIcons ?? raw.spirit_icons, "skillId", "skill_id"),
    spiritSkills: normalizeSpiritSkills(raw.spiritSkills ?? raw.spirit_skills),
    talismans:    normalizeTalismans(raw.talismans ?? [], raw.talismanIcons ?? raw.talisman_icons ?? []),
  };
}

// ─── Array normalizers: snake_case (GAS sheets) → camelCase (frontend) ────────

// Helper: coerce a value to number; null/undefined stay null
function toNum(v: any): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return isNaN(n) || n === 0 ? null : n;
}

function normalizeBossListItems(items: any[]): any[] {
  return (items ?? []).map((item: any) => ({
    ...item,
    gameId:             toNum(item.gameId ?? item.game_id),
    heroId:             toNum(item.heroId ?? item.hero_id),
    defendersFragments: item.defendersFragments ?? item.defenders_fragments ?? null,
  }));
}

function normalizeBossTeamItems(items: any[]): any[] {
  return (items ?? []).map((item: any) => ({
    ...item,
    bossGameId:  toNum(item.bossGameId  ?? item.boss_game_id ?? item.bossId),
    heroId:      toNum(item.heroId      ?? item.hero_id),
    unitId:      toNum(item.unitId      ?? item.unit_id),
    bossLevelId: toNum(item.bossLevelId ?? item.boss_level_id),
  }));
}

function normalizeBossLevelItems(items: any[]): any[] {
  return (items ?? []).map((item: any) => ({
    ...item,
    gameId:     toNum(item.gameId     ?? item.game_id),
    bossId:     toNum(item.bossId     ?? item.boss_id),
    powerLevel: toNum(item.powerLevel ?? item.power_level),
  }));
}

function normalizeHeroSortOrderItems(items: any[]): any[] {
  return (items ?? []).map((item: any) => ({
    ...item,
    heroId:    toNum(item.heroId    ?? item.hero_id),
    sortOrder: item.sortOrder != null ? item.sortOrder : (item.sort_order ?? null),
  }));
}

function normalizeTitanElementItems(items: any[]): any[] {
  return (items ?? []).map((item: any) => ({
    ...item,
    titanId: toNum(item.titanId ?? item.titan_id),
    element: item.element ?? null,
    points:  toNum(item.points),
  }));
}

function normalizeAttackTeamItems(items: any[]): any[] {
  return (items ?? []).map((item: any) => ({
    ...item,
    gameId:             toNum(item.gameId     ?? item.game_id),
    invasionId:         toNum(item.invasionId ?? item.invasion_id),
    bossId:             toNum(item.bossId     ?? item.boss_id),
    bossLevel:          toNum(item.bossLevel  ?? item.boss_level),
    chapter:            toNum(item.chapter),
    level:              toNum(item.level),
    enemyType:          item.enemyType          ?? item.enemy_type          ?? null,
    mainBuff:           item.mainBuff           ?? item.main_buff           ?? null,
    comment:            item.comment            ?? null,
    defendersFragments: item.defendersFragments ?? item.defenders_fragments ?? null,
  }));
}

// ─── Top-level normalizers ─────────────────────────────────────────────────────

function normalizeBattlesData(raw: any): any {
  if (!raw || typeof raw !== "object") return raw;
  const normalized: any = {
    ...raw,
    bossList:      normalizeBossListItems(raw.bossList      ?? raw.boss_list),
    bossTeam:      normalizeBossTeamItems(raw.bossTeam      ?? raw.boss_team),
    bossLevel:     normalizeBossLevelItems(raw.bossLevel    ?? raw.boss_level),
    attackTeams:   normalizeAttackTeamItems(raw.attackTeams ?? raw.attack_teams),
    heroSortOrder: normalizeHeroSortOrderItems(raw.heroSortOrder ?? raw.hero_sort_order),
    titanElements: normalizeTitanElementItems(raw.titanElements ?? raw.titan_elements),
  };
  const result = normalizeEntityArrays(normalized);
  // Debug: log sample heroNames and bossTeam entries after normalization to verify ID types match
  if (result.heroNames?.length > 0 && result.bossTeam?.length > 0) {
    const sampleName = result.heroNames[0];
    const sampleTeam = result.bossTeam[0];
    console.debug("[normalizeBattles] heroNames[0]:", sampleName.heroId, typeof sampleName.heroId, sampleName.name,
      "| bossTeam[0] bossGameId:", sampleTeam.bossGameId, "heroId:", sampleTeam.heroId, typeof sampleTeam.heroId);
  }
  return result;
}

function normalizeReplaysData(raw: any): any {
  if (!raw || typeof raw !== "object") return raw;
  const normalized: any = {
    ...raw,
    attackTeams:   normalizeAttackTeamItems(raw.attackTeams ?? raw.attack_teams),
    heroSortOrder: normalizeHeroSortOrderItems(raw.heroSortOrder ?? raw.hero_sort_order),
    titanElements: normalizeTitanElementItems(raw.titanElements ?? raw.titan_elements),
    bossList:      normalizeBossListItems(raw.bossList ?? raw.boss_list ?? []),
  };
  return normalizeEntityArrays(normalized);
}

/**
 * Compresses a base64 image using canvas so it fits within
 * Google Sheets' 50,000-character-per-cell limit.
 * Resizes to at most maxPx × maxPx and encodes as JPEG at 0.75 quality.
 * Typical output: ~5–15 KB → ~7,000–20,000 base64 chars — well under 50k.
 */
function compressBase64Image(base64: string, maxPx = 96): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height, 1));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(base64); return; }
      ctx.drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
      resolve(dataUrl.split(",")[1]);
    };
    img.onerror = () => resolve(base64);
    img.src = base64.startsWith("data:") ? base64 : `data:image/png;base64,${base64}`;
  });
}

function gsRunRaw<T>(fnName: string, ...args: any[]): Promise<T> {
  return new Promise((resolve, reject) => {
    const runner = (window as any).google.script.run
      .withSuccessHandler((result: any) => {
        if (result === null || result === undefined) {
          reject(new Error(`${fnName} returned null`));
          return;
        }
        if (result?.error) {
          reject(new Error(result.error));
        } else {
          resolve(result as T);
        }
      })
      .withFailureHandler((err: any) => {
        reject(new Error(err?.message || String(err)));
      });
    runner[fnName](...args);
  });
}

function gsRun<T>(fnName: string, ...args: any[]): Promise<T> {
  const argStr = args.length === 0 ? "()" : args
    .map((a) => {
      if (a === null || a === undefined) return String(a);
      if (typeof a === "string") return a.length > 40 ? `"${a.slice(0, 37)}…"` : `"${a}"`;
      if (Array.isArray(a)) return `[${a.length} items]`;
      if (typeof a === "object") return `{…}`;
      return String(a);
    })
    .join(", ");
  return logGasCall(fnName, argStr, gsRunRaw<T>(fnName, ...args));
}

function makeJsonResponse(data: any): Response {
  const body = JSON.stringify(data);
  return new Response(body, {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function makeErrorResponse(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function routeToGas(
  url: string,
  method: string,
  body: any
): Promise<Response | null> {
  const u = typeof url === "string" ? url : String(url);
  const m = method.toUpperCase();

  // GET /api/battles
  if (m === "GET" && u === "/api/battles") {
    const raw = await gsRun<any>("getBattles");
    console.debug(
      "[GAS /api/battles] top-level keys:", Object.keys(raw ?? {}),
      "| first bossList item:", (raw?.bossList ?? raw?.boss_list ?? [])[0]
    );
    const data = normalizeBattlesData(raw);
    return makeJsonResponse(data);
  }

  // GET /api/replays
  if (m === "GET" && u === "/api/replays") {
    const raw = await gsRun<any>("getReplays");
    const data = normalizeReplaysData(raw);
    return makeJsonResponse(data);
  }

  // GET /api/tags
  if (m === "GET" && u === "/api/tags") {
    const raw: any = await gsRun("getTags");
    const rawTags: any[] = raw?.tags ?? (Array.isArray(raw) ? raw : []);
    // Normalize field names: GAS returns battle_game_id (snake_case), frontend reads battleGameId (camelCase)
    const tags = rawTags.map((t: any) => ({
      ...t,
      battleGameId: toNum(t.battleGameId ?? t.battle_game_id),
      tag: t.tag ?? "",
    }));
    // Compute uniqueTags if not provided by GAS
    const uniqueTags: string[] = raw?.uniqueTags
      ?? Array.from(new Set(tags.map((t: any) => t.tag as string))).sort();
    return makeJsonResponse({ tags, uniqueTags });
  }

  // GET /api/collection
  // GAS returns { items: [...] }, but the REST API returns a flat array.
  // Unwrap so components always get ServerCollectionItem[].
  if (m === "GET" && u === "/api/collection") {
    const result = await gsRun<{ items: any[] } | any[]>("getCollection");
    const items = Array.isArray(result) ? result : ((result as any)?.items ?? []);
    return makeJsonResponse(items);
  }

  // GET /api/admin/stats
  if (m === "GET" && u === "/api/admin/stats") {
    const raw: any = await gsRun("getAdminStats");
    // GAS returns a flat structure with different field names.
    // Normalize to match the REST StatsResponse interface.
    const normalized = {
      bossList:        raw.bossList        ?? 0,
      bossTeam:        raw.bossTeam        ?? 0,
      bossLevel:       raw.bossLevel       ?? 0,
      heroIcons:       raw.heroIcons       ?? 0,
      heroNames:       raw.heroNames       ?? 0,
      heroSortOrder:   raw.heroSortOrder   ?? 0,
      titanElements:   raw.titanElements   ?? 0,
      attackTeams:     raw.attackTeams     ?? 0,
      heroicReplays:   raw.heroicReplays   ?? 0,
      titanicReplays:  raw.titanicReplays  ?? 0,
      petIcons:        raw.petIcons        ?? 0,
      spiritSkills:    raw.spiritSkills    ?? 0,
      spiritIcons:     raw.spiritIcons     ?? 0,
      talismans:       raw.talismans       ?? 0,
      // GAS returns flat lastIconSync/lastDataSync — map to nested lastUpdated
      lastUpdated: {
        bossList:     raw.lastUpdated?.bossList     ?? raw.lastDataSync ?? null,
        bossTeam:     raw.lastUpdated?.bossTeam     ?? raw.lastDataSync ?? null,
        bossLevel:    raw.lastUpdated?.bossLevel    ?? raw.lastDataSync ?? null,
        heroIcons:    raw.lastUpdated?.heroIcons    ?? raw.lastIconSync ?? null,
        heroNames:    raw.lastUpdated?.heroNames    ?? raw.lastDataSync ?? null,
        heroSortOrder:raw.lastUpdated?.heroSortOrder ?? raw.lastDataSync ?? null,
        titanElements:raw.lastUpdated?.titanElements ?? raw.lastDataSync ?? null,
        attackTeams:  raw.lastUpdated?.attackTeams  ?? raw.lastDataSync ?? null,
        petIcons:     raw.lastUpdated?.petIcons     ?? raw.lastIconSync ?? null,
        spiritSkills: raw.lastUpdated?.spiritSkills ?? raw.lastDataSync ?? null,
        spiritIcons:  raw.lastUpdated?.spiritIcons  ?? raw.lastIconSync ?? null,
        talismans:    raw.lastUpdated?.talismans     ?? raw.lastDataSync ?? null,
        talismanIcons:raw.lastUpdated?.talismanIcons ?? raw.lastIconSync ?? null,
      },
    };
    return makeJsonResponse(normalized);
  }

  // POST /api/tags/:battleGameId  { tag }
  const saveTagMatch = m === "POST" && u.match(/^\/api\/tags\/([^/]+)$/);
  if (saveTagMatch) {
    const battleGameId = saveTagMatch[1];
    const tag = body?.tag ?? "";
    const data = await gsRun("saveTag", battleGameId, tag);
    return makeJsonResponse(data);
  }

  // DELETE /api/tags/:battleGameId/:tag
  const deleteTagMatch = m === "DELETE" && u.match(/^\/api\/tags\/([^/]+)\/(.+)$/);
  if (deleteTagMatch) {
    const battleGameId = deleteTagMatch[1];
    const tag = decodeURIComponent(deleteTagMatch[2]);
    const data = await gsRun("deleteTag", battleGameId, tag);
    return makeJsonResponse(data);
  }

  // POST /api/collection
  if (m === "POST" && u === "/api/collection") {
    const data = await gsRun("saveCollectionItem", body);
    return makeJsonResponse(data);
  }

  // DELETE /api/collection/:id
  const deleteCollectionMatch = m === "DELETE" && u.match(/^\/api\/collection\/(.+)$/);
  if (deleteCollectionMatch) {
    const id = decodeURIComponent(deleteCollectionMatch[1]);
    const data = await gsRun("deleteCollectionItem", id);
    return makeJsonResponse(data);
  }

  // DELETE /api/collection (no id — clear all)
  if (m === "DELETE" && u === "/api/collection") {
    const data = await gsRun("clearCollection");
    return makeJsonResponse(data);
  }

  // POST /api/admin/settings/main-buff  { slot: "A"|"B", name, effectKey }
  if (m === "POST" && u === "/api/admin/settings/main-buff") {
    const slot = body?.slot ?? "A";
    const name = body?.name ?? "";
    const effectKey = body?.effectKey ?? "";
    const data = await gsRun("saveMainBuffName", slot, name, effectKey);
    return makeJsonResponse(data);
  }

  // POST /api/admin/{hero|pet|spirit|titan|creep}-icons → uploadIconsBatch(category, icons)
  // Normalize icon format: frontend sends { heroId, iconUrl: "data:...", category }
  // but GAS expects { id, base64 (no prefix), filename }.
  // Icons are uploaded in chunks of 10 to avoid GAS 6-minute execution timeout.
  const iconUploadMatch = m === "POST" && u.match(/^\/api\/admin\/(hero|pet|spirit|titan|creep)-icons$/);
  if (iconUploadMatch) {
    const category = iconUploadMatch[1];
    const rawIcons = Array.isArray(body) ? body : (body?.icons ?? []);
    const rawNormalized = normalizeIconsForGas(rawIcons, category);
    // Compress each icon to JPEG 96×96 so base64 fits Sheets' 50k char/cell limit
    const icons = await Promise.all(
      rawNormalized.map(async (icon) => ({
        ...icon,
        base64: await compressBase64Image(icon.base64),
      }))
    );
    // Send 1 icon per GAS call — more reliable than batching since GAS may timeout
    // with large payloads. Single-icon upload is confirmed to work.
    let totalCount = 0;
    for (let i = 0; i < icons.length; i++) {
      console.debug(`[gasFetch] uploadIconsBatch ${category} ${i + 1}/${icons.length}`);
      const result = await gsRun<any>("uploadIconsBatch", category, [icons[i]]);
      totalCount += (result as any)?.count ?? 1;
    }
    return makeJsonResponse({ success: true, count: totalCount });
  }

  // POST /api/admin/hero-sort-order → GAS adminUpload type is "sort-order" (not "hero-sort-order")
  if (m === "POST" && u === "/api/admin/hero-sort-order") {
    const data = await gsRun("adminUpload", "sort-order", body);
    return makeJsonResponse(data);
  }

  // POST /api/admin/talismans — body is { text: string }, parse text here so GAS
  // receives an already-parsed array instead of raw text (GAS has no talisman parser).
  // Format per line: "ID Название talismanXxx Описание"
  if (m === "POST" && u === "/api/admin/talismans") {
    const text: string = body?.text ?? "";
    const parsed: { talismanId: number; name: string; effectKey: string; description?: string }[] = [];
    for (const rawLine of text.split("\n")) {
      const line = rawLine.trim();
      if (!line) continue;
      const parts = line.split(/\s+/);
      if (parts.length < 3) continue;
      const talismanId = parseInt(parts[0], 10);
      if (isNaN(talismanId)) continue;
      const talIdx = parts.findIndex((p, i) => i > 0 && p.toLowerCase().startsWith("talisman"));
      if (talIdx < 0) continue;
      const name = parts.slice(1, talIdx).join(" ") || parts[talIdx];
      const effectKey = parts[talIdx].split("_")[0];
      const description = parts.slice(talIdx + 1).join(" ") || undefined;
      parsed.push({ talismanId, name, effectKey, description });
    }
    const data = await gsRun("adminUpload", "talismans", parsed);
    return makeJsonResponse({ ...(data as object), count: parsed.length });
  }

  // POST /api/admin/talisman-icons — compress each icon before sending to GAS
  // (Sheets limit is 50k chars/cell; raw PNG base64 easily exceeds that).
  // Send 1 at a time like hero-icons to avoid GAS timeouts.
  if (m === "POST" && u === "/api/admin/talisman-icons") {
    const rawIcons = Array.isArray(body) ? body : (body?.icons ?? []);
    let totalCount = 0;
    for (const rawIcon of rawIcons) {
      const id = rawIcon.talismanId ?? rawIcon.id;
      const rawUrl: string = rawIcon.iconUrl ?? rawIcon.base64 ?? "";
      const rawBase64 = rawUrl.includes(",") ? rawUrl.split(",")[1] : rawUrl;
      const compressed = await compressBase64Image(rawBase64);
      const icon = { talismanId: id, iconUrl: `data:image/jpeg;base64,${compressed}` };
      console.debug(`[gasFetch] adminUpload talisman-icons id=${id}`);
      await gsRun("adminUpload", "talisman-icons", [icon]);
      totalCount++;
    }
    return makeJsonResponse({ success: true, count: totalCount });
  }

  // POST /api/admin/:type  — generic admin upload (data tables, etc.)
  const adminMatch = m === "POST" && u.match(/^\/api\/admin\/(.+)$/);
  if (adminMatch) {
    const type = adminMatch[1];
    const data = await gsRun("adminUpload", type, body);
    return makeJsonResponse(data);
  }

  return null;
}

export function installGasFetchInterceptor(): void {
  if (typeof window === "undefined") return;
  if (!(window as any).google?.script?.run) return;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url;
    const method = init?.method ?? (input instanceof Request ? input.method : "GET");

    // In REST mode, bypass GAS routing and use real fetch
    if (url.startsWith("/api/") && getEnvMode() === "rest") {
      return originalFetch(input, init);
    }

    if (url.startsWith("/api/")) {
      let body: any = undefined;
      if (init?.body) {
        try {
          body = JSON.parse(init.body as string);
        } catch {
          body = init.body;
        }
      }

      const isPost = method.toUpperCase() !== "GET";
      if (isPost) {
        const size = Array.isArray(body) ? body.length : (body ? 1 : 0);
        console.debug(`[gasFetch] ${method} ${url} → google.script.run (${size} records)`);
      }

      try {
        const response = await routeToGas(url, method, body);
        if (response !== null) {
          if (!isPost) console.debug(`[gasFetch] ${method} ${url} → google.script.run`);
          else console.debug(`[gasFetch] ${method} ${url} ✓ done`);
          return response;
        }
      } catch (err: any) {
        console.error(`[gasFetch] ${method} ${url} error:`, err);
        return makeErrorResponse(500, err?.message || "GAS error");
      }

      console.warn(`[gasFetch] Unmapped: ${method} ${url}`);
    }

    return originalFetch(input, init);
  };

  console.info("[gasFetch] Fetch interceptor installed for GAS environment");
}
