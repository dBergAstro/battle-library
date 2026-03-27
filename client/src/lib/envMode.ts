export type EnvMode = "gas" | "rest";

export const STORAGE_KEY = "envMode";

const IS_GAS_BUILD: boolean =
  (import.meta.env.VITE_GAS_BUILD as string | undefined) === "true";

const MIGRATION_KEY = "envMode_migrated_v1";

function readFromStorage(): EnvMode {
  if (IS_GAS_BUILD) return "gas";
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    // One-time migration: clear stale "gas" default → REST
    if (stored === "gas" && !localStorage.getItem(MIGRATION_KEY)) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(MIGRATION_KEY, "1");
      return "rest";
    }
    if (stored === "gas" || stored === "rest") return stored;
  } catch {
    // localStorage not available
  }
  return "rest";
}

let _currentMode: EnvMode = readFromStorage();

export function getEnvMode(): EnvMode {
  if (IS_GAS_BUILD) return "gas";
  return _currentMode;
}

export function setEnvMode(mode: EnvMode): void {
  _currentMode = mode;
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // ignore
  }
}
