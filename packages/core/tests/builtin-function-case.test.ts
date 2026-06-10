import { describe, expect, it } from 'vitest';
import { configure } from '../src/index.js';
import { builtinFunctionCase } from '../src/rules/index.js';
import { lintFixture } from './helpers.js';

describe('builtin-function-case', () => {
  it('flags a built-in function in non-canonical case', () => {
    const diagnostics = lintFixture('builtin-function-case', 'violation', builtinFunctionCase);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      ruleId: 'builtin-function-case',
      severity: 'warning',
      range: { start: { line: 3, column: 3 } },
    });
    expect(diagnostics[0].message).toContain("'sum'");
    expect(diagnostics[0].message).toContain("'Sum'");
  });

  it('does not flag a built-in function in canonical case', () => {
    const diagnostics = lintFixture('builtin-function-case', 'clean', builtinFunctionCase);

    expect(diagnostics).toEqual([]);
  });

  describe('style option', () => {
    it('with style "lower" flags PascalCase and expects lowercase', () => {
      const diagnostics = lintFixture(
        'builtin-function-case',
        'clean',
        configure(builtinFunctionCase, { style: 'lower' }),
      );

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].message).toContain("'Sum'");
      expect(diagnostics[0].message).toContain("'sum'");
    });

    it('with style "upper" flags PascalCase and expects UPPERCASE', () => {
      const diagnostics = lintFixture(
        'builtin-function-case',
        'clean',
        configure(builtinFunctionCase, { style: 'upper' }),
      );

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].message).toContain("'Sum'");
      expect(diagnostics[0].message).toContain("'SUM'");
    });

    it('with style "lower" does not flag lowercase fixture', () => {
      const diagnostics = lintFixture(
        'builtin-function-case',
        'violation',
        configure(builtinFunctionCase, { style: 'lower' }),
      );

      expect(diagnostics).toEqual([]);
    });

    it('LintConfig.rules overrides defaultOptions and configure()', () => {
      const diagnostics = lintFixture(
        'builtin-function-case',
        'clean',
        configure(builtinFunctionCase, { style: 'lower' }),
        { rules: { 'builtin-function-case': ['warning', { style: 'upper' }] } },
      );

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].message).toContain("'SUM'");
    });
  });
});
