import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { configFromSettings, loadConfigFile, resolveConfig } from '../src/config.js';

describe('loadConfigFile', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'qlint-vscode-config-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function write(name: string, contents: string): string {
    const path = join(dir, name);
    writeFileSync(path, contents, 'utf8');
    return path;
  }

  it('reads and parses a valid config file', () => {
    const path = write('qlint.json', JSON.stringify({ rules: { 'trailing-whitespace': 'off' } }));
    expect(loadConfigFile(path)).toEqual({ rules: { 'trailing-whitespace': 'off' } });
  });

  it('throws when the config names an unknown preset', () => {
    const path = write('qlint.json', JSON.stringify({ presets: 'strict' }));
    expect(() => loadConfigFile(path)).toThrow(/unknown preset "strict"/);
  });

  it('throws a clear error when the file does not exist', () => {
    expect(() => loadConfigFile(join(dir, 'missing.json'))).toThrow(/Config file not found/);
  });

  it('throws when the file is not valid JSON', () => {
    const path = write('qlint.json', '{ rules: ');
    expect(() => loadConfigFile(path)).toThrow(/Invalid JSON/);
  });
});

describe('configFromSettings', () => {
  it('collapses empty defaults to an empty config so nothing runs implicitly', () => {
    expect(configFromSettings({ presets: [], rules: {} })).toEqual({});
  });

  it('keeps a named preset', () => {
    expect(configFromSettings({ presets: ['recommended'], rules: {} })).toEqual({ presets: ['recommended'] });
  });

  it('keeps per-rule overrides', () => {
    expect(configFromSettings({ presets: [], rules: { 'trailing-whitespace': 'off' } })).toEqual({
      rules: { 'trailing-whitespace': 'off' },
    });
  });

  it('throws when settings name an unknown preset', () => {
    expect(() => configFromSettings({ presets: ['strict'], rules: {} })).toThrow(/unknown preset "strict"/);
  });
});

describe('resolveConfig', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'qlint-vscode-resolve-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  const settings = { presets: ['recommended'], rules: {} };

  it('prefers a qlint.json at the folder root over settings', () => {
    writeFileSync(join(dir, 'qlint.json'), JSON.stringify({ rules: { 'trailing-whitespace': 'off' } }), 'utf8');

    expect(resolveConfig(dir, settings)).toEqual({
      config: { rules: { 'trailing-whitespace': 'off' } },
      source: 'qlint.json',
      path: join(dir, 'qlint.json'),
    });
  });

  it('falls back to settings when the folder has no qlint.json', () => {
    expect(resolveConfig(dir, settings)).toEqual({
      config: { presets: ['recommended'] },
      source: 'settings',
    });
  });

  it('uses settings for a loose file with no workspace folder', () => {
    expect(resolveConfig(undefined, settings)).toEqual({
      config: { presets: ['recommended'] },
      source: 'settings',
    });
  });

  it('resolves to an empty config when neither a file nor settings apply', () => {
    expect(resolveConfig(dir, { presets: [], rules: {} })).toEqual({ config: {}, source: 'settings' });
  });
});
