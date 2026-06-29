import { validateConfig, type LintConfig } from '@qlint/core';

const STORAGE_KEY = 'config';
const STORAGE_AREA = 'sync';
const SOURCE_LABEL = 'chrome.storage.sync';

export async function loadConfig(): Promise<LintConfig> {
  try {
    const stored = await chrome.storage.sync.get(STORAGE_KEY);
    const raw = stored[STORAGE_KEY];

    if (raw === undefined) {
      return {};
    }

    return validateConfig(raw, SOURCE_LABEL);
  } catch (err) {
    console.warn('[qlint:config] failed to load stored config, falling back to defaults', err);
    return {};
  }
}

export async function saveConfig(config: LintConfig): Promise<void> {
  await chrome.storage.sync.set({ [STORAGE_KEY]: config });
}

export function onConfigChange(callback: (config: LintConfig) => void): () => void {
  const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string): void => {
    if (area !== STORAGE_AREA || !(STORAGE_KEY in changes)) {
      return;
    }

    const raw = changes[STORAGE_KEY].newValue;

    if (raw === undefined) {
      callback({});
      return;
    }

    try {
      callback(validateConfig(raw, SOURCE_LABEL));
    } catch (err) {
      console.warn('[qlint:config] ignoring invalid config received via storage change', err);
    }
  };

  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
