import type { IToken } from 'chevrotain';
import { commaToken, keywordToken, punctuationToken, semicolonToken } from '../lexer.js';
import type { Rule, Finding, RuleContext } from '../types.js';
import { tokenRange } from '../token.js';

/*
 * Keywords that close the LOAD field list. The set must stay in sync with
 * load-clause-newline — both rules need the same boundary definition to
 * agree on where the field list ends and where the clauses begin.
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

function isWildcard(token: IToken): boolean {
  return token.tokenType === punctuationToken && token.image === '*';
}

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
 * The field list runs from the first token after `Load [Distinct]` up to
 * the first top-level clause keyword (From/Resident/...) or the closing
 * semicolon, whichever comes first.
 */
function findFieldListBoundaries(tokens: IToken[], loadIdx: number): { start: number; end: number } {
  let start = loadIdx + 1;

  while (start < tokens.length && isKeyword(tokens[start], 'distinct')) {
    start++;
  }

  let depth = 0;
  let end = tokens.length;

  for (let i = start; i < tokens.length; i++) {
    const t = tokens[i];

    if (isOpenParen(t)) {
      depth++;
      continue;
    }

    if (isCloseParen(t)) {
      depth--;
      continue;
    }

    if (depth !== 0) {
      continue;
    }

    if (t.tokenType === semicolonToken) {
      end = i;
      break;
    }

    if (t.tokenType === keywordToken && CLAUSE_STARTERS.has(t.image.toLowerCase())) {
      end = i;
      break;
    }
  }

  return { start, end };
}

/*
 * `Load * From X` and `Load * Inline [...]` use `*` as a wildcard
 * placeholder for the field list. It is not a field that benefits from
 * its own line, so leave it on the LOAD header line. As soon as a real
 * field shows up (`Load *, Field1, ...`) the wildcard is treated like any
 * other field and must take its own line.
 */
function isLoneWildcard(tokens: IToken[], start: number, end: number): boolean {
  let depth = 0;
  let topLevelCount = 0;
  let wildcardSeen = false;

  for (let i = start; i < end; i++) {
    const t = tokens[i];

    if (isOpenParen(t)) {
      depth++;
      continue;
    }

    if (isCloseParen(t)) {
      depth--;
      continue;
    }

    if (depth !== 0) {
      continue;
    }

    topLevelCount++;

    if (isWildcard(t)) {
      wildcardSeen = true;
    }
  }

  return wildcardSeen && topLevelCount === 1;
}

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

function makeFinding(prev: IToken, t: IToken, comments: IToken[]): Finding {
  return {
    range: tokenRange(t),
    message: 'Each LOAD field should start on its own line.',
    fix: {
      range: { start: fixStartOffset(prev, t, comments), end: t.startOffset },
      replacement: '\n',
    },
  };
}

function checkStatement(tokens: IToken[], comments: IToken[]): Finding[] {
  const loadIdx = findLoadIndex(tokens);

  if (loadIdx === -1) {
    return [];
  }

  const { start, end } = findFieldListBoundaries(tokens, loadIdx);

  if (start >= end) {
    return [];
  }

  const out: Finding[] = [];

  if (!isLoneWildcard(tokens, start, end)) {
    const header = tokens[start - 1];
    const firstField = tokens[start];

    if ((header.startLine ?? 1) === (firstField.startLine ?? 1)) {
      out.push(makeFinding(header, firstField, comments));
    }
  }

  let depth = 0;

  for (let i = start; i < end; i++) {
    const t = tokens[i];

    if (isOpenParen(t)) {
      depth++;
      continue;
    }

    if (isCloseParen(t)) {
      depth--;
      continue;
    }

    if (depth !== 0 || t.tokenType !== commaToken) {
      continue;
    }

    const next = tokens[i + 1];

    if (!next || i + 1 >= end) {
      continue;
    }

    if ((next.startLine ?? 1) === (t.startLine ?? 1)) {
      out.push(makeFinding(t, next, comments));
    }
  }

  return out;
}

export const loadFieldPerLine: Rule<undefined, 'load-field-per-line'> = {
  id: 'load-field-per-line',
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
