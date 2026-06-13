import { builtinFunctionToken, FUNCTIONS } from '../lexer.js';
import type { Rule, Finding } from '../types.js';
import { tokenRange, tokenFix } from '../runner.js';
import type { CaseStyle, CaseRuleOptions } from './types.js';

const canonicalFunctionByLower = new Map(FUNCTIONS.map((name) => [name.toLowerCase(), name]));

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

export const builtinFunctionCase: Rule<CaseRuleOptions, 'builtin-function-case'> = {
  id: 'builtin-function-case',
  defaultOptions: { style: 'pascal' },
  check: ({ tokens }, { style }) => {
    const out: Finding[] = [];

    for (const token of tokens) {
      if (token.tokenType !== builtinFunctionToken) {
        continue;
      }

      const canonical = canonicalFunctionByLower.get(token.image.toLowerCase());

      if (!canonical) {
        continue;
      }

      const expected = applyCaseStyle(canonical, style);

      if (token.image !== expected) {
        out.push({
          severity: 'warning',
          range: tokenRange(token),
          message: `Built-in function '${token.image}' should be written as '${expected}'.`,
          fix: tokenFix(token, expected),
        });
      }
    }

    return out;
  },
};
