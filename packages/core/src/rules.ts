import { identifierToken, colonToken, builtinFunctionToken, keywordToken, FUNCTIONS, KEYWORDS } from './lexer.js';
import { tokenRange, tokenFix, type Rule, type Finding } from './runner.js';

export type CaseStyle = 'pascal' | 'lower' | 'upper';

export interface CaseRuleOptions {
  style: CaseStyle;
}

export const tableLabelBrackets: Rule = {
  id: 'table-label-brackets',
  check: ({ tokens, firstOnLine }) => {
    const firstSet = new Set(firstOnLine);
    const out: Finding[] = [];

    for (let index = 0; index < tokens.length - 1; index++) {
      const token = tokens[index];
      const next = tokens[index + 1];
      if (token.tokenType === identifierToken && next.tokenType === colonToken && firstSet.has(token)) {
        out.push({
          severity: 'warning',
          range: tokenRange(token),
          message: `The table name '${token.image}' should be enclosed in brackets: '[${token.image}]'.`,
          fix: tokenFix(token, `[${token.image}]`),
        });
      }
    }

    return out;
  },
};

const canonicalFunctionByLower = new Map(FUNCTIONS.map((name) => [name.toLowerCase(), name]));
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

export const builtinFunctionCase: Rule<CaseRuleOptions> = {
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

export const builtinKeywordCase: Rule<CaseRuleOptions> = {
  id: 'builtin-keyword-case',
  defaultOptions: { style: 'pascal' },
  check: ({ tokens }, { style }) => {
    const out: Finding[] = [];

    for (const token of tokens) {
      if (token.tokenType !== keywordToken) {
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

export const recommended: Rule<unknown>[] = [tableLabelBrackets, builtinFunctionCase, builtinKeywordCase];
