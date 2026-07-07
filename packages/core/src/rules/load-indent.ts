import type { IToken } from 'chevrotain';
import { commaToken, keywordToken, punctuationToken, semicolonToken } from '../lexer.js';
import type { Rule, Finding, RuleContext } from '../types.js';
import { groupByLine, previousLineClosesStatement, type IndentStyle } from './block-indent.js';

export type { IndentStyle } from './block-indent.js';

export interface LoadIndentOptions {
  size: number;
  style: IndentStyle;
}

/*
 * Field-list / clause-list boundary. Must stay in sync with
 * load-clause-newline and load-field-per-line — all three need to agree on
 * what closes the LOAD field list.
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

function collectFieldStarts(tokens: IToken[], start: number, end: number): IToken[] {
  if (start >= end) {
    return [];
  }

  const out: IToken[] = [];

  if (!isLoneWildcard(tokens, start, end)) {
    out.push(tokens[start]);
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

    if (next && i + 1 < end) {
      out.push(next);
    }
  }

  return out;
}

function collectClauseStarters(tokens: IToken[], fieldsEnd: number): IToken[] {
  const out: IToken[] = [];
  let depth = 0;

  for (let i = fieldsEnd; i < tokens.length; i++) {
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

    if (t.tokenType === keywordToken && CLAUSE_STARTERS.has(t.image.toLowerCase())) {
      out.push(t);
    }
  }

  return out;
}

/*
 * The line whose indent the field/clause list hangs off. Usually the line the
 * `Load` keyword sits on, but when the `Load` is a continuation of a prefixed
 * statement — `Left Join(...) IntervalMatch(...)`, a `Hierarchy (...)`, or a
 * `NoConcatenate` broken onto its own line — the base is set by the line that
 * opens the statement, not the continuation line the `Load` happens to land on.
 * That continuation line is unmanaged by block-indent, so trusting its column
 * (e.g. when it is space-indented) would derive a nonsensical base. Walk up
 * while each line above is still part of the same statement.
 */
function findStatementStartLine(tokens: IToken[], loadLine: number): number {
  const lines = groupByLine(tokens);
  let idx = lines.findIndex((line) => line.line === loadLine);

  if (idx === -1) {
    return loadLine;
  }

  while (idx > 0 && !previousLineClosesStatement(lines[idx - 1].tokens)) {
    idx--;
  }

  return lines[idx].line;
}

/*
 * True when the token's leading whitespace is exactly `expectedWidth` copies
 * of `indentChar`. Compares the actual characters, not just the column count,
 * so a run of the wrong whitespace (tabs where spaces are expected, or a
 * tab/space mix) that happens to match the expected width is still rejected.
 */
function hasExpectedIndent(source: string, token: IToken, expectedWidth: number, indentChar: string): boolean {
  const actualWidth = (token.startColumn ?? 1) - 1;
  const lineStart = token.startOffset - actualWidth;

  return source.slice(lineStart, token.startOffset) === indentChar.repeat(expectedWidth);
}

function makeIndentFinding(token: IToken, expectedWidth: number, indentChar: string, unitLabel: string): Finding {
  const actualColumn = token.startColumn ?? 1;
  const actualWidth = actualColumn - 1;
  const line = token.startLine ?? 1;
  const lineStart = token.startOffset - actualWidth;

  /*
   * When the line has no leading whitespace at all, `actualColumn` is 1 and
   * a [col 1, col 1) range would be zero-width — invisible to range-based
   * consumers like the CodeMirror highlighter. Fall back to a 1-character
   * range over the first token so the finding always has something to draw.
   */
  const endColumn = Math.max(actualColumn, 2);

  /*
   * When the width already matches, the offending line has the right number
   * of the wrong character (e.g. tabs under a space style); point at the
   * character rather than a width that is technically correct.
   */
  const message =
    actualWidth === expectedWidth
      ? `Expected indentation to use ${unitLabel}s.`
      : `Expected ${expectedWidth} ${unitLabel}${expectedWidth === 1 ? '' : 's'} of indentation but got ${actualWidth}.`;

  return {
    range: {
      start: { line, column: 1 },
      end: { line, column: endColumn },
    },
    message,
    fix: {
      range: { start: lineStart, end: token.startOffset },
      replacement: indentChar.repeat(expectedWidth),
    },
  };
}

export const loadIndent: Rule<LoadIndentOptions, 'load-indent'> = {
  id: 'load-indent',
  defaultSeverity: 'warning',
  defaultOptions: { size: 4, style: 'space' },
  check: ({ source, tokens, firstOnLine }: RuleContext, { size, style }): Finding[] => {
    const indentChar = style === 'tab' ? '\t' : ' ';
    const step = style === 'tab' ? 1 : size;
    const unitLabel = style === 'tab' ? 'tab' : 'space';

    const firstOnLineSet = new Set(firstOnLine);
    const firstByLine = new Map<number, IToken>();

    for (const t of firstOnLine) {
      firstByLine.set(t.startLine ?? 1, t);
    }

    const stmts = splitStatements(tokens);
    const out: Finding[] = [];

    for (const stmt of stmts) {
      const loadIdx = findLoadIndex(stmt);

      if (loadIdx === -1) {
        continue;
      }

      const loadLine = stmt[loadIdx].startLine ?? 1;
      const headerLine = findStatementStartLine(stmt, loadLine);
      const headerFirst = firstByLine.get(headerLine);
      const base = headerFirst ? (headerFirst.startColumn ?? 1) - 1 : 0;

      const { start, end } = findFieldListBoundaries(stmt, loadIdx);
      const fieldStarts = collectFieldStarts(stmt, start, end);
      const clauseStarters = collectClauseStarters(stmt, end);

      for (const t of fieldStarts) {
        if (!firstOnLineSet.has(t)) {
          continue;
        }

        const expectedWidth = base + step;

        if (!hasExpectedIndent(source, t, expectedWidth, indentChar)) {
          out.push(makeIndentFinding(t, expectedWidth, indentChar, unitLabel));
        }
      }

      for (const t of clauseStarters) {
        if (!firstOnLineSet.has(t)) {
          continue;
        }

        if (!hasExpectedIndent(source, t, base, indentChar)) {
          out.push(makeIndentFinding(t, base, indentChar, unitLabel));
        }
      }
    }

    return out;
  },
};
