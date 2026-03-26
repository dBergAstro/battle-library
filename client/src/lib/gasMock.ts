/**
 * gasMock.ts — мок google.script.run для dev-режима
 *
 * В dev (Replit / localhost) window.google не существует.
 * Этот мок имитирует API через реальные REST-вызовы,
 * чтобы gasApi.ts работал корректно в любой среде.
 *
 * installGasMock() вызывается из main.tsx до ReactDOM.createRoot.
 */

export function installGasMock(): void {
  if (typeof window === "undefined") return;
  if ((window as any).google?.script?.run) return;

  const delay = (ms = 10) => new Promise<void>((r) => setTimeout(r, ms));

  async function restFetch<T>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(url, { credentials: "include", ...options });
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
  }

  const MOCK_HANDLERS: Record<string, (...args: any[]) => Promise<any>> = {
    getBattles: () => restFetch("/api/battles"),
    getReplays: () => restFetch("/api/replays"),
    getTags: () => restFetch("/api/tags"),
    getCollection: () => restFetch("/api/collection"),
    getAdminStats: () => restFetch("/api/admin/stats"),

    saveTag: (battleGameId: number, tag: string) =>
      restFetch(`/api/tags/${battleGameId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag }),
      }),

    deleteTag: (battleGameId: number, tag: string) =>
      restFetch(`/api/tags/${battleGameId}/${encodeURIComponent(tag)}`, {
        method: "DELETE",
      }),

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

    clearCollection: () =>
      restFetch("/api/collection", { method: "DELETE" }),

    adminUpload: (type: string, data: any) =>
      restFetch(`/api/admin/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),

    setMainBuff: (slot: "A" | "B", name: string, effectKey: string) =>
      restFetch("/api/admin/settings/main-buff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot, name, effectKey }),
      }),
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
