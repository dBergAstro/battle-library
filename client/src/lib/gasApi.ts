/**
 * gasApi.ts — обёртка для вызовов через google.script.run (GAS)
 *
 * В prod (GAS) используется window.google.script.run
 * В dev (Replit / localhost) падает на REST API через fetch
 *
 * Используется только если явно импортируется — существующий код с useQuery не трогается.
 */

export const IS_GAS_ENV = typeof window !== "undefined" && !!(window as any).google?.script?.run;

function gsRun<T>(fnName: string, ...args: any[]): Promise<T> {
  return new Promise((resolve, reject) => {
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
}

async function restFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
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

  saveTag: (battleGameId: number, tag: string): Promise<any> =>
    IS_GAS_ENV
      ? gsRun("saveTag", battleGameId, tag)
      : restPost(`/api/tags/${battleGameId}`, { tag }),

  deleteTag: (battleGameId: number, tag: string): Promise<any> =>
    IS_GAS_ENV
      ? gsRun("deleteTag", battleGameId, tag)
      : restDelete(`/api/tags/${battleGameId}/${encodeURIComponent(tag)}`),

  saveCollectionItem: (item: any): Promise<any> =>
    IS_GAS_ENV ? gsRun("saveCollectionItem", item) : restPost("/api/collection", item),

  deleteCollectionItem: (id: string): Promise<any> =>
    IS_GAS_ENV
      ? gsRun("deleteCollectionItem", id)
      : restDelete(`/api/collection/${encodeURIComponent(id)}`),

  clearCollection: (): Promise<any> =>
    IS_GAS_ENV ? gsRun("clearCollection") : restDelete("/api/collection"),

  adminUpload: (type: string, data: any): Promise<any> =>
    IS_GAS_ENV
      ? gsRun("adminUpload", type, data)
      : restPost(`/api/admin/${type}`, data),

  // GAS: setMainBuffName(name) — один аргумент
  // Replit REST: POST /api/admin/settings/main-buff { slot, name, effectKey }
  setMainBuffName: (name: string): Promise<any> =>
    IS_GAS_ENV
      ? gsRun("setMainBuffName", name)
      : restPost("/api/admin/settings/main-buff", { name }),

  // Полный вариант для Replit (slot + effectKey)
  setMainBuff: (slot: "A" | "B", name: string, effectKey: string): Promise<any> =>
    IS_GAS_ENV
      ? gsRun("setMainBuffName", name)
      : restPost("/api/admin/settings/main-buff", { slot, name, effectKey }),
};
