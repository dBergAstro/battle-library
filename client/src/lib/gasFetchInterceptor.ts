/**
 * gasFetchInterceptor.ts
 *
 * В GAS-среде нет Express-сервера, поэтому все fetch(/api/...) вернут 404.
 * Этот модуль перехватывает window.fetch и маршрутизирует REST-вызовы
 * через google.script.run — без изменений в компонентах.
 *
 * Референс маппинга: gas-architecture/GAS_BACKEND.md
 */

function gsRun<T>(fnName: string, ...args: any[]): Promise<T> {
  return new Promise((resolve, reject) => {
    const runner = (window as any).google.script.run
      .withSuccessHandler((result: any) => {
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
    const data = await gsRun("getBattles");
    return makeJsonResponse(data);
  }

  // GET /api/replays
  if (m === "GET" && u === "/api/replays") {
    const data = await gsRun("getReplays");
    return makeJsonResponse(data);
  }

  // GET /api/tags
  if (m === "GET" && u === "/api/tags") {
    const data = await gsRun("getTags");
    return makeJsonResponse(data);
  }

  // GET /api/collection
  if (m === "GET" && u === "/api/collection") {
    const data = await gsRun("getCollection");
    return makeJsonResponse(data);
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

  // POST /api/admin/:type  — generic admin upload
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

      try {
        const response = await routeToGas(url, method, body);
        if (response !== null) {
          console.debug(`[gasFetch] ${method} ${url} → google.script.run`);
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
