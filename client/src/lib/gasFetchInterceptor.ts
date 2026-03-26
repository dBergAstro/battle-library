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
  return (icons ?? []).map((item: any) => ({
    [idField]: item[idField] ?? (snakeIdField ? item[snakeIdField] : undefined) ?? item.id,
    iconUrl: item.iconUrl ?? item.url,
  }));
}

function normalizeSpiritSkills(
  skills: any[]
): Array<{ skillId: number; name: string }> {
  return (skills ?? []).map((item: any) => ({
    skillId: item.skillId ?? item.skill_id ?? item.id,
    name: item.name,
  }));
}

function normalizeHeroNames(
  names: any[]
): Array<{ heroId: number; name: string }> {
  return (names ?? []).map((item: any) => ({
    heroId: item.heroId ?? item.hero_id ?? item.id,
    name: item.name,
  }));
}

function normalizeEntityArrays(raw: any): any {
  return {
    ...raw,
    heroIcons: normalizeIconItems(raw.heroIcons, "heroId", "hero_id"),
    heroNames: normalizeHeroNames(raw.heroNames),
    petIcons: normalizeIconItems(raw.petIcons, "petId", "pet_id"),
    spiritIcons: normalizeIconItems(raw.spiritIcons, "skillId", "skill_id"),
    spiritSkills: normalizeSpiritSkills(raw.spiritSkills),
  };
}

function normalizeBattlesData(raw: any): any {
  if (!raw || typeof raw !== "object") return raw;
  return normalizeEntityArrays(raw);
}

function normalizeReplaysData(raw: any): any {
  if (!raw || typeof raw !== "object") return raw;
  return normalizeEntityArrays(raw);
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
    const data = await gsRun("getTags");
    return makeJsonResponse(data);
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
    const data = await gsRun("getAdminStats");
    return makeJsonResponse(data);
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

  // POST /api/admin/settings/main-buff  { slot?, name, effectKey? }
  if (m === "POST" && u === "/api/admin/settings/main-buff") {
    const data = await gsRun("saveMainBuffName", body?.name ?? "");
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
    const CHUNK_SIZE = 10;
    const totalChunks = Math.ceil(icons.length / CHUNK_SIZE);
    let totalCount = 0;
    for (let i = 0; i < icons.length; i += CHUNK_SIZE) {
      const chunk = icons.slice(i, i + CHUNK_SIZE);
      const chunkNum = Math.floor(i / CHUNK_SIZE) + 1;
      console.debug(`[gasFetch] uploadIconsBatch ${category} chunk ${chunkNum}/${totalChunks} (${chunk.length} icons)`);
      const result = await gsRun<any>("uploadIconsBatch", category, chunk);
      totalCount += (result as any)?.count ?? chunk.length;
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

  // POST /api/admin/talisman-icons — body is { icons: [{talismanId, iconUrl}] }
  // Pass icons array directly so GAS doesn't need to unwrap the wrapper object.
  if (m === "POST" && u === "/api/admin/talisman-icons") {
    const icons = Array.isArray(body) ? body : (body?.icons ?? []);
    const data = await gsRun("adminUpload", "talisman-icons", icons);
    return makeJsonResponse(data);
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
