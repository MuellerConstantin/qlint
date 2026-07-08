import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';

describe('loadConfig', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'qlint-cli-config-'));
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
    expect(loadConfig(path)).toEqual({ rules: { 'trailing-whitespace': 'off' } });
  });

  it('accepts a config that opts out of every preset and keeps only its rules', () => {
    const path = write('qlint.json', JSON.stringify({ presets: [], rules: { 'trailing-whitespace': 'off' } }));
    expect(loadConfig(path)).toEqual({ presets: [], rules: { 'trailing-whitespace': 'off' } });
  });

  it('throws when the config names an unknown preset', () => {
    const path = write('qlint.json', JSON.stringify({ presets: 'strict' }));
    expect(() => loadConfig(path)).toThrow(/unknown preset "strict"/);
  });

  it('throws a clear error when the file does not exist', () => {
    expect(() => loadConfig(join(dir, 'missing.json'))).toThrow(/Config file not found/);
  });

  it('throws when the file is not valid JSON', () => {
    const path = write('qlint.json', '{ rules: ');
    expect(() => loadConfig(path)).toThrow(/Invalid JSON/);
  });

  it('forwards the file path as the source label in validation errors', () => {
    const path = write('qlint.json', '[]');
    expect(() => loadConfig(path)).toThrow(new RegExp(`Config in .*qlint\\.json must be a JSON object`));
  });
});
