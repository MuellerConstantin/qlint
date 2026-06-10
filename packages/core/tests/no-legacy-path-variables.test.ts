import { describe, expect, it } from 'vitest';
import { noLegacyPathVariables } from '../src/rules/index.js';
import { lintFixture } from './helpers.js';

describe('no-legacy-path-variables', () => {
  it('flags legacy path variables', () => {
    const diagnostics = lintFixture('no-legacy-path-variables', 'violation', noLegacyPathVariables);

    expect(diagnostics).toHaveLength(2);
    expect(diagnostics[0]).toMatchObject({
      ruleId: 'no-legacy-path-variables',
      severity: 'error',
      range: { start: { line: 3, column: 3 } },
    });
    expect(diagnostics[0].message).toContain("'QvPath'");
    expect(diagnostics[1].message).toContain("'WinRoot'");
  });

  it('does not offer an autofix', () => {
    const diagnostics = lintFixture('no-legacy-path-variables', 'violation', noLegacyPathVariables);

    for (const diagnostic of diagnostics) {
      expect(diagnostic.fix).toBeUndefined();
    }
  });

  it('does not flag a script without legacy path variables', () => {
    const diagnostics = lintFixture('no-legacy-path-variables', 'clean', noLegacyPathVariables);

    expect(diagnostics).toEqual([]);
  });
});
