import { describe, expect, it } from 'vitest';
import { format, lint } from '../../src/index.js';
import { inlineCommentSpace } from '../../src/rules/index.js';
import { lintFixture } from './helpers.js';

describe('inline-comment-space', () => {
  it('flags every inline-comment spacing problem in the violation fixture', () => {
    const diagnostics = lintFixture('inline-comment-space', 'violation', inlineCommentSpace);

    expect(diagnostics).toHaveLength(6);
    for (const d of diagnostics) {
      expect(d.ruleId).toBe('inline-comment-space');
      expect(d.severity).toBe('warning');
    }
  });

  it('does not flag the clean fixture', () => {
    const diagnostics = lintFixture('inline-comment-space', 'clean', inlineCommentSpace);

    expect(diagnostics).toEqual([]);
  });

  it('flags a missing space before an inline line comment', () => {
    const diagnostics = lint('LET x = 1;// note\n', [inlineCommentSpace] as const);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toBe("Expected a space before '//'.");
  });

  it('flags more than one space before an inline line comment', () => {
    const diagnostics = lint('LET x = 1;   // note\n', [inlineCommentSpace] as const);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toBe("Expected exactly one space before '//'.");
  });

  it('flags a tab before an inline line comment', () => {
    const diagnostics = lint('LET x = 1;\t// note\n', [inlineCommentSpace] as const);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toBe("Expected exactly one space before '//'.");
  });

  it('flags a missing space before an inline block comment', () => {
    const diagnostics = lint('LET x = 1;/* note */\n', [inlineCommentSpace] as const);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toBe("Expected a space before '/*'.");
  });

  it('flags more than one space before an inline block comment', () => {
    const diagnostics = lint('LET x = 1;  /* note */\n', [inlineCommentSpace] as const);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toBe("Expected exactly one space before '/*'.");
  });

  it('accepts a single space before an inline comment', () => {
    const diagnostics = lint('LET x = 1; // note\nLET y = 2; /* note */\n', [inlineCommentSpace] as const);

    expect(diagnostics).toEqual([]);
  });

  it('does not flag standalone-line comments', () => {
    const diagnostics = lint('// header\n    // indented standalone\n/* block */\n', [inlineCommentSpace] as const);

    expect(diagnostics).toEqual([]);
  });

  it('does not flag a comment hidden inside a Trace body', () => {
    const diagnostics = lint('Trace this //is just a message;\n', [inlineCommentSpace] as const);

    expect(diagnostics).toEqual([]);
  });

  it('autofixes a missing space by inserting one', () => {
    const result = format('LET x = 1;// note\n', [inlineCommentSpace]);

    expect(result.output).toBe('LET x = 1; // note\n');
    expect(result.fixed).toBe(1);
    expect(result.diagnostics).toEqual([]);
  });

  it('autofixes excess whitespace by collapsing to a single space', () => {
    const result = format('LET x = 1;    // note\n', [inlineCommentSpace]);

    expect(result.output).toBe('LET x = 1; // note\n');
    expect(result.fixed).toBe(1);
    expect(result.diagnostics).toEqual([]);
  });

  it('autofixes a tab before an inline comment', () => {
    const result = format('LET x = 1;\t/* note */\n', [inlineCommentSpace]);

    expect(result.output).toBe('LET x = 1; /* note */\n');
    expect(result.fixed).toBe(1);
    expect(result.diagnostics).toEqual([]);
  });

  it('autofixes multiple inline comments in one pass', () => {
    const result = format('LET a = 1;// x\nLET b = 2;   /* y */\n', [inlineCommentSpace]);

    expect(result.output).toBe('LET a = 1; // x\nLET b = 2; /* y */\n');
    expect(result.fixed).toBe(2);
    expect(result.diagnostics).toEqual([]);
  });

  it('autofixes two block comments on the same line independently', () => {
    const result = format('LET x = 1;/* one */ /* two */\n', [inlineCommentSpace]);

    expect(result.output).toBe('LET x = 1; /* one */ /* two */\n');
    expect(result.fixed).toBe(1);
    expect(result.diagnostics).toEqual([]);
  });
});
