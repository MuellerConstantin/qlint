import type { LintConfig } from '@qlint/core';

/*
 * The storage primitives, deliberately free of any runtime import from
 * `@qlint/core` — `LintConfig` is a type-only import and is erased at build
 * time. The service worker seeds the default config on startup and needs
 * nothing but these; pulling in `validateConfig` would drag the lexer and the
 * whole rule registry into a bundle that MV3 re-parses on every wake.
 * Validation lives one layer up, in `config.ts`.
 */
export const STORAGE_KEY = 'config';
export const STORAGE_AREA = 'sync';

/** Reads the stored config without validating it. `undefined` when never written. */
export async function readStoredConfig(): Promise<unknown> {
  const stored = await chrome.storage.sync.get(STORAGE_KEY);
  return stored[STORAGE_KEY];
}

export async function saveConfig(config: LintConfig): Promise<void> {
  await chrome.storage.sync.set({ [STORAGE_KEY]: config });
}

/*
 * The config a fresh install starts from. Deliberately the opinionated preset:
 * an extension that lints nothing until you visit its options page looks
 * broken. Core still applies nothing implicitly — this is written into storage
 * as a real, explicit `presets` entry, so the options page shows it selected
 * and the user can remove it like any other.
 */
export const DEFAULT_CONFIG: LintConfig = { presets: 'recommended' };

/**
 * Writes {@link DEFAULT_CONFIG} to storage if — and only if — no config has
 * ever been stored.
 *
 * Seeding keys off the *presence* of the storage key, not off whether the
 * stored config names a preset. Removing every preset on the options page
 * saves `{}`, which is a deliberate choice and must survive: a later seed pass
 * finds the key present and leaves it alone. Safe to call on every startup.
 *
 * @returns Whether the default was written.
 */
export async function seedDefaultConfig(): Promise<boolean> {
  try {
    if ((await readStoredConfig()) !== undefined) {
      return false;
    }

    await saveConfig(DEFAULT_CONFIG);
    return true;
  } catch (err) {
    console.warn('[qlint:config] failed to seed the default config', err);
    return false;
  }
}
