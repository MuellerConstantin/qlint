import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatRule, lintRule } from '../support.js';
import { blockIndent } from '../../src/rules/index.js';
import { lintFixture } from './helpers.js';

const FIXTURES = join(import.meta.dirname, 'fixtures');

function readFixture(kind: 'violation' | 'clean'): string {
  return readFileSync(join(FIXTURES, 'block-indent', `${kind}.qvs`), 'utf8');
}

describe('block-indent', () => {
  it('does not flag a properly indented script', () => {
    const diagnostics = lintFixture('clean', blockIndent);

    expect(diagnostics).toEqual([]);
  });

  it('flags misindented Sub, If/ElseIf/Else, and Switch/Case bodies', () => {
    const diagnostics = lintFixture('violation', blockIndent);
    const lines = diagnostics.map((d) => d.range.start.line);

    expect(lines).toEqual([2, 3, 6, 7, 8, 9, 10, 14, 15, 16, 17]);
    for (const d of diagnostics) {
      expect(d.ruleId).toBe('block-indent');
      expect(d.severity).toBe('warning');
    }
  });

  it('autofixes the violation fixture to match the clean fixture shape', () => {
    const violation = readFixture('violation');

    const result = formatRule(violation, blockIndent);

    expect(result.diagnostics).toEqual([]);
    expect(result.output).toBe(
      [
        'Sub greet',
        '\tTrace hello;',
        'End Sub',
        '',
        'If vYear = 2026 Then',
        "\tLET vMsg = 'this year';",
        'ElseIf vYear < 2026 Then',
        "\tLET vMsg = 'past';",
        'Else',
        "\tLET vMsg = 'other';",
        'End If',
        '',
        'Switch vMode',
        "\tCase 'A'",
        '\t\tTrace mode A;',
        '\tDefault',
        '\t\tTrace unknown;',
        'End Switch',
        '',
      ].join('\n'),
    );
  });

  it('handles nested blocks', () => {
    const source = [
      'Sub outer',
      '\tIf x = 1 Then',
      '\t\tFor j = 1 to 2',
      '\t\t\tTrace nested;',
      '\t\tNext',
      '\tEnd If',
      'End Sub',
    ].join('\n');

    const diagnostics = lintRule(source, blockIndent);

    expect(diagnostics).toEqual([]);
  });

  it('ignores continuation lines inside multi-line If conditions', () => {
    const source = ['If x = 1', '   and y = 2 Then', '\tbody;', 'End If'].join('\n');

    const diagnostics = lintRule(source, blockIndent);

    expect(diagnostics).toEqual([]);
  });

  it('keeps Case/Default one level inside Switch and bodies two levels in', () => {
    const source = ['Switch vMode', '\tCase 1', '\t\tTrace one;', '\tDefault', '\t\tTrace other;', 'End Switch'].join(
      '\n',
    );

    const diagnostics = lintRule(source, blockIndent);

    expect(diagnostics).toEqual([]);
  });

  it('honors a custom indent size with the space style', () => {
    const source = ['Sub greet', '  Trace hello;', 'End Sub'].join('\n');

    const diagnostics = lintRule(source, blockIndent, { size: 2, style: 'space' });

    expect(diagnostics).toEqual([]);
  });

  it('accepts the default tab/size-1 indent', () => {
    const source = ['Sub greet', '\tTrace hello;', 'End Sub'].join('\n');

    const diagnostics = lintRule(source, blockIndent);

    expect(diagnostics).toEqual([]);
  });

  it('honors the space indent style override', () => {
    const source = ['Sub greet', '    Trace hello;', 'End Sub'].join('\n');

    const diagnostics = lintRule(source, blockIndent, { style: 'space', size: 4 });

    expect(diagnostics).toEqual([]);
  });

  it('does not flag a function call named If(...)', () => {
    const source = "LET vResult = If(x = 1, 'yes', 'no');";

    const diagnostics = lintRule(source, blockIndent);

    expect(diagnostics).toEqual([]);
  });

  it('treats a table label colon as a statement terminator', () => {
    const source = ['[x]:', 'LOAD * INLINE [a,b];'].join('\n');

    const diagnostics = lintRule(source, blockIndent);

    expect(diagnostics).toEqual([]);
  });

  it('flags a Load that is indented under a table label', () => {
    const source = ['[x]:', '    LOAD * INLINE [a,b];'].join('\n');

    const diagnostics = lintRule(source, blockIndent);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].range.start.line).toBe(2);
  });

  it('still skips continuation lines inside a multi-line labeled Load', () => {
    const source = ['[x]:', 'LOAD', '    field1,', '    field2', 'FROM source.qvd;'].join('\n');

    const diagnostics = lintRule(source, blockIndent);

    expect(diagnostics).toEqual([]);
  });

  it('produces a fix that replaces the entire leading whitespace prefix', () => {
    const diagnostics = lintRule('Sub greet\n\t  Trace hello;\nEnd Sub', blockIndent);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].fix).toBeDefined();
    expect(diagnostics[0].fix?.range).toEqual({ start: 10, end: 13 });
    expect(diagnostics[0].fix?.replacement).toBe('\t');
  });

  it('emits a non-empty range even when the misindented line has no leading whitespace', () => {
    const diagnostics = lintRule('Sub greet\nTrace hello;\nEnd Sub', blockIndent);

    expect(diagnostics).toHaveLength(1);
    const d = diagnostics[0];
    expect(d.range.start.line).toBe(d.range.end.line);
    expect(d.range.end.column).toBeGreaterThan(d.range.start.column);
  });
});
