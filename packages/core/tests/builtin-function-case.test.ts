import { describe, expect, it } from 'vitest';
import { builtinFunctionCase } from '../src/rules.js';
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
});
