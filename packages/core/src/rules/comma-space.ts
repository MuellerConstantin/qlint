import { commaToken } from '../lexer.js';
import type { Rule, Finding } from '../types.js';
import { tokenRange } from '../token.js';

export const commaSpace: Rule<undefined, 'comma-space'> = {
  id: 'comma-space',
  defaultSeverity: 'warning',
  defaultOptions: undefined,
  check: ({ source, tokens }) => {
    const out: Finding[] = [];

    for (const token of tokens) {
      if (token.tokenType !== commaToken) {
        continue;
      }

      const after = (token.endOffset ?? token.startOffset) + 1;
      let cursor = after;

      while (cursor < source.length && (source[cursor] === ' ' || source[cursor] === '\t')) {
        cursor++;
      }

      if (cursor >= source.length || source[cursor] === '\n' || source[cursor] === '\r') {
        continue;
      }

      const gap = source.slice(after, cursor);

      if (gap === ' ') {
        continue;
      }

      out.push({
        range: tokenRange(token),
        message: gap.length === 0 ? "Expected a space after ','." : "Expected exactly one space after ','.",
        fix: { range: { start: after, end: cursor }, replacement: ' ' },
      });
    }

    return out;
  },
};
