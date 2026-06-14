import type { IToken } from 'chevrotain';
import { keywordToken, punctuationToken, semicolonToken } from '../lexer.js';
import type { Rule, Finding, RuleContext } from '../types.js';
import { tokenRange } from '../runner.js';

/*
 * Keywords that start a top-level clause inside a LOAD statement. Each one
 * must appear as the first non-whitespace token of its line. Anything else
 * (Distinct, NoConcatenate, Concatenate, Add, Replace, Mapping, Buffer,
 * First, Join/Keep prefixes, `as`, ...) is intentionally not in this set —
 * they are modifiers of the LOAD itself, not clauses, and their line
 * placement is governed by a different (future) rule.
 *
 * `Group` and `Order` are listed as the clause start; the trailing `By` is
 * not a separate clause and stays on the same line as its head.
 */
const CLAUSE_STARTERS = new Set([
  'from',
  'from_field',
  'resident',
  'inline',
  'autogenerate',
  'extension',
  'where',
  'while',
  'group',
  'order',
]);

function isKeyword(token: IToken, image: string): boolean {
  return token.tokenType === keywordToken && token.image.toLowerCase() === image;
}

function isOpenParen(token: IToken): boolean {
  return token.tokenType === punctuationToken && token.image === '(';
}

function isCloseParen(token: IToken): boolean {
  return token.tokenType === punctuationToken && token.image === ')';
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

    if (depth === 0 && t.tokenType === keywordToken) {
      const lower = t.image.toLowerCase();

      if (CLAUSE_STARTERS.has(lower)) {
        const prevLine = prev.startLine ?? 1;
        const tLine = t.startLine ?? 1;

        if (prevLine === tLine) {
          out.push({
            severity: 'warning',
            range: tokenRange(t),
            message: `LOAD clause '${t.image}' should start on its own line.`,
            fix: {
              range: { start: fixStartOffset(prev, t, comments), end: t.startOffset },
              replacement: '\n',
            },
          });
        }
      }
    }

    prev = t;
  }

  return out;
}

export const loadClauseNewline: Rule<undefined, 'load-clause-newline'> = {
  id: 'load-clause-newline',
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
