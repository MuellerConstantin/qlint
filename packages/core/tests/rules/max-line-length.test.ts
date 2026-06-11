import { describe, expect, it } from 'vitest';
import { lint } from '../../src/index.js';
import { maxLineLength } from '../../src/rules/index.js';
import { lintFixture } from './helpers.js';

describe('max-line-length', () => {
  it('flags a line that exceeds the default limit of 120 characters', () => {
    const diagnostics = lintFixture('max-line-length', 'violation', maxLineLength);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      ruleId: 'max-line-length',
      severity: 'warning',
      range: { start: { line: 3, column: 121 }, end: { line: 3, column: 144 } },
    });
    expect(diagnostics[0].message).toContain('120');
    expect(diagnostics[0].message).toContain('143');
  });

  it('does not offer an autofix', () => {
    const diagnostics = lintFixture('max-line-length', 'violation', maxLineLength);

    for (const diagnostic of diagnostics) {
      expect(diagnostic.fix).toBeUndefined();
    }
  });

  it('does not flag a script that stays under the limit', () => {
    const diagnostics = lintFixture('max-line-length', 'clean', maxLineLength);

    expect(diagnostics).toEqual([]);
  });

  it('flags each overlong line independently', () => {
    const source = `${'a'.repeat(130)}\n${'b'.repeat(125)}\nshort\n`;

    const diagnostics = lint(source, [maxLineLength]);

    expect(diagnostics).toHaveLength(2);
    expect(diagnostics[0].range.start.line).toBe(1);
    expect(diagnostics[1].range.start.line).toBe(2);
  });

  it('treats lines at exactly the limit as valid', () => {
    const source = `${'a'.repeat(120)}\n${'b'.repeat(121)}\n`;

    const diagnostics = lint(source, [maxLineLength]);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].range.start.line).toBe(2);
  });

  it('honors a custom max option', () => {
    const source = `${'a'.repeat(85)}\n${'b'.repeat(70)}\n`;

    const diagnostics = lint(source, [maxLineLength], {
      rules: {
        'max-line-length': ['warning', { max: 80 }],
      },
    });

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].range.start.line).toBe(1);
    expect(diagnostics[0].message).toContain('80');
  });

  it('counts characters identically whether the line ends in LF or CRLF', () => {
    const lf = `${'a'.repeat(125)}\n`;
    const crlf = `${'a'.repeat(125)}\r\n`;

    const lfDiagnostics = lint(lf, [maxLineLength]);
    const crlfDiagnostics = lint(crlf, [maxLineLength]);

    expect(lfDiagnostics).toHaveLength(1);
    expect(crlfDiagnostics).toHaveLength(1);
    expect(lfDiagnostics[0].range.end.column).toBe(crlfDiagnostics[0].range.end.column);
  });
});
