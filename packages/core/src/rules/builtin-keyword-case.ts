import { keywordToken, traceKeywordToken, KEYWORDS } from '../lexer.js';
import type { Rule, Finding } from '../types.js';
import { tokenRange, tokenFix } from '../runner.js';
import type { CaseStyle, CaseRuleOptions } from './types.js';

const canonicalKeywordByLower = new Map(KEYWORDS.map((name) => [name.toLowerCase(), name]));

function applyCaseStyle(canonical: string, style: CaseStyle): string {
  switch (style) {
    case 'pascal':
      return canonical;
    case 'lower':
      return canonical.toLowerCase();
    case 'upper':
      return canonical.toUpperCase();
  }
}

export const builtinKeywordCase: Rule<CaseRuleOptions, 'builtin-keyword-case'> = {
  id: 'builtin-keyword-case',
  defaultOptions: { style: 'pascal' },
  check: ({ tokens }, { style }) => {
    const out: Finding[] = [];

    for (const token of tokens) {
      if (token.tokenType !== keywordToken && token.tokenType !== traceKeywordToken) {
        continue;
      }

      const canonical = canonicalKeywordByLower.get(token.image.toLowerCase());

      if (!canonical) {
        continue;
      }

      const expected = applyCaseStyle(canonical, style);

      if (token.image !== expected) {
        out.push({
          severity: 'warning',
          range: tokenRange(token),
          message: `Keyword '${token.image}' should be written as '${expected}'.`,
          fix: tokenFix(token, expected),
        });
      }
    }

    return out;
  },
};
