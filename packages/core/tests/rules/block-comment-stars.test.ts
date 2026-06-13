import { describe, expect, it } from 'vitest';
import { format, lint } from '../../src/index.js';
import { blockCommentStars } from '../../src/rules/index.js';
import { lintFixture } from './helpers.js';

describe('block-comment-stars', () => {
  it('flags every malformed multi-line block comment from the fixture', () => {
    const diagnostics = lintFixture('block-comment-stars', 'violation', blockCommentStars);

    expect(diagnostics).toHaveLength(4);
    for (const d of diagnostics) {
      expect(d.ruleId).toBe('block-comment-stars');
      expect(d.severity).toBe('warning');
      expect(d.message).toBe("Multi-line block comment lines should start with aligned ' *'.");
    }
  });

  it('does not flag canonically aligned, single-line, or otherwise well-formed block comments', () => {
    const diagnostics = lintFixture('block-comment-stars', 'clean', blockCommentStars);

    expect(diagnostics).toEqual([]);
  });

  it('reports the violation at the start of the offending block comment', () => {
    const diagnostics = lint('/*\nhello\nworld\n*/\n', [blockCommentStars] as const);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].range.start).toEqual({ line: 1, column: 1 });
  });

  it('does not touch single-line block comments', () => {
    const diagnostics = lint('/* foo */\n', [blockCommentStars] as const);

    expect(diagnostics).toEqual([]);
  });

  it('does not touch a multi-line block comment that is not at line start', () => {
    const diagnostics = lint("LET x = 1; /*\nfoo\n*/\n", [blockCommentStars] as const);

    expect(diagnostics).toEqual([]);
  });

  it('flags stars that are not aligned with the opening /*', () => {
    const diagnostics = lint('/*\n* foo\n* bar\n*/\n', [blockCommentStars] as const);

    expect(diagnostics).toHaveLength(1);
  });

  it('autofixes missing stars on inner lines', () => {
    const result = format('/*\nhello\nworld\n*/\n', [blockCommentStars]);

    expect(result.output).toBe('/*\n * hello\n * world\n */\n');
    expect(result.fixed).toBe(1);
    expect(result.diagnostics).toEqual([]);
  });

  it('autofixes misaligned stars to align with the opening /*', () => {
    const result = format('/*\n* foo\n* bar\n*/\n', [blockCommentStars]);

    expect(result.output).toBe('/*\n * foo\n * bar\n */\n');
    expect(result.fixed).toBe(1);
  });

  it('autofixes a closing */ that sits at the end of a content line', () => {
    const result = format('/*\n * foo\n * bar */\n', [blockCommentStars]);

    expect(result.output).toBe('/*\n * foo\n * bar\n */\n');
    expect(result.fixed).toBe(1);
  });

  it('autofixes content that sits on the opening /* line', () => {
    const result = format('/* foo\n * bar\n */\n', [blockCommentStars]);

    expect(result.output).toBe('/*\n * foo\n * bar\n */\n');
    expect(result.fixed).toBe(1);
  });

  it('preserves blank lines inside the block comment as " *"', () => {
    const result = format('/*\nfoo\n\nbar\n*/\n', [blockCommentStars]);

    expect(result.output).toBe('/*\n * foo\n *\n * bar\n */\n');
    expect(result.fixed).toBe(1);
  });

  it('mirrors the surrounding indentation when autofixing', () => {
    const source = '\tIf x Then\n\t\t/*\n\t\thello\n\t\t*/\n\tEndIf\n';

    const result = format(source, [blockCommentStars]);

    expect(result.output).toBe('\tIf x Then\n\t\t/*\n\t\t * hello\n\t\t */\n\tEndIf\n');
    expect(result.fixed).toBe(1);
  });

  it('preserves CRLF line endings inside the rewritten comment', () => {
    const result = format('/*\r\nhello\r\n*/\r\n', [blockCommentStars]);

    expect(result.output).toBe('/*\r\n * hello\r\n */\r\n');
    expect(result.fixed).toBe(1);
  });

  it('is idempotent — formatting an already-canonical comment is a no-op', () => {
    const source = '/*\n * foo\n * bar\n */\n';

    const result = format(source, [blockCommentStars]);

    expect(result.output).toBe(source);
    expect(result.fixed).toBe(0);
  });
});
