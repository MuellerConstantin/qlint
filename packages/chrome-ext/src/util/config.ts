import { validateConfig, type LintConfig } from '@qlinter/core';
import { STORAGE_AREA, STORAGE_KEY, readStoredConfig } from './storage.js';

export { DEFAULT_CONFIG, saveConfig, seedDefaultConfig } from './storage.js';

const SOURCE_LABEL = 'chrome.storage.sync';

export async function loadConfig(): Promise<LintConfig> {
  try {
    const raw = await readStoredConfig();

    if (raw === undefined) {
      return {};
    }

    return validateConfig(raw, SOURCE_LABEL);
  } catch (err) {
    console.warn('[qlinter:config] failed to load stored config, falling back to defaults', err);
    return {};
  }
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
      console.warn('[qlinter:config] ignoring invalid config received via storage change', err);
    }
  };

  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
