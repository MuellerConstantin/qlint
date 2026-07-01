import { describe, expect, it } from 'vitest';
import { formatRule, lintRule } from '../support.js';
import { commaSpace } from '../../src/rules/index.js';
import { lintFixture } from './helpers.js';

describe('comma-space', () => {
  it('flags every comma-space problem in the violation fixture', () => {
    const diagnostics = lintFixture('violation', commaSpace);

    expect(diagnostics).toHaveLength(10);
    for (const d of diagnostics) {
      expect(d.ruleId).toBe('comma-space');
      expect(d.severity).toBe('warning');
    }
  });

  it('does not flag the clean fixture', () => {
    const diagnostics = lintFixture('clean', commaSpace);

    expect(diagnostics).toEqual([]);
  });

  it('flags a missing space after a comma', () => {
    const diagnostics = lintRule("LET x = If(1,'a','b');\n", commaSpace);

    expect(diagnostics).toHaveLength(2);
    expect(diagnostics[0].message).toBe("Expected a space after ','.");
  });

  it('flags more than one space after a comma', () => {
    const diagnostics = lintRule("LET x = If(1,  'a', 'b');\n", commaSpace);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toBe("Expected exactly one space after ','.");
  });

  it('flags a tab after a comma', () => {
    const diagnostics = lintRule("LET x = If(1,\t'a', 'b');\n", commaSpace);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toBe("Expected exactly one space after ','.");
  });

  it('accepts a single space after a comma', () => {
    const diagnostics = lintRule("LET x = If(1, 'a', 'b');\n", commaSpace);

    expect(diagnostics).toEqual([]);
  });

  it('does not flag a comma at the end of a line', () => {
    const diagnostics = lintRule('LOAD\n    A,\n    B,\n    C\nFROM [lib://x/y.qvd];\n', commaSpace);

    expect(diagnostics).toEqual([]);
  });

  it('does not flag a comma followed only by trailing whitespace before newline', () => {
    const diagnostics = lintRule('LOAD\n    A,   \n    B\nFROM [lib://x/y.qvd];\n', commaSpace);

    expect(diagnostics).toEqual([]);
  });

  it('requires a space before an inline block comment after the comma', () => {
    const diagnostics = lintRule("LET x = If(1,/* hint */ 'a', 'b');\n", commaSpace);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toBe("Expected a space after ','.");
  });

  it('accepts a single space before an inline block comment after the comma', () => {
    const diagnostics = lintRule("LET x = If(1, /* hint */ 'a', 'b');\n", commaSpace);

    expect(diagnostics).toEqual([]);
  });

  it('ignores commas inside string literals', () => {
    const diagnostics = lintRule("LET x = 'a,b,c';\n", commaSpace);

    expect(diagnostics).toEqual([]);
  });

  it('ignores commas inside bracket identifiers', () => {
    const diagnostics = lintRule('LOAD [Order,Items] AS X FROM [lib://x/y.qvd];\n', commaSpace);

    expect(diagnostics).toEqual([]);
  });

  it('ignores commas inside Trace bodies', () => {
    const diagnostics = lintRule('Trace loading a,b,c;\n', commaSpace);

    expect(diagnostics).toEqual([]);
  });

  it('autofixes a missing space by inserting one', () => {
    const result = formatRule("LET x = If(1,'a','b');\n", commaSpace);

    expect(result.output).toBe("LET x = If(1, 'a', 'b');\n");
    expect(result.fixed).toBe(2);
    expect(result.diagnostics).toEqual([]);
  });

  it('autofixes excess whitespace by collapsing to a single space', () => {
    const result = formatRule("LET x = If(1,    'a',\t'b');\n", commaSpace);

    expect(result.output).toBe("LET x = If(1, 'a', 'b');\n");
    expect(result.fixed).toBe(2);
    expect(result.diagnostics).toEqual([]);
  });
});
