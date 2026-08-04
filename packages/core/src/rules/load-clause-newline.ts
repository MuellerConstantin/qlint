import type { IToken } from 'chevrotain';
import { keywordToken, semicolonToken } from '../lexer.js';
import type { Rule, Finding, RuleContext } from '../types.js';
import { tokenRange } from '../token.js';
import { isClauseStarter, isCloseParen, isOpenParen } from './shared.js';

function isKeyword(token: IToken, image: string): boolean {
  return token.tokenType === keywordToken && token.image.toLowerCase() === image;
}

/*
 * Split the token stream into statements at top-level semicolons.
 * Parenthesised content keeps a `;` from terminating the statement; in
 * practice no Qlik construct puts `;` inside parens, but the depth check
 * keeps the splitter robust.
 */
function splitStatements(tokens: IToken[]): IToken[][] {
  const stmts: IToken[][] = [];
  let current: IToken[] = [];
  let depth = 0;

  for (const t of tokens) {
    if (isOpenParen(t)) {
      depth++;
    } else if (isCloseParen(t)) {
      depth--;
    }

    current.push(t);

    if (depth === 0 && t.tokenType === semicolonToken) {
      stmts.push(current);
      current = [];
    }
  }

  if (current.length > 0) {
    stmts.push(current);
  }

  return stmts;
}

function findLoadIndex(tokens: IToken[]): number {
  let depth = 0;

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];

    if (isOpenParen(t)) {
      depth++;
      continue;
    }

    if (isCloseParen(t)) {
      depth--;
      continue;
    }

    if (depth === 0 && isKeyword(t, 'load')) {
      return i;
    }
  }

  return -1;
}

/*
 * Find where to start the fix range so it consumes the whitespace between
 * `prev` and `t` but preserves any comment sitting in that gap.
 */
function fixStartOffset(prev: IToken, t: IToken, comments: IToken[]): number {
  const prevEnd = (prev.endOffset ?? prev.startOffset) + 1;
  let start = prevEnd;

  for (const c of comments) {
    if (c.startOffset >= t.startOffset) {
      break;
    }

    const cEnd = (c.endOffset ?? c.startOffset) + 1;

    if (cEnd > prevEnd && cEnd > start) {
      start = cEnd;
    }
  }

  return start;
}

function checkStatement(tokens: IToken[], comments: IToken[]): Finding[] {
  const loadIdx = findLoadIndex(tokens);

  if (loadIdx === -1) {
    return [];
  }

  const out: Finding[] = [];
  let depth = 0;
  let prev = tokens[loadIdx];

  for (let i = loadIdx + 1; i < tokens.length; i++) {
    const t = tokens[i];

    if (isOpenParen(t)) {
      depth++;
    } else if (isCloseParen(t)) {
      depth--;
    }

    if (depth === 0 && isClauseStarter(t)) {
      const prevLine = prev.startLine ?? 1;
      const tLine = t.startLine ?? 1;

      if (prevLine === tLine) {
        out.push({
          range: tokenRange(t),
          message: `LOAD clause '${t.image}' should start on its own line.`,
          fix: {
            range: { start: fixStartOffset(prev, t, comments), end: t.startOffset },
            replacement: '\n',
          },
        });
      }
    }

    prev = t;
  }

  return out;
}

export const loadClauseNewline: Rule<undefined, 'load-clause-newline'> = {
  id: 'load-clause-newline',
  defaultSeverity: 'warning',
  defaultOptions: undefined,
  check: ({ tokens, comments }: RuleContext) => {
    const stmts = splitStatements(tokens);
    const out: Finding[] = [];

    for (const stmt of stmts) {
      out.push(...checkStatement(stmt, comments));
    }

    return out;
  },
};
