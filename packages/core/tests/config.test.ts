import { describe, expect, it } from 'vitest';
import { validateConfig } from '../src/config.js';

describe('validateConfig', () => {
  it('returns empty config when "rules" is missing', () => {
    expect(validateConfig({})).toEqual({});
  });

  it('parses a severity-only rule entry', () => {
    expect(validateConfig({ rules: { 'trailing-whitespace': 'off' } })).toEqual({
      rules: { 'trailing-whitespace': 'off' },
    });
  });

  it('parses a [severity, options] rule entry', () => {
    expect(validateConfig({ rules: { 'max-line-length': ['warning', { limit: 120 }] } })).toEqual({
      rules: { 'max-line-length': ['warning', { limit: 120 }] },
    });
  });

  it('throws when the top level is not an object', () => {
    expect(() => validateConfig([])).toThrow(/must be a JSON object/);
  });

  it('throws when "rules" is not an object', () => {
    expect(() => validateConfig({ rules: [] })).toThrow(/"rules".*must be an object/);
  });

  it('throws on an unknown severity string', () => {
    expect(() => validateConfig({ rules: { foo: 'fatal' } })).toThrow(/invalid severity "fatal"/);
  });

  it('throws when a rule entry has the wrong shape', () => {
    expect(() => validateConfig({ rules: { foo: 42 } })).toThrow(/must be a severity string or an array/);
  });

  it('throws when a [severity, options] array has too many elements', () => {
    expect(() => validateConfig({ rules: { foo: ['warning', {}, 'extra'] } })).toThrow(
      /\[severity\] or \[severity, options\]/,
    );
  });

  it('embeds the source label in error messages when provided', () => {
    expect(() => validateConfig([], 'qlint.json')).toThrow(/Config in qlint\.json must be a JSON object/);
  });

  it('omits the "in <label>" fragment when no source label is provided', () => {
    expect(() => validateConfig([])).toThrow(/^Config must be a JSON object\.$/);
  });
});
