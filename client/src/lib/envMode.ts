/**
 * envMode.ts — runtime GAS/REST mode store
 *
 * Allows switching between GAS (google.script.run) and REST (fetch) routing
 * at runtime without a rebuild. The chosen mode is persisted in localStorage.
 *
 * Default: "gas" (mirrors the historical IS_GAS_ENV=false dev behaviour where
 * gasMock emulates google.script.run).  Set to "rest" to bypass the GAS layer
 * and hit Express directly.
 */

export type EnvMode = "gas" | "rest";

export const STORAGE_KEY = "envMode";

const DEFAULT_MODE: EnvMode = "gas";

function readFromStorage(): EnvMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "gas" || stored === "rest") return stored;
  } catch {
    // localStorage not available (SSR, private mode)
  }
  return DEFAULT_MODE;
}

let _currentMode: EnvMode = readFromStorage();

const IS_GAS_BUILD: boolean =
  (import.meta.env.VITE_GAS_BUILD as string | undefined) === "true";

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
