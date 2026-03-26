export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

export type LogCategory =
  | "GAS_CALL"
  | "REST_CALL"
  | "UPLOAD"
  | "ICONS"
  | "TAGS"
  | "COLLECTION"
  | "SYNC"
  | "GENERAL";

export interface LogEntry {
  id: number;
  timestamp: Date;
  level: LogLevel;
  category: LogCategory;
  method: string;
  message: string;
  durationMs?: number;
  responseSize?: number;
  error?: string;
}

const MAX_ENTRIES = 200;
let nextId = 1;
const entries: LogEntry[] = [];
const subscribers: Array<(entries: LogEntry[]) => void> = [];

function notifySubscribers() {
  const snapshot = [...entries];
  for (const cb of subscribers) {
    try {
      cb(snapshot);
    } catch {
    }
  }
}

export function log(
  level: LogLevel,
  category: LogCategory,
  method: string,
  message: string,
  extras?: { durationMs?: number; responseSize?: number; error?: string }
): void {
  const entry: LogEntry = {
    id: nextId++,
    timestamp: new Date(),
    level,
    category,
    method,
    message,
    ...extras,
  };

  entries.unshift(entry);

  if (entries.length > MAX_ENTRIES) {
    entries.length = MAX_ENTRIES;
  }

  notifySubscribers();
}

export function getEntries(): LogEntry[] {
  return [...entries];
}

export function clearEntries(): void {
  entries.length = 0;
  notifySubscribers();
}

export function subscribe(cb: (entries: LogEntry[]) => void): () => void {
  subscribers.push(cb);
  return () => {
    const idx = subscribers.indexOf(cb);
    if (idx !== -1) subscribers.splice(idx, 1);
  };
}


export function logGasCall<T>(
  fnName: string,
  argSummary: string,
  promise: Promise<T>
): Promise<T> {
  const start = Date.now();

  log("INFO", "GAS_CALL", fnName, `GAS call started — args: ${argSummary}`);

  return promise.then(
    (result) => {
      const durationMs = Date.now() - start;
      let responseSize: number | undefined;
      if (Array.isArray(result)) {
        responseSize = result.length;
      } else if (result && typeof result === "object") {
        const r = result as Record<string, unknown>;
        for (const key of Object.keys(r)) {
          if (Array.isArray(r[key])) {
            responseSize = (r[key] as unknown[]).length;
            break;
          }
        }
      }
      // For write operations (adminUpload, save*, etc) — show full response summary
      let responseSummary: string | undefined;
      if (result && typeof result === "object" && !Array.isArray(result)) {
        const r = result as Record<string, unknown>;
        const parts: string[] = [];
        if ("success" in r) parts.push(`success=${r.success}`);
        if ("count" in r) parts.push(`count=${r.count}`);
        if ("uploaded" in r) parts.push(`uploaded=${r.uploaded}`);
        if ("errors" in r) parts.push(`errors=${r.errors}`);
        if ("error" in r) parts.push(`error=${r.error}`);
        if (parts.length > 0) responseSummary = `{ ${parts.join(", ")} }`;
      }
      log("INFO", "GAS_CALL", fnName, `GAS call OK${responseSummary ? ` → ${responseSummary}` : ""}`, { durationMs, responseSize });
      return result;
    },
    (err: unknown) => {
      const durationMs = Date.now() - start;
      const error = err instanceof Error ? err.message : String(err);
      log("ERROR", "GAS_CALL", fnName, `GAS call failed`, { durationMs, error });
      throw err;
    }
  );
}

export function logRestCall<T>(
  method: string,
  url: string,
  promise: Promise<T>
): Promise<T> {
  const start = Date.now();
  const label = `${method} ${url}`;

  log("INFO", "REST_CALL", label, `REST call started`);

  return promise.then(
    (result) => {
      const durationMs = Date.now() - start;
      let responseSize: number | undefined;
      if (Array.isArray(result)) {
        responseSize = result.length;
      } else if (result && typeof result === "object") {
        const r = result as Record<string, unknown>;
        for (const key of Object.keys(r)) {
          if (Array.isArray(r[key])) {
            responseSize = (r[key] as unknown[]).length;
            break;
          }
        }
      }
      log("INFO", "REST_CALL", label, `REST call OK`, { durationMs, responseSize });
      return result;
    },
    (err: unknown) => {
      const durationMs = Date.now() - start;
      const error = err instanceof Error ? err.message : String(err);
      log("ERROR", "REST_CALL", label, `REST call failed`, { durationMs, error });
      throw err;
    }
  );
}
