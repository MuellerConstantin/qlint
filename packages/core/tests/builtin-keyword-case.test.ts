import { describe, expect, it } from 'vitest';
import { configure } from '../src/index.js';
import { builtinKeywordCase } from '../src/rules/index.js';
import { lintFixture } from './helpers.js';

describe('builtin-keyword-case', () => {
  it('flags a keyword in non-canonical case', () => {
    const diagnostics = lintFixture('builtin-keyword-case', 'violation', builtinKeywordCase);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      ruleId: 'builtin-keyword-case',
      severity: 'warning',
      range: { start: { line: 2, column: 1 } },
    });
    expect(diagnostics[0].message).toContain("'LOAD'");
    expect(diagnostics[0].message).toContain("'Load'");
  });

  it('does not flag a keyword in canonical case', () => {
    const diagnostics = lintFixture('builtin-keyword-case', 'clean', builtinKeywordCase);

    expect(diagnostics).toEqual([]);
  });

  describe('style option', () => {
    it('with style "upper" does not flag SQL-style LOAD', () => {
      const diagnostics = lintFixture(
        'builtin-keyword-case',
        'violation',
        configure(builtinKeywordCase, { style: 'upper' }),
      );

      const flaggedImages = diagnostics.map((diagnostic) => diagnostic.fix?.replacement);
      expect(flaggedImages).not.toContain('LOAD');
    });

    it('with style "upper" flags PascalCase keyword', () => {
      const diagnostics = lintFixture(
        'builtin-keyword-case',
        'clean',
        configure(builtinKeywordCase, { style: 'upper' }),
      );

      const loadDiagnostic = diagnostics.find((diagnostic) => diagnostic.message.includes("'Load'"));
      expect(loadDiagnostic).toBeDefined();
      expect(loadDiagnostic?.message).toContain("'LOAD'");
    });

    it('with style "lower" flags PascalCase keyword', () => {
      const diagnostics = lintFixture(
        'builtin-keyword-case',
        'clean',
        configure(builtinKeywordCase, { style: 'lower' }),
      );

      const loadDiagnostic = diagnostics.find((diagnostic) => diagnostic.message.includes("'Load'"));
      expect(loadDiagnostic).toBeDefined();
      expect(loadDiagnostic?.message).toContain("'load'");
    });
  });
});
