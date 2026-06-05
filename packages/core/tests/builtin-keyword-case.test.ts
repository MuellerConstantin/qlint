import { describe, expect, it } from 'vitest';
import { builtinKeywordCase } from '../src/rules.js';
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
});
