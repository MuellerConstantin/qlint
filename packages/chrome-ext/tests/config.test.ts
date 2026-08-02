import type { LintConfig } from '@qlint/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadConfig, onConfigChange, saveConfig } from '../src/util/config.js';

type StorageListener = (changes: Record<string, { newValue?: unknown }>, area: string) => void;

let stored: Record<string, unknown>;
let listeners: Set<StorageListener>;

/** Minimal stand-in for the slice of `chrome.storage` the config module uses. */
function stubChrome(): void {
  stored = {};
  listeners = new Set();

  vi.stubGlobal('chrome', {
    storage: {
      sync: {
        get: (key: string) => Promise.resolve(key in stored ? { [key]: stored[key] } : {}),
        set: (items: Record<string, unknown>) => {
          Object.assign(stored, items);
          return Promise.resolve();
        },
      },
      onChanged: {
        addListener: (fn: StorageListener) => listeners.add(fn),
        removeListener: (fn: StorageListener) => listeners.delete(fn),
      },
    },
  });
}

/** Simulates a `chrome.storage` change event. */
function emit(changes: Record<string, { newValue?: unknown }>, area = 'sync'): void {
  for (const listener of listeners) {
    listener(changes, area);
  }
}

beforeEach(() => {
  stubChrome();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('loadConfig', () => {
  it('returns an empty config when nothing is stored, so no rule runs implicitly', async () => {
    await expect(loadConfig()).resolves.toEqual({});
  });

  it('returns the stored config', async () => {
    stored.config = { presets: 'recommended' };

    await expect(loadConfig()).resolves.toEqual({ presets: 'recommended' });
  });

  it('falls back to an empty config when the stored value is invalid', async () => {
    stored.config = { presets: 'strict' };

    await expect(loadConfig()).resolves.toEqual({});
  });

  it('falls back to an empty config when storage rejects', async () => {
    vi.stubGlobal('chrome', {
      storage: { sync: { get: () => Promise.reject(new Error('storage unavailable')) } },
    });

    await expect(loadConfig()).resolves.toEqual({});
  });
});

describe('saveConfig', () => {
  it('writes the config under a single storage key', async () => {
    const config: LintConfig = { rules: { 'trailing-whitespace': 'error' } };

    await saveConfig(config);

    expect(stored).toEqual({ config });
  });

  it('round-trips through loadConfig', async () => {
    await saveConfig({ presets: 'recommended' });

    await expect(loadConfig()).resolves.toEqual({ presets: 'recommended' });
  });
});

describe('onConfigChange', () => {
  it('reports a new config', () => {
    const seen: LintConfig[] = [];
    onConfigChange((config) => seen.push(config));

    emit({ config: { newValue: { presets: 'recommended' } } });

    expect(seen).toEqual([{ presets: 'recommended' }]);
  });

  it('reports an empty config when the key is cleared', () => {
    const seen: LintConfig[] = [];
    onConfigChange((config) => seen.push(config));

    emit({ config: { newValue: undefined } });

    expect(seen).toEqual([{}]);
  });

  it('ignores changes in other storage areas', () => {
    const seen: LintConfig[] = [];
    onConfigChange((config) => seen.push(config));

    emit({ config: { newValue: { presets: 'recommended' } } }, 'local');

    expect(seen).toEqual([]);
  });

  it('ignores changes to unrelated keys', () => {
    const seen: LintConfig[] = [];
    onConfigChange((config) => seen.push(config));

    emit({ somethingElse: { newValue: 1 } });

    expect(seen).toEqual([]);
  });

  it('ignores an invalid config rather than propagating it', () => {
    const seen: LintConfig[] = [];
    onConfigChange((config) => seen.push(config));

    emit({ config: { newValue: { presets: 'strict' } } });

    expect(seen).toEqual([]);
  });

  it('stops reporting after unsubscribing', () => {
    const seen: LintConfig[] = [];
    const unsubscribe = onConfigChange((config) => seen.push(config));

    unsubscribe();
    emit({ config: { newValue: { presets: 'recommended' } } });

    expect(seen).toEqual([]);
  });
});
