import { describe, expect, it } from 'vitest';
import { multilineCall } from '../../src/rules/index.js';
import { lintFixture } from './helpers.js';
import { formatRule, lintRule } from '../support.js';

describe('multiline-call', () => {
  it('flags every overlong single-line call in the violation fixture', () => {
    const diagnostics = lintFixture('violation', multilineCall);

    expect(diagnostics).toHaveLength(2);
    for (const d of diagnostics) {
      expect(d.ruleId).toBe('multiline-call');
      expect(d.severity).toBe('warning');
    }
  });

  it('does not flag the clean fixture', () => {
    const diagnostics = lintFixture('clean', multilineCall);

    expect(diagnostics).toEqual([]);
  });

  it('does not flag a call whose single line stays within the limit', () => {
    const diagnostics = lintRule('LET x = If(a, b, c);\n', multilineCall, { maxLineLength: 40 });

    expect(diagnostics).toEqual([]);
  });

  it('flags a call whose single line exceeds the limit', () => {
    const diagnostics = lintRule("LET x = If(a, 'b', 'c');\n", multilineCall, { maxLineLength: 20 });

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toContain("'If(...)'");
    expect(diagnostics[0].message).toContain('20');
  });

  it('does not flag a call that is already multi-line', () => {
    const diagnostics = lintRule("LET x = If(\n\ta,\n\t'b',\n\t'c'\n);\n", multilineCall, { maxLineLength: 20 });

    expect(diagnostics).toEqual([]);
  });

  it('does not flag a single-argument call even when its line is too long', () => {
    const diagnostics = lintRule('LET x = Sum(vSomeVeryLongFieldName);\n', multilineCall, { maxLineLength: 10 });

    expect(diagnostics).toEqual([]);
  });

  it('autofixes by breaking each top-level argument onto its own line', () => {
    const result = formatRule("LET x = If(a, 'b', 'c');\n", multilineCall, { maxLineLength: 20 });

    expect(result.output).toBe("LET x = If(\n\ta,\n\t'b',\n\t'c'\n);\n");
    expect(result.fixed).toBe(1);
    expect(result.diagnostics).toEqual([]);
  });

  it('preserves the leading indent when breaking a nested call', () => {
    const result = formatRule("Sub greet\n\tLET x = If(a, 'b', 'c');\nEnd Sub\n", multilineCall, { maxLineLength: 20 });

    expect(result.output).toBe("Sub greet\n\tLET x = If(\n\t\ta,\n\t\t'b',\n\t\t'c'\n\t);\nEnd Sub\n");
    expect(result.fixed).toBe(1);
  });

  it('honors the indentStyle and indentSize options', () => {
    const result = formatRule("LET x = If(a, 'b', 'c');\n", multilineCall, {
      maxLineLength: 20,
      indentStyle: 'space',
      indentSize: 4,
    });

    expect(result.output).toBe("LET x = If(\n    a,\n    'b',\n    'c'\n);\n");
    expect(result.fixed).toBe(1);
  });

  it('keeps a trailing tail like `As Field` intact after the broken call', () => {
    const result = formatRule("LOAD If(a, 'b', 'c') As Category\nFROM [lib://x/y.qvd];\n", multilineCall, {
      maxLineLength: 20,
    });

    expect(result.output).toBe("LOAD If(\n\ta,\n\t'b',\n\t'c'\n) As Category\nFROM [lib://x/y.qvd];\n");
    expect(result.fixed).toBe(1);
  });

  it('breaks nested calls iteratively across format passes', () => {
    const result = formatRule("LET x = If(Pick(aaa, bbb, ccc), 'y', 'n');\n", multilineCall, { maxLineLength: 15 });

    expect(result.output).toBe("LET x = If(\n\tPick(\n\t\taaa,\n\t\tbbb,\n\t\tccc\n\t),\n\t'y',\n\t'n'\n);\n");
    expect(result.fixed).toBe(2);
    expect(result.diagnostics).toEqual([]);
  });

  it('flags only the outermost qualifying call per pass', () => {
    const diagnostics = lintRule("LET x = If(Pick(aaa, bbb, ccc), 'y', 'n');\n", multilineCall, { maxLineLength: 15 });

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toContain("'If(...)'");
  });

  it('ignores commas inside string literals, bracket identifiers, and Trace bodies', () => {
    const diagnostics = lintRule(
      "LET vStr = 'a,b,c,d,e,f';\nLOAD [Order,Items,More] FROM [lib://x.qvd];\nTrace loading a,b,c,d,e,f;\n",
      multilineCall,
      { maxLineLength: 10 },
    );

    expect(diagnostics).toEqual([]);
  });
});
