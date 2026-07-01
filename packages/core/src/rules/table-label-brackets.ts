import { identifierToken, colonToken } from '../lexer.js';
import type { Rule, Finding } from '../types.js';
import { tokenRange, tokenFix } from '../token.js';

export const tableLabelBrackets: Rule<undefined, 'table-label-brackets'> = {
  id: 'table-label-brackets',
  defaultSeverity: 'warning',
  check: ({ tokens, firstOnLine }) => {
    const firstSet = new Set(firstOnLine);
    const out: Finding[] = [];

    for (let index = 0; index < tokens.length - 1; index++) {
      const token = tokens[index];
      const next = tokens[index + 1];
      if (token.tokenType === identifierToken && next.tokenType === colonToken && firstSet.has(token)) {
        out.push({
          range: tokenRange(token),
          message: `The table name '${token.image}' should be enclosed in brackets: '[${token.image}]'.`,
          fix: tokenFix(token, `[${token.image}]`),
        });
      }
    }

    return out;
  },
};
