import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { format, lint } from '../../src/index.js';
import { loadClauseNewline, loadFieldPerLine, loadIndent } from '../../src/rules/index.js';
import { lintFixture } from './helpers.js';

const FIXTURES = join(import.meta.dirname, 'fixtures');

function readFixture(kind: 'violation' | 'clean'): string {
  return readFileSync(join(FIXTURES, 'load-indent', `${kind}.qvs`), 'utf8');
}

describe('load-indent', () => {
  it('does not flag any clean LOAD shape', () => {
    const diagnostics = lintFixture('load-indent', 'clean', loadIndent);

    expect(diagnostics).toEqual([]);
  });

  it('flags every misindented field-start and clause-start line', () => {
    const diagnostics = lintFixture('load-indent', 'violation', loadIndent);

    expect(diagnostics.map((d) => d.range.start.line)).toEqual([4, 10, 17, 23, 25, 32, 33, 39]);
    for (const d of diagnostics) {
      expect(d.ruleId).toBe('load-indent');
      expect(d.severity).toBe('warning');
      expect(d.fix).toBeDefined();
      expect(d.message).toMatch(/Expected \d+ (tab|space)s? of indentation/);
    }
  });

  it('autofix rewrites leading whitespace to the expected width', () => {
    const source = ['[A]:', 'Load', 'Id,', '\t\tName', 'From X;'].join('\n');

    const result = format(source, [loadIndent]);

    expect(result.output).toBe(['[A]:', 'Load', '\tId,', '\tName', 'From X;'].join('\n'));
    expect(result.diagnostics).toEqual([]);
    expect(result.fixed).toBe(2);
  });

  it('skips field tokens that share a line with the previous token', () => {
    const source = '[A]: Load Id, Name From X;';

    const diagnostics = lint(source, [loadIndent]);

    expect(diagnostics).toEqual([]);
  });

  it('does not touch continuation lines inside a multi-line field expression', () => {
    const source = ['[A]:', 'Load', '\tSum(', 'x', '\t) as Total', 'From X;'].join('\n');

    const diagnostics = lint(source, [loadIndent]);

    expect(diagnostics).toEqual([]);
  });

  it('leaves a lone wildcard on its own line untouched', () => {
    const source = ['[A]:', 'Load', '*', 'From X;'].join('\n');

    const diagnostics = lint(source, [loadIndent]);

    expect(diagnostics).toEqual([]);
  });

  it('inherits the enclosing indent when the LOAD sits inside a Sub', () => {
    const source = ['Sub foo', '\t[A]:', '\tLoad', '\t\tId', '\tFrom X;', 'End Sub'].join('\n');

    const diagnostics = lint(source, [loadIndent]);

    expect(diagnostics).toEqual([]);
  });

  it('does not flag statements that contain no LOAD keyword', () => {
    const source = 'SQL Select Id, Name From dbo.X;';

    const diagnostics = lint(source, [loadIndent]);

    expect(diagnostics).toEqual([]);
  });

  it('honors a custom space-based style', () => {
    const source = ['[A]:', 'Load', '    Id', 'From X;'].join('\n');

    const diagnostics = lint(source, [loadIndent], {
      rules: {
        'load-indent': ['warning', { style: 'space', size: 4 }],
      },
    });

    expect(diagnostics).toEqual([]);
  });

  it('autofixes tab indentation to spaces under a custom space-based style', () => {
    const source = ['[A]:', 'Load', '\tId', 'From X;'].join('\n');

    const result = format(source, [loadIndent], {
      rules: {
        'load-indent': ['warning', { style: 'space', size: 2 }],
      },
    });

    expect(result.output).toBe(['[A]:', 'Load', '  Id', 'From X;'].join('\n'));
  });

  it('autofix on the full violation fixture converges with no remaining findings', () => {
    const result = format(readFixture('violation'), [loadIndent]);

    expect(result.diagnostics).toEqual([]);
    expect(result.fixed).toBe(8);
  });

  it('emits a non-empty range even when the misindented line has no leading whitespace', () => {
    const source = ['[A]:', 'Load', 'X,', 'Y', 'Resident B;'].join('\n');

    const diagnostics = lint(source, [loadIndent]);

    expect(diagnostics).toHaveLength(2);
    for (const d of diagnostics) {
      expect(d.range.end.column).toBeGreaterThan(d.range.start.column);
    }
  });

  it('composes with load-field-per-line and load-clause-newline to break down a fully jammed LOAD', () => {
    const source = '[A]: Load Id, Name From X Where Active = 1 Order By Id;';

    const result = format(source, [loadFieldPerLine, loadClauseNewline, loadIndent]);

    expect(result.output).toBe(
      ['[A]: Load', '\tId,', '\tName', 'From X', 'Where Active = 1', 'Order By Id;'].join('\n'),
    );
    expect(result.diagnostics).toEqual([]);
  });
});
