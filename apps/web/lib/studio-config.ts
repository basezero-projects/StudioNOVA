const STORAGE_KEY = "studionova:config";

export type StudioConfig = {
  apiBaseUrl: string;
  comfyApiUrl: string;
  kohyaRoot: string;
  outputDir: string;
  datasetRoot: string;
};

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function normalizePath(value: string | undefined, fallback: string): string {
  if (!value) {
    return fallback;
  }
  return value.trim() || fallback;
}

export function getDefaultConfig(): StudioConfig {
  return {
    apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000",
    comfyApiUrl: normalizePath(process.env.NEXT_PUBLIC_COMFYUI_API_URL ?? process.env.COMFYUI_API_URL, "http://localhost:8188"),
    kohyaRoot: normalizePath(process.env.KOHYA_PATH ?? process.env.KOHYA_ROOT, "external/kohya_ss"),
    outputDir: normalizePath(process.env.OUTPUT_DIR, "storage/results"),
    datasetRoot: normalizePath(process.env.KOHYA_DATASET_ROOT, "datasets"),
  };
}

export function loadConfig(): StudioConfig {
  const defaults = getDefaultConfig();

  if (!isBrowser()) {
    return defaults;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaults;
    }
    const parsed = JSON.parse(raw) as Partial<StudioConfig>;
    return {
      ...defaults,
      ...parsed,
    };
  } catch {
    return defaults;
  }
}

export function saveConfig(config: StudioConfig): void {
  if (!isBrowser()) {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function getConfigStorageKey(): string {
  return STORAGE_KEY;
}


