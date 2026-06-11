import { describe, expect, it } from 'vitest';
import { tableLabelBrackets } from '../../src/rules/index.js';
import { lintFixture } from './helpers.js';

describe('table-label-brackets', () => {
  it('flags an unbracketed table label', () => {
    const diagnostics = lintFixture('table-label-brackets', 'violation', tableLabelBrackets);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      ruleId: 'table-label-brackets',
      severity: 'warning',
      range: { start: { line: 1, column: 1 } },
    });
    expect(diagnostics[0].message).toContain("'TableA'");
  });

  it('does not flag a bracketed table label', () => {
    const diagnostics = lintFixture('table-label-brackets', 'clean', tableLabelBrackets);

    expect(diagnostics).toEqual([]);
  });
});
