import { describe, expect, it } from 'vitest';
import { lintRule } from '../support.js';
import { variableCharset } from '../../src/rules/index.js';
import { lintFixture } from './helpers.js';

describe('variable-charset', () => {
  it('flags identifiers that fall outside the allowed charset', () => {
    const diagnostics = lintFixture('violation', variableCharset);

    expect(diagnostics).toHaveLength(4);
    const flagged = diagnostics.map((d) => d.message);
    expect(flagged.some((m) => m.includes("'vFoo.'"))).toBe(true);
    expect(flagged.some((m) => m.includes("'vL..Bar'"))).toBe(true);
    expect(flagged.some((m) => m.includes("'v$Path'"))).toBe(true);
    expect(flagged.some((m) => m.includes("'vOEGD_Modül'"))).toBe(true);

    for (const d of diagnostics) {
      expect(d.ruleId).toBe('variable-charset');
      expect(d.severity).toBe('warning');
    }
  });

  it('does not offer an autofix', () => {
    const diagnostics = lintFixture('violation', variableCharset);

    for (const diagnostic of diagnostics) {
      expect(diagnostic.fix).toBeUndefined();
    }
  });

  it('does not flag identifiers built from ASCII letters, digits and underscores', () => {
    const diagnostics = lintFixture('clean', variableCharset);

    expect(diagnostics).toEqual([]);
  });

  it('accepts a leading underscore', () => {
    const diagnostics = lintRule('SET _privateVar = 1;', variableCharset);

    expect(diagnostics).toEqual([]);
  });

  it('accepts dot-separated segments', () => {
    const diagnostics = lintRule('SET vL.MyVar = 1;\nLET vG.Sys.Path = 2;', variableCharset);

    expect(diagnostics).toEqual([]);
  });

  it('flags a trailing dot', () => {
    const diagnostics = lintRule('SET vFoo. = 1;', variableCharset);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toContain("'vFoo.'");
  });

  it('flags consecutive dots', () => {
    const diagnostics = lintRule('SET vL..Bar = 1;', variableCharset);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toContain("'vL..Bar'");
  });

  it('flags a segment that starts with a digit', () => {
    const diagnostics = lintRule('SET vFoo.1Bar = 1;', variableCharset);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toContain("'vFoo.1Bar'");
  });

  it('flags non-ASCII letters', () => {
    const diagnostics = lintRule("SET v_öäü = 'x';", variableCharset);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toContain("'v_öäü'");
  });

  it('does not flag system variables assigned via SET / LET', () => {
    const diagnostics = lintRule("SET DateFormat = 'YYYY-MM-DD';", variableCharset);

    expect(diagnostics).toEqual([]);
  });
});
