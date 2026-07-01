import { describe, expect, it } from 'vitest';
import { builtinFunctionCase, builtinKeywordCase } from '../src/rules/index.js';
import { formatRule, lintRule, lintRules } from './support.js';

describe('qlint-disable-next-line', () => {
  it('without rule ids suppresses every diagnostic on the next line', () => {
    const source = ['// qlint-disable-next-line', 'load now() as ts;'].join('\n');

    const diagnostics = lintRules(source, [builtinFunctionCase, builtinKeywordCase]);

    expect(diagnostics).toEqual([]);
  });

  it('with a rule id suppresses only that rule on the next line', () => {
    const source = ['// qlint-disable-next-line builtin-function-case', 'load now() as ts;'].join('\n');

    const diagnostics = lintRules(source, [builtinFunctionCase, builtinKeywordCase]);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].ruleId).toBe('builtin-keyword-case');
  });

  it('accepts multiple comma-separated rule ids', () => {
    const source = ['// qlint-disable-next-line builtin-function-case, builtin-keyword-case', 'load now() as ts;'].join(
      '\n',
    );

    const diagnostics = lintRules(source, [builtinFunctionCase, builtinKeywordCase]);

    expect(diagnostics).toEqual([]);
  });

  it('does not suppress diagnostics on the same line as the directive', () => {
    const source = ['load now() as ts; // qlint-disable-next-line'].join('\n');

    const diagnostics = lintRule(source, builtinFunctionCase);

    expect(diagnostics).toHaveLength(1);
  });

  it('does not suppress diagnostics two lines after the directive', () => {
    const source = ['// qlint-disable-next-line', '', 'load now() as ts;'].join('\n');

    const diagnostics = lintRule(source, builtinFunctionCase);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].range.start.line).toBe(3);
  });

  it('does not require the directive to start at column 1', () => {
    const source = ['    // qlint-disable-next-line', '    load now() as ts;'].join('\n');

    const diagnostics = lintRule(source, builtinFunctionCase);

    expect(diagnostics).toEqual([]);
  });

  it('ignores unknown rule ids without affecting others', () => {
    const source = ['// qlint-disable-next-line not-a-real-rule', 'load now() as ts;'].join('\n');

    const diagnostics = lintRule(source, builtinFunctionCase);

    expect(diagnostics).toHaveLength(1);
  });

  it('skips the autofix when the diagnostic is suppressed', () => {
    const source = ['// qlint-disable-next-line', 'load now() as ts;'].join('\n');

    const result = formatRule(source, builtinFunctionCase);

    expect(result.output).toBe(source);
    expect(result.fixed).toBe(0);
    expect(result.diagnostics).toEqual([]);
  });

  it('does not treat an unrelated comment as a disable directive', () => {
    const source = ['// this is just a comment', 'load now() as ts;'].join('\n');

    const diagnostics = lintRule(source, builtinFunctionCase);

    expect(diagnostics.length).toBeGreaterThan(0);
  });
});
