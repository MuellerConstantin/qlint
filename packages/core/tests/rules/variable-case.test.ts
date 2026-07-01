import { describe, expect, it } from 'vitest';
import { variableCase } from '../../src/rules/index.js';
import { lintFixture } from './helpers.js';
import { lintRule } from '../support.js';

describe('variable-case', () => {
  it('flags variables that are not camelCase by default', () => {
    const diagnostics = lintFixture('violation', variableCase);

    expect(diagnostics).toHaveLength(2);
    expect(diagnostics[0]).toMatchObject({
      ruleId: 'variable-case',
      severity: 'warning',
      range: { start: { line: 1, column: 5 } },
    });
    expect(diagnostics[0].message).toContain("'BadName'");
    expect(diagnostics[0].message).toContain('camelCase');
    expect(diagnostics[1].message).toContain("'other_var'");
  });

  it('does not offer an autofix', () => {
    const diagnostics = lintFixture('violation', variableCase);

    for (const diagnostic of diagnostics) {
      expect(diagnostic.fix).toBeUndefined();
    }
  });

  it('does not flag a script where all variables are camelCase', () => {
    const diagnostics = lintFixture('clean', variableCase);

    expect(diagnostics).toEqual([]);
  });

  it('does not flag system variables assigned via SET / LET', () => {
    const diagnostics = lintFixture('violation', variableCase);

    const flagged = diagnostics.map((diagnostic) => diagnostic.message);
    expect(flagged.some((message) => message.includes("'DateFormat'"))).toBe(false);
  });

  describe('unicode identifiers', () => {
    it('reports the full variable name when it contains non-ASCII letters', () => {
      const diagnostics = lintRule("SET v_öäü = 'x';", variableCase);

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].message).toContain("'v_öäü'");
      expect(diagnostics[0].range).toMatchObject({
        start: { line: 1, column: 5 },
        end: { line: 1, column: 10 },
      });
    });

    it('accepts umlauts and accents in camelCase identifiers', () => {
      const diagnostics = lintRule('SET änderungsLog = 1;\nLET fürPaul = 2;', variableCase);

      expect(diagnostics).toEqual([]);
    });

    it('accepts non-ASCII letters in PascalCase identifiers', () => {
      const diagnostics = lintRule('SET ÄnderungsLog = 1;', variableCase, { style: 'pascal' });

      expect(diagnostics).toEqual([]);
    });
  });

  describe('style option', () => {
    it('with style "pascal" flags camelCase variables', () => {
      const diagnostics = lintFixture('clean', variableCase, { style: 'pascal' });

      const flagged = diagnostics.map((diagnostic) => diagnostic.message);
      expect(flagged.some((message) => message.includes("'vYear'"))).toBe(true);
      expect(flagged.some((message) => message.includes('PascalCase'))).toBe(true);
    });

    it('with style "snake" accepts snake_case and flags camelCase', () => {
      const diagnostics = lintFixture('violation', variableCase, { style: 'snake' });

      const flagged = diagnostics.map((diagnostic) => diagnostic.message);
      expect(flagged.some((message) => message.includes("'other_var'"))).toBe(false);
      expect(flagged.some((message) => message.includes("'vGood'"))).toBe(true);
      expect(flagged.some((message) => message.includes('snake_case'))).toBe(true);
    });

    it('with style "upperSnake" accepts UPPER_SNAKE_CASE and flags camelCase', () => {
      const diagnostics = lintFixture('clean', variableCase, { style: 'upperSnake' });

      const flagged = diagnostics.map((diagnostic) => diagnostic.message);
      expect(flagged.some((message) => message.includes("'vYear'"))).toBe(true);
      expect(flagged.some((message) => message.includes('UPPER_SNAKE_CASE'))).toBe(true);
    });
  });
});
