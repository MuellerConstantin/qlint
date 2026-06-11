import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { format, lint } from '../src/index.js';
import { oneStatementPerLine } from '../src/rules/index.js';
import { lintFixture } from './helpers.js';

const FIXTURES = join(import.meta.dirname, 'fixtures');

function readFixture(kind: 'violation' | 'clean'): string {
  return readFileSync(join(FIXTURES, 'one-statement-per-line', `${kind}.qvs`), 'utf8');
}

describe('one-statement-per-line', () => {
  it('flags two statements separated by a semicolon on the same line', () => {
    const diagnostics = lintFixture('one-statement-per-line', 'violation', oneStatementPerLine);

    expect(diagnostics).toHaveLength(2);
    expect(diagnostics[0]).toMatchObject({
      ruleId: 'one-statement-per-line',
      severity: 'warning',
      range: { start: { line: 1, column: 19 } },
    });
    expect(diagnostics[1]).toMatchObject({
      ruleId: 'one-statement-per-line',
      severity: 'warning',
      range: { start: { line: 7, column: 20 } },
    });
    expect(diagnostics[1].message).toContain('own line');
  });

  it('does not flag multi-line LOAD bodies, trailing comments, or implicitly terminated blocks', () => {
    const diagnostics = lintFixture('one-statement-per-line', 'clean', oneStatementPerLine);

    expect(diagnostics).toEqual([]);
  });

  it('rewrites a violation by splitting the second statement onto a new line', () => {
    const violation = readFixture('violation');

    const result = format(violation, [oneStatementPerLine]);

    expect(result.output).toContain('SET vYear = 2026;\nLET vMonth = 6;');
    expect(result.output).toContain('Resident [Source];\nSET vDone = 1;');
    expect(result.diagnostics).toEqual([]);
    expect(result.fixed).toBe(2);
  });

  it('uses LF newlines by default when the source has no CRLF', () => {
    const result = format('SET x = 1; SET y = 2;\n', [oneStatementPerLine]);

    expect(result.output).toBe('SET x = 1;\nSET y = 2;\n');
  });

  it('auto-detects CRLF when the source uses CRLF line endings', () => {
    const result = format('SET x = 1; SET y = 2;\r\n', [oneStatementPerLine]);

    expect(result.output).toBe('SET x = 1;\r\nSET y = 2;\r\n');
  });

  it('honors an explicit lineEnding override', () => {
    const result = format('SET x = 1; SET y = 2;\n', [oneStatementPerLine], {
      rules: {
        'one-statement-per-line': ['warning', { lineEnding: 'crlf' }],
      },
    });

    expect(result.output).toBe('SET x = 1;\r\nSET y = 2;\n');
  });

  it('produces a single fix range covering the gap between semicolon and next token', () => {
    const diagnostics = lint('SET x = 1;   SET y = 2;', [oneStatementPerLine]);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].fix).toEqual({
      range: { start: 10, end: 13 },
      replacement: '\n',
    });
  });
});
