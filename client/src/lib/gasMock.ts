/**
 * gasMock.ts — мок google.script.run для dev-режима
 *
 * Референс: gas-architecture/GAS_BACKEND.md
 *
 * В dev (Replit / localhost) window.google не существует.
 * Этот мок имитирует API через реальные REST-вызовы,
 * обеспечивая 1:1 паритет с gasApi.ts.
 *
 * Режимы (VITE_MOCK_MODE):
 *   rest    — все вызовы проксируются в REST API Express-сервера (по умолчанию)
 *   static  — все read-вызовы возвращают статические данные из gasMockData.ts
 *
 * installGasMock() вызывается из main.tsx до ReactDOM.createRoot.
 */

import {
  staticBattlesData,
  staticReplaysData,
  staticTagsData,
  staticCollectionData,
  staticAdminStatsData,
} from "./gasMockData";

export function installGasMock(): void {
  if (typeof window === "undefined") return;
  if ((window as any).google?.script?.run) return;

  const mockMode = (import.meta.env.VITE_MOCK_MODE as string | undefined) ?? "rest";
  console.info(`[gasMock] mode: ${mockMode}`);

  const delay = (ms = 10) => new Promise<void>((r) => setTimeout(r, ms));

  async function restFetch<T>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(url, { credentials: "include", ...options });
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
  }

  const isStatic = mockMode === "static";

  const MOCK_HANDLERS: Record<string, (...args: any[]) => Promise<any>> = {
    // ─── Чтение данных ───────────────────────────────────────────────────────
    getBattles: () =>
      isStatic
        ? Promise.resolve(staticBattlesData)
        : restFetch("/api/battles"),

    getReplays: () =>
      isStatic
        ? Promise.resolve(staticReplaysData)
        : restFetch("/api/replays"),

    getTags: () =>
      isStatic
        ? Promise.resolve(staticTagsData)
        : restFetch("/api/tags"),

    getCollection: () =>
      isStatic
        ? Promise.resolve(staticCollectionData)
        : restFetch("/api/collection"),

    getAdminStats: () =>
      isStatic
        ? Promise.resolve(staticAdminStatsData)
        : restFetch("/api/admin/stats"),

    // GAS: getBuffConfig() — нет REST-эквивалента, возвращаем заглушку
    getBuffConfig: () =>
      isStatic
        ? Promise.resolve({ success: true, active: "Бафф A", names: ["Бафф A", "Бафф B", "Бафф C"] })
        : restFetch("/api/admin/stats"),

    // GAS: getServerLogs() — нет REST-эквивалента
    getServerLogs: () => Promise.resolve([]),

    // ─── Теги ─────────────────────────────────────────────────────────────────
    saveTag: (battleGameId: string | number, tag: string) =>
      restFetch(`/api/tags/${battleGameId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag }),
      }),

    deleteTag: (battleGameId: string | number, tag: string) =>
      restFetch(`/api/tags/${battleGameId}/${encodeURIComponent(tag)}`, {
        method: "DELETE",
      }),

    // ─── Коллекция ────────────────────────────────────────────────────────────
    saveCollectionItem: (item: any) =>
      restFetch("/api/collection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      }),

    deleteCollectionItem: (id: string) =>
      restFetch(`/api/collection/${encodeURIComponent(id)}`, {
        method: "DELETE",
      }),

    clearCollection: () => restFetch("/api/collection", { method: "DELETE" }),

    // ─── Админ / загрузка данных ──────────────────────────────────────────────
    adminUpload: (type: string, data: any) =>
      restFetch(`/api/admin/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),

    // GAS: uploadIconsBatch(cat, icons) — нет прямого REST-эквивалента
    uploadIconsBatch: (cat: string, icons: any[]) =>
      restFetch(`/api/admin/${cat}-icons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(icons),
      }),

    // ─── Настройки баффов ─────────────────────────────────────────────────────
    // GAS: saveMainBuffName(name)
    saveMainBuffName: (name: string) =>
      restFetch("/api/admin/settings/main-buff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }),

    // GAS: saveBuffNames(jsonStr) — принимает JSON.stringify(arr)
    saveBuffNames: (jsonStr: string) => {
      let buffNames: string[];
      try { buffNames = JSON.parse(jsonStr); } catch { buffNames = []; }
      return restFetch("/api/admin/settings/main-buff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buffNames }),
      });
    },

    // ─── Синхронизация (GAS-only) ─────────────────────────────────────────────
    syncFromGitLab: (branch: string) => {
      console.warn(`[gasMock] syncFromGitLab("${branch}") — not supported in dev`);
      return Promise.resolve({ ok: false, message: "not supported in Replit" });
    },
  };

  function makeRunner(
    successHandler: ((result: any) => void) | null,
    failureHandler: ((err: any) => void) | null
  ) {
    const runner: any = {};

    for (const [fnName, handler] of Object.entries(MOCK_HANDLERS)) {
      runner[fnName] = (...args: any[]) => {
        delay().then(() =>
          handler(...args)
            .then((result) => successHandler?.(result))
            .catch((err: any) => {
              console.warn(`[gasMock] ${fnName} error:`, err);
              failureHandler?.({ message: err?.message || String(err) });
            })
        );
      };
    }

    return runner;
  }

  (window as any).google = {
    script: {
      run: new Proxy(
        {},
        {
          get(_target, prop: string) {
            if (prop === "withSuccessHandler") {
              return (cb: (result: any) => void) => ({
                withFailureHandler: (ecb: (err: any) => void) =>
                  makeRunner(cb, ecb),
                ...makeRunner(cb, null),
              });
            }
            if (prop === "withFailureHandler") {
              return (ecb: (err: any) => void) => ({
                withSuccessHandler: (cb: (result: any) => void) =>
                  makeRunner(cb, ecb),
                ...makeRunner(null, ecb),
              });
            }
            const handler = MOCK_HANDLERS[prop];
            if (handler) {
              return (...args: any[]) => {
                delay().then(() =>
                  handler(...args).catch((e: any) =>
                    console.warn(`[gasMock] ${prop} error:`, e)
                  )
                );
              };
            }
            return undefined;
          },
        }
      ),
    },
  };

  console.info("[gasMock] Google Apps Script mock installed (dev mode)");
}
