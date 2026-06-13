import { describe, expect, it } from 'vitest';
import { format, lint } from '../../src/index.js';
import { noMultipleEmptyLines } from '../../src/rules/index.js';
import { lintFixture } from './helpers.js';

describe('no-multiple-empty-lines', () => {
  it('flags every run of consecutive blank lines that exceeds the default max', () => {
    const diagnostics = lintFixture('no-multiple-empty-lines', 'violation', noMultipleEmptyLines);

    expect(diagnostics).toHaveLength(2);
    for (const d of diagnostics) {
      expect(d.ruleId).toBe('no-multiple-empty-lines');
      expect(d.severity).toBe('warning');
    }
    expect(diagnostics[0].message).toContain('max 1');
    expect(diagnostics[0].message).toContain('got 3');
    expect(diagnostics[1].message).toContain('got 2');
  });

  it('does not flag single blank separators or comment-only lines between blanks', () => {
    const diagnostics = lintFixture('no-multiple-empty-lines', 'clean', noMultipleEmptyLines);

    expect(diagnostics).toEqual([]);
  });

  it('points the diagnostic at the first excess blank line', () => {
    const diagnostics = lint('SET a = 1;\n\n\n\nSET b = 2;\n', [noMultipleEmptyLines] as const);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].range.start).toEqual({ line: 3, column: 1 });
  });

  it('accepts a single blank line between statements', () => {
    const diagnostics = lint('SET a = 1;\n\nSET b = 2;\n', [noMultipleEmptyLines] as const);

    expect(diagnostics).toEqual([]);
  });

  it('accepts a single trailing newline at end of file', () => {
    const diagnostics = lint('SET a = 1;\n', [noMultipleEmptyLines] as const);

    expect(diagnostics).toEqual([]);
  });

  it('flags multiple trailing blank lines at end of file', () => {
    const diagnostics = lint('SET a = 1;\n\n\n', [noMultipleEmptyLines] as const);

    expect(diagnostics).toHaveLength(1);
  });

  it('flags multiple leading blank lines at beginning of file', () => {
    const diagnostics = lint('\n\n\nSET a = 1;\n', [noMultipleEmptyLines] as const);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].range.start.line).toBe(2);
  });

  it('treats whitespace-only lines as empty', () => {
    const diagnostics = lint('SET a = 1;\n   \n\t\nSET b = 2;\n', [noMultipleEmptyLines] as const);

    expect(diagnostics).toHaveLength(1);
  });

  it('does not treat comment-only lines as empty', () => {
    const diagnostics = lint('SET a = 1;\n\n// note\n\nSET b = 2;\n', [noMultipleEmptyLines] as const);

    expect(diagnostics).toEqual([]);
  });

  it('supports CRLF line endings', () => {
    const diagnostics = lint('SET a = 1;\r\n\r\n\r\n\r\nSET b = 2;\r\n', [noMultipleEmptyLines] as const);

    expect(diagnostics).toHaveLength(1);
  });

  it('reports multiple independent runs separately', () => {
    const source = 'SET a = 1;\n\n\nSET b = 2;\n\n\nSET c = 3;\n';

    const diagnostics = lint(source, [noMultipleEmptyLines] as const);

    expect(diagnostics).toHaveLength(2);
  });

  it('honors a custom max option', () => {
    const source = 'SET a = 1;\n\n\nSET b = 2;\n';

    const diagnostics = lint(source, [noMultipleEmptyLines] as const, {
      rules: { 'no-multiple-empty-lines': ['warning', { max: 2 }] },
    });

    expect(diagnostics).toEqual([]);
  });

  it('autofixes a run down to the configured max', () => {
    const result = format('SET a = 1;\n\n\n\nSET b = 2;\n', [noMultipleEmptyLines]);

    expect(result.output).toBe('SET a = 1;\n\nSET b = 2;\n');
    expect(result.fixed).toBe(1);
    expect(result.diagnostics).toEqual([]);
  });

  it('autofixes trailing blank lines', () => {
    const result = format('SET a = 1;\n\n\n', [noMultipleEmptyLines]);

    expect(result.output).toBe('SET a = 1;\n\n');
    expect(result.fixed).toBe(1);
  });

  it('autofixes leading blank lines', () => {
    const result = format('\n\n\nSET a = 1;\n', [noMultipleEmptyLines]);

    expect(result.output).toBe('\nSET a = 1;\n');
    expect(result.fixed).toBe(1);
  });

  it('autofixes multiple runs in a single format pass', () => {
    const source = 'SET a = 1;\n\n\nSET b = 2;\n\n\n\nSET c = 3;\n';

    const result = format(source, [noMultipleEmptyLines]);

    expect(result.output).toBe('SET a = 1;\n\nSET b = 2;\n\nSET c = 3;\n');
    expect(result.fixed).toBe(2);
  });

  it('autofixes a run down to a custom max', () => {
    const source = 'SET a = 1;\n\n\n\n\nSET b = 2;\n';

    const result = format(source, [noMultipleEmptyLines], {
      rules: { 'no-multiple-empty-lines': ['warning', { max: 2 }] },
    });

    expect(result.output).toBe('SET a = 1;\n\n\nSET b = 2;\n');
    expect(result.fixed).toBe(1);
  });

  it('preserves CRLF line endings when autofixing', () => {
    const result = format('SET a = 1;\r\n\r\n\r\n\r\nSET b = 2;\r\n', [noMultipleEmptyLines]);

    expect(result.output).toBe('SET a = 1;\r\n\r\nSET b = 2;\r\n');
    expect(result.fixed).toBe(1);
  });
});
