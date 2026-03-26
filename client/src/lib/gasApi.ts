/**
 * gasApi.ts — обёртка для вызовов через google.script.run (GAS)
 *
 * Референс: gas-architecture/GAS_BACKEND.md
 *
 * IS_GAS_ENV=true  → google.script.run (GAS prod)
 * IS_GAS_ENV=false → REST API (Replit dev / gasMock)
 */

import { logGasCall, logRestCall } from "./gasLogger";

// Build-time constant: true when bundled via vite.gas.config.ts, false otherwise.
// import.meta.env.VITE_GAS_BUILD is injected by vite.gas.config.ts define block.
// This lets esbuild tree-shake the unused (REST or GAS) branch at bundle time.
export const IS_GAS_ENV: boolean =
  (import.meta.env.VITE_GAS_BUILD as string | undefined) === "true";

function summarizeArgs(args: any[]): string {
  if (args.length === 0) return "()";
  return args
    .map((a) => {
      if (a === null || a === undefined) return String(a);
      if (typeof a === "string") return a.length > 40 ? `"${a.slice(0, 37)}…"` : `"${a}"`;
      if (Array.isArray(a)) return `[${a.length} items]`;
      if (typeof a === "object") return `{…}`;
      return String(a);
    })
    .join(", ");
}

function gsRun<T>(fnName: string, ...args: any[]): Promise<T> {
  const raw = new Promise<T>((resolve, reject) => {
    const runner = (window as any).google.script.run
      .withSuccessHandler((result: any) => {
        if (result === null || result === undefined) {
          reject(new Error(`${fnName} returned null`));
          return;
        }
        if (result.error) {
          reject(new Error(result.error));
          return;
        }
        resolve(result as T);
      })
      .withFailureHandler((err: any) => {
        reject(new Error(err?.message || String(err)));
      });
    runner[fnName](...args);
  });

  return logGasCall(fnName, summarizeArgs(args), raw);
}

async function restFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const method = options?.method || "GET";
  const raw = (async () => {
    const res = await fetch(url, {
      credentials: "include",
      ...options,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
  })();

  return logRestCall(method, url, raw);
}

async function restPost<T>(url: string, data: any): Promise<T> {
  return restFetch<T>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

async function restDelete<T>(url: string, data?: any): Promise<T> {
  return restFetch<T>(url, {
    method: "DELETE",
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
  });
}

export const gasApi = {
  // ─── Чтение данных ─────────────────────────────────────────────────────────

  getBattles: (): Promise<any> =>
    IS_GAS_ENV ? gsRun("getBattles") : restFetch("/api/battles"),

  getReplays: (): Promise<any> =>
    IS_GAS_ENV ? gsRun("getReplays") : restFetch("/api/replays"),

  getTags: (): Promise<any> =>
    IS_GAS_ENV ? gsRun("getTags") : restFetch("/api/tags"),

  getCollection: (): Promise<any> =>
    IS_GAS_ENV ? gsRun("getCollection") : restFetch("/api/collection"),

  getAdminStats: (): Promise<any> =>
    IS_GAS_ENV ? gsRun("getAdminStats") : restFetch("/api/admin/stats"),

  // GAS: getBuffConfig() → { mainBuffName, buffNames[], ... }
  // REST: нет эквивалента — возвращает заглушку
  getBuffConfig: (): Promise<any> =>
    IS_GAS_ENV ? gsRun("getBuffConfig") : restFetch("/api/admin/stats"),

  getLogs: async (): Promise<{ logs: Array<{ timestamp: string; level: string; function: string; message: string; data?: string }> }> => {
    if (!IS_GAS_ENV) return { logs: [] };
    const raw = await gsRun("getServerLogs");
    const logs = (raw?.logs ?? []).map((entry: any) => ({
      ...entry,
      // GAS Sheets возвращает timestamp как Date-объект — приводим к ISO строке
      timestamp: entry.timestamp
        ? (entry.timestamp instanceof Date
            ? entry.timestamp.toISOString()
            : typeof entry.timestamp === "number"
              ? new Date(entry.timestamp).toISOString()
              : String(entry.timestamp))
        : null,
    }));
    return { logs };
  },

  // ─── Теги ──────────────────────────────────────────────────────────────────

  // battleGameId: string | number (GAS хранит как string в Sheets)
  saveTag: (battleGameId: string | number, tag: string): Promise<any> =>
    IS_GAS_ENV
      ? gsRun("saveTag", battleGameId, tag)
      : restPost(`/api/tags/${battleGameId}`, { tag }),

  deleteTag: (battleGameId: string | number, tag: string): Promise<any> =>
    IS_GAS_ENV
      ? gsRun("deleteTag", battleGameId, tag)
      : restDelete(`/api/tags/${battleGameId}/${encodeURIComponent(tag)}`),

  // ─── Коллекция ─────────────────────────────────────────────────────────────

  saveCollectionItem: (item: any): Promise<any> =>
    IS_GAS_ENV
      ? gsRun("saveCollectionItem", item)
      : restPost("/api/collection", item),

  deleteCollectionItem: (id: string): Promise<any> =>
    IS_GAS_ENV
      ? gsRun("deleteCollectionItem", id)
      : restDelete(`/api/collection/${encodeURIComponent(id)}`),

  clearCollection: (): Promise<any> =>
    IS_GAS_ENV ? gsRun("clearCollection") : restDelete("/api/collection"),

  // ─── Админ / загрузка данных ───────────────────────────────────────────────

  adminUpload: (type: string, data: any): Promise<any> =>
    IS_GAS_ENV
      ? gsRun("adminUpload", type, data)
      : restPost(`/api/admin/${type}`, data),

  // GAS: uploadIconsBatch(cat, icons) — загружает иконки в Google Drive
  // REST: нет прямого эквивалента (Replit хранит base64 через adminUpload)
  uploadIconsBatch: (cat: string, icons: any[]): Promise<any> =>
    IS_GAS_ENV
      ? gsRun("uploadIconsBatch", cat, icons)
      : restPost(`/api/admin/${cat}-icons`, icons),

  // ─── Настройки баффов ──────────────────────────────────────────────────────

  // GAS: saveMainBuffName(name) — один аргумент
  // REST: POST /api/admin/settings/main-buff { name }
  setMainBuffName: (name: string): Promise<any> =>
    IS_GAS_ENV
      ? gsRun("saveMainBuffName", name)
      : restPost("/api/admin/settings/main-buff", { name }),

  // Полный вариант: slot + effectKey (только REST; в GAS деградирует до name)
  setMainBuff: (slot: "A" | "B", name: string, effectKey: string): Promise<any> =>
    IS_GAS_ENV
      ? gsRun("saveMainBuffName", name)
      : restPost("/api/admin/settings/main-buff", { slot, name, effectKey }),

  // GAS: saveBuffNames(arr) — принимает JSON.stringify(arr)!
  // REST: нет эквивалента — сохраняет через settings/main-buff
  saveBuffNames: (arr: string[]): Promise<any> =>
    IS_GAS_ENV
      ? gsRun("saveBuffNames", JSON.stringify(arr))
      : restPost("/api/admin/settings/main-buff", { buffNames: arr }),

  // ─── Синхронизация (GAS-only) ──────────────────────────────────────────────

  // GAS: syncFromGitLab(branch) — скачивает данные из GitLab
  // REST: нет эквивалента
  syncFromGitLab: (branch: string): Promise<any> =>
    IS_GAS_ENV
      ? gsRun("syncFromGitLab", branch)
      : Promise.reject(new Error("syncFromGitLab: not supported in Replit")),
};
