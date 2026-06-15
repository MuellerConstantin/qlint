import { blockCommentToken, lineCommentToken } from '../lexer.js';
import type { Rule, Finding } from '../types.js';
import { tokenRange } from '../runner.js';

export const inlineCommentSpace: Rule<undefined, 'inline-comment-space'> = {
  id: 'inline-comment-space',
  defaultOptions: undefined,
  check: ({ source, comments }) => {
    const out: Finding[] = [];

    for (const token of comments) {
      if (token.tokenType !== lineCommentToken && token.tokenType !== blockCommentToken) {
        continue;
      }

      const start = token.startOffset;
      let cursor = start - 1;

      while (cursor >= 0 && (source[cursor] === ' ' || source[cursor] === '\t')) {
        cursor--;
      }

      if (cursor < 0 || source[cursor] === '\n' || source[cursor] === '\r') {
        continue;
      }

      const gap = source.slice(cursor + 1, start);

      if (gap === ' ') {
        continue;
      }

      const marker = token.tokenType === lineCommentToken ? '//' : '/*';

      out.push({
        severity: 'warning',
        range: tokenRange(token),
        message:
          gap.length === 0 ? `Expected a space before '${marker}'.` : `Expected exactly one space before '${marker}'.`,
        fix: { range: { start: cursor + 1, end: start }, replacement: ' ' },
      });
    }

    return out;
  },
};
