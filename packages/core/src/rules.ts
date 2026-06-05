import { identifierToken, colonToken, builtinFunctionToken, keywordToken, FUNCTIONS, KEYWORDS } from './lexer.js';
import { tokenRange, tokenFix, type Rule, type Finding } from './runner.js';

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

export const builtinFunctionCase: Rule = {
  id: 'builtin-function-case',
  check: ({ tokens }) => {
    const out: Finding[] = [];

    for (const token of tokens) {
      if (token.tokenType !== builtinFunctionToken) {
        continue;
      }

      const canonical = canonicalFunctionByLower.get(token.image.toLowerCase());

      if (canonical && token.image !== canonical) {
        out.push({
          severity: 'warning',
          range: tokenRange(token),
          message: `Built-in function '${token.image}' should be written as '${canonical}'.`,
          fix: tokenFix(token, canonical),
        });
      }
    }

    return out;
  },
};

const canonicalKeywordByLower = new Map(KEYWORDS.map((name) => [name.toLowerCase(), name]));

export const builtinKeywordCase: Rule = {
  id: 'builtin-keyword-case',
  check: ({ tokens }) => {
    const out: Finding[] = [];

    for (const token of tokens) {
      if (token.tokenType !== keywordToken) {
        continue;
      }

      const canonical = canonicalKeywordByLower.get(token.image.toLowerCase());

      if (canonical && token.image !== canonical) {
        out.push({
          severity: 'warning',
          range: tokenRange(token),
          message: `Keyword '${token.image}' should be written as '${canonical}'.`,
          fix: tokenFix(token, canonical),
        });
      }
    }

    return out;
  },
};

export const recommended: Rule[] = [tableLabelBrackets, builtinFunctionCase, builtinKeywordCase];
