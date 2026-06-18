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

  it('returns empty config when "rules" is missing', () => {
    const path = write('qlint.json', '{}');
    expect(loadConfig(path)).toEqual({});
  });

  it('parses a severity-only rule entry', () => {
    const path = write('qlint.json', JSON.stringify({ rules: { 'trailing-whitespace': 'off' } }));
    expect(loadConfig(path)).toEqual({ rules: { 'trailing-whitespace': 'off' } });
  });

  it('parses a [severity, options] rule entry', () => {
    const path = write(
      'qlint.json',
      JSON.stringify({ rules: { 'max-line-length': ['warning', { limit: 120 }] } }),
    );
    expect(loadConfig(path)).toEqual({
      rules: { 'max-line-length': ['warning', { limit: 120 }] },
    });
  });

  it('throws a clear error when the file does not exist', () => {
    expect(() => loadConfig(join(dir, 'missing.json'))).toThrow(/Config file not found/);
  });

  it('throws when the file is not valid JSON', () => {
    const path = write('qlint.json', '{ rules: ');
    expect(() => loadConfig(path)).toThrow(/Invalid JSON/);
  });

  it('throws when the top level is not an object', () => {
    const path = write('qlint.json', '[]');
    expect(() => loadConfig(path)).toThrow(/must be a JSON object/);
  });

  it('throws when "rules" is not an object', () => {
    const path = write('qlint.json', JSON.stringify({ rules: [] }));
    expect(() => loadConfig(path)).toThrow(/"rules".*must be an object/);
  });

  it('throws on an unknown severity string', () => {
    const path = write('qlint.json', JSON.stringify({ rules: { 'foo': 'fatal' } }));
    expect(() => loadConfig(path)).toThrow(/invalid severity "fatal"/);
  });

  it('throws when a rule entry has the wrong shape', () => {
    const path = write('qlint.json', JSON.stringify({ rules: { 'foo': 42 } }));
    expect(() => loadConfig(path)).toThrow(/must be a severity string or an array/);
  });

  it('throws when a [severity, options] array has too many elements', () => {
    const path = write('qlint.json', JSON.stringify({ rules: { 'foo': ['warning', {}, 'extra'] } }));
    expect(() => loadConfig(path)).toThrow(/\[severity\] or \[severity, options\]/);
  });
});
