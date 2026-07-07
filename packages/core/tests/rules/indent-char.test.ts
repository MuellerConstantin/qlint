import { describe, expect, it } from 'vitest';
import { indentChar } from '../../src/rules/index.js';
import { lintFixture } from './helpers.js';
import { lintRule } from '../support.js';

describe('indent-char', () => {
  it('flags tab-indented lines in the violation fixture', () => {
    const diagnostics = lintFixture('violation', indentChar);

    expect(diagnostics.map((d) => d.range.start.line)).toEqual([7, 12]);
    for (const d of diagnostics) {
      expect(d.ruleId).toBe('indent-char');
      expect(d.severity).toBe('warning');
    }
  });

  it('does not flag the clean fixture', () => {
    const diagnostics = lintFixture('clean', indentChar);

    expect(diagnostics).toEqual([]);
  });

  it('does not offer an autofix (the indent width is out of scope)', () => {
    const diagnostics = lintFixture('violation', indentChar);

    for (const d of diagnostics) {
      expect(d.fix).toBeUndefined();
    }
  });

  it('flags a continuation line that block-indent and load-indent leave alone', () => {
    const source = ['[A]:', 'Load', '    Total', "        & ' end'", '\t\t& Region', 'From X;'].join('\n');

    const diagnostics = lintRule(source, indentChar);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].range.start.line).toBe(5);
    expect(diagnostics[0].message).toMatch(/use only spaces/);
  });

  it('flags a tab/space mix even when it is otherwise mostly spaces', () => {
    const source = ['Sub greet', '    \tTrace hello;', 'End Sub'].join('\n');

    const diagnostics = lintRule(source, indentChar);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].range.start.line).toBe(2);
    expect(diagnostics[0].range.end.column).toBe(6);
  });

  it('does not reach inside a multi-line Inline data block', () => {
    const source = ['[A]:', 'Load * Inline [', '\ta, b', '\t1, 2', '];'].join('\n');

    const diagnostics = lintRule(source, indentChar);

    expect(diagnostics).toEqual([]);
  });

  it('does not check the indentation of comment-only lines', () => {
    const source = ['Sub greet', '\t// a tab-indented standalone comment', '    Trace hello;', 'End Sub'].join('\n');

    const diagnostics = lintRule(source, indentChar);

    expect(diagnostics).toEqual([]);
  });

  describe('style option', () => {
    it('flags space-indented lines under the tab style', () => {
      const source = ['Sub greet', '    Trace hello;', 'End Sub'].join('\n');

      const diagnostics = lintRule(source, indentChar, { style: 'tab' });

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].range.start.line).toBe(2);
      expect(diagnostics[0].message).toMatch(/use only tabs/);
    });

    it('accepts tab-indented lines under the tab style', () => {
      const source = ['Sub greet', '\tTrace hello;', 'End Sub'].join('\n');

      const diagnostics = lintRule(source, indentChar, { style: 'tab' });

      expect(diagnostics).toEqual([]);
    });
  });
});
