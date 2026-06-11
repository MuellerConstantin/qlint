import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { format, lint } from '../../src/index.js';
import { blockIndent } from '../../src/rules/index.js';
import { lintFixture } from './helpers.js';

const FIXTURES = join(import.meta.dirname, 'fixtures');

function readFixture(kind: 'violation' | 'clean'): string {
  return readFileSync(join(FIXTURES, 'block-indent', `${kind}.qvs`), 'utf8');
}

describe('block-indent', () => {
  it('does not flag a properly indented script', () => {
    const diagnostics = lintFixture('block-indent', 'clean', blockIndent);

    expect(diagnostics).toEqual([]);
  });

  it('flags misindented Sub, If/ElseIf/Else, and Switch/Case bodies', () => {
    const diagnostics = lintFixture('block-indent', 'violation', blockIndent);
    const lines = diagnostics.map((d) => d.range.start.line);

    expect(lines).toEqual([2, 3, 6, 7, 8, 9, 10, 14, 15, 16, 17]);
    for (const d of diagnostics) {
      expect(d.ruleId).toBe('block-indent');
      expect(d.severity).toBe('warning');
    }
  });

  it('autofixes the violation fixture to match the clean fixture shape', () => {
    const violation = readFixture('violation');

    const result = format(violation, [blockIndent]);

    expect(result.diagnostics).toEqual([]);
    expect(result.output).toBe(
      [
        'Sub greet',
        '    Trace hello;',
        'End Sub',
        '',
        'If vYear = 2026 Then',
        '    LET vMsg = \'this year\';',
        'ElseIf vYear < 2026 Then',
        '    LET vMsg = \'past\';',
        'Else',
        '    LET vMsg = \'other\';',
        'End If',
        '',
        'Switch vMode',
        '    Case \'A\'',
        '        Trace mode A;',
        '    Default',
        '        Trace unknown;',
        'End Switch',
        '',
      ].join('\n'),
    );
  });

  it('handles nested blocks', () => {
    const source = [
      'Sub outer',
      '    If x = 1 Then',
      '        For j = 1 to 2',
      '            Trace nested;',
      '        Next',
      '    End If',
      'End Sub',
    ].join('\n');

    const diagnostics = lint(source, [blockIndent]);

    expect(diagnostics).toEqual([]);
  });

  it('ignores continuation lines inside multi-line If conditions', () => {
    const source = ['If x = 1', '   and y = 2 Then', '    body;', 'End If'].join('\n');

    const diagnostics = lint(source, [blockIndent]);

    expect(diagnostics).toEqual([]);
  });

  it('keeps Case/Default one level inside Switch and bodies two levels in', () => {
    const source = [
      'Switch vMode',
      '    Case 1',
      '        Trace one;',
      '    Default',
      '        Trace other;',
      'End Switch',
    ].join('\n');

    const diagnostics = lint(source, [blockIndent]);

    expect(diagnostics).toEqual([]);
  });

  it('honors a custom indent size', () => {
    const source = ['Sub greet', '  Trace hello;', 'End Sub'].join('\n');

    const diagnostics = lint(source, [blockIndent], {
      rules: { 'block-indent': ['warning', { size: 2 }] },
    });

    expect(diagnostics).toEqual([]);
  });

  it('honors the tab indent style', () => {
    const source = ['Sub greet', '\tTrace hello;', 'End Sub'].join('\n');

    const diagnostics = lint(source, [blockIndent], {
      rules: { 'block-indent': ['warning', { style: 'tab' }] },
    });

    expect(diagnostics).toEqual([]);
  });

  it('does not flag a function call named If(...)', () => {
    const source = "LET vResult = If(x = 1, 'yes', 'no');";

    const diagnostics = lint(source, [blockIndent]);

    expect(diagnostics).toEqual([]);
  });

  it('produces a fix that replaces the entire leading whitespace prefix', () => {
    const diagnostics = lint('Sub greet\n\t  Trace hello;\nEnd Sub', [blockIndent]);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].fix).toBeDefined();
    expect(diagnostics[0].fix?.range).toEqual({ start: 10, end: 13 });
    expect(diagnostics[0].fix?.replacement).toBe('    ');
  });
});
