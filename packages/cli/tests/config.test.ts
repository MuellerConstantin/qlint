import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { initConfig, loadConfig } from '../src/config.js';

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

describe('initConfig', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'qlint-cli-init-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('writes a qlint.json naming the recommended preset', () => {
    const path = initConfig(dir);

    expect(path).toBe(join(dir, 'qlint.json'));
    expect(JSON.parse(readFileSync(path, 'utf8'))).toEqual({ presets: 'recommended', rules: {} });
  });

  it('produces a file that loadConfig accepts', () => {
    const path = initConfig(dir);

    expect(loadConfig(path)).toEqual({ presets: 'recommended', rules: {} });
  });

  it('refuses to overwrite an existing config file', () => {
    writeFileSync(join(dir, 'qlint.json'), '{ "rules": {} }', 'utf8');

    expect(() => initConfig(dir)).toThrow(/already exists/);
  });
});
