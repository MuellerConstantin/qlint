import { describe, expect, it } from 'vitest';
import { lint } from '../src/runner.js';
import { recommended, resolveConfig } from '../src/rules/index.js';

const SOURCE = 'SET vX=1;\n';

describe('resolveConfig', () => {
  it('expands a preset name to that preset\'s rules', () => {
    expect(resolveConfig({ presets: 'recommended' })).toEqual({ rules: recommended.rules });
  });

  it('treats a single preset name and a one-element array identically', () => {
    expect(resolveConfig({ presets: ['recommended'] })).toEqual(resolveConfig({ presets: 'recommended' }));
  });

  it('resolves an empty preset list to no rules', () => {
    expect(resolveConfig({ presets: [] })).toEqual({ rules: {} });
  });

  it('applies no preset when none is named', () => {
    expect(resolveConfig({ rules: { 'trailing-whitespace': 'off' } })).toEqual({
      rules: { 'trailing-whitespace': 'off' },
    });
  });

  it('overlays config rules over the preset base per rule id', () => {
    const resolved = resolveConfig({
      presets: 'recommended',
      rules: { 'max-line-length': ['error', { max: 50 }] },
    });

    expect(resolved.rules?.['max-line-length']).toEqual(['error', { max: 50 }]);
    expect(resolved.rules?.['trailing-whitespace']).toBe(recommended.rules?.['trailing-whitespace']);
  });

  it('throws on an unknown preset name', () => {
    expect(() => resolveConfig({ presets: 'strict' as 'recommended' })).toThrow(/Unknown preset "strict"/);
  });
});

describe('lint preset resolution', () => {
  it('lints with the named preset exactly as passing the recommended object', () => {
    expect(lint(SOURCE, { presets: 'recommended' })).toEqual(lint(SOURCE, recommended));
  });

  it('runs no rules when the preset list is empty', () => {
    expect(lint(SOURCE, { presets: [] })).toEqual([]);
  });

  it('runs no rules when no preset and no rules are given (no implicit base)', () => {
    expect(lint(SOURCE, {})).toEqual([]);
  });
});
