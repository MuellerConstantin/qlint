import type { IToken } from 'chevrotain';
import { equalsToken, punctuationToken } from '../lexer.js';
import type { Rule, Finding } from '../types.js';
import { tokenRange } from '../token.js';

/*
 * Operators whose spacing this rule enforces. Only the unambiguously *binary*
 * operators are covered: assignment / equality (`=`), the relational operators
 * (`<`, `>`, `<=`, `>=`, `<>`), and string concatenation (`&`).
 *
 * Arithmetic operators (`+`, `-`, `*`, `/`) are intentionally out of scope:
 * `+`/`-` are ambiguously unary (`= -1`), and `*` doubles as the `Load *`
 * wildcard. A mechanical space around any of them could change what the script
 * means, so they are left alone.
 */

const isPunct = (token: IToken | undefined, image: string): boolean =>
  token !== undefined && token.tokenType === punctuationToken && token.image === image;

const isEquals = (token: IToken | undefined): boolean => token !== undefined && token.tokenType === equalsToken;

const endOf = (token: IToken): number => (token.endOffset ?? token.startOffset) + 1;

const adjacent = (left: IToken, right: IToken): boolean => endOf(left) === right.startOffset;

interface Side {
  message: string;
  fix: NonNullable<Finding['fix']>;
}

/**
 * Enforce exactly one space on both sides of a binary operator. A side that
 * sits against a line boundary (leading indentation, or an operator that ends
 * its line for a wrapped expression) is left untouched — that layout is owned
 * by the indent rules and is a deliberate multi-line style.
 */
export const operatorSpacing: Rule<undefined, 'operator-spacing'> = {
  id: 'operator-spacing',
  defaultSeverity: 'warning',
  defaultOptions: undefined,
  check: ({ source, tokens }) => {
    const out: Finding[] = [];

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const prev = tokens[i - 1];
      const next = tokens[i + 1];

      let opStart: number;
      let opEnd: number;
      let label: string;

      if (isEquals(token)) {
        // Second char of `<=` / `>=` — handled with the `<` / `>` that opens it.
        if ((isPunct(prev, '<') || isPunct(prev, '>')) && adjacent(prev, token)) {
          continue;
        }
        // Leading eval marker in `$(= …)`: an `=` right after `(` is not a
        // binary operator. Skip it so the dollar expansion stays intact.
        let l = token.startOffset - 1;
        while (l >= 0 && (source[l] === ' ' || source[l] === '\t')) {
          l--;
        }
        if (l >= 0 && source[l] === '(') {
          continue;
        }
        opStart = token.startOffset;
        opEnd = endOf(token);
        label = '=';
      } else if (isPunct(token, '<')) {
        opStart = token.startOffset;
        if ((isEquals(next) || isPunct(next, '>')) && adjacent(token, next)) {
          opEnd = endOf(next);
          label = `<${next.image}`;
          i++;
        } else {
          opEnd = endOf(token);
          label = '<';
        }
      } else if (isPunct(token, '>')) {
        // Second char of `<>` — handled with the `<` that opens it.
        if (isPunct(prev, '<') && adjacent(prev, token)) {
          continue;
        }
        opStart = token.startOffset;
        if (isEquals(next) && adjacent(token, next)) {
          opEnd = endOf(next);
          label = '>=';
          i++;
        } else {
          opEnd = endOf(token);
          label = '>';
        }
      } else if (isPunct(token, '&')) {
        opStart = token.startOffset;
        opEnd = endOf(token);
        label = '&';
      } else {
        continue;
      }

      const before = checkBefore(source, opStart, label);
      if (before !== undefined) {
        out.push({ range: tokenRange(token), message: before.message, fix: before.fix });
      }

      const after = checkAfter(source, opEnd, label);
      if (after !== undefined) {
        out.push({ range: tokenRange(token), message: after.message, fix: after.fix });
      }
    }

    return out;
  },
};

function checkBefore(source: string, opStart: number, label: string): Side | undefined {
  let cursor = opStart;
  while (cursor - 1 >= 0 && (source[cursor - 1] === ' ' || source[cursor - 1] === '\t')) {
    cursor--;
  }

  // Start of file or start of line — that is indentation, not operator spacing.
  if (cursor === 0 || source[cursor - 1] === '\n' || source[cursor - 1] === '\r') {
    return undefined;
  }

  const gap = source.slice(cursor, opStart);
  if (gap === ' ') {
    return undefined;
  }

  return {
    message:
      gap.length === 0 ? `Expected a space before '${label}'.` : `Expected exactly one space before '${label}'.`,
    fix: { range: { start: cursor, end: opStart }, replacement: ' ' },
  };
}

function checkAfter(source: string, opEnd: number, label: string): Side | undefined {
  let cursor = opEnd;
  while (cursor < source.length && (source[cursor] === ' ' || source[cursor] === '\t')) {
    cursor++;
  }

  // End of file or end of line — a wrapped expression, left to the indent rules.
  if (cursor >= source.length || source[cursor] === '\n' || source[cursor] === '\r') {
    return undefined;
  }

  const gap = source.slice(opEnd, cursor);
  if (gap === ' ') {
    return undefined;
  }

  return {
    message: gap.length === 0 ? `Expected a space after '${label}'.` : `Expected exactly one space after '${label}'.`,
    fix: { range: { start: opEnd, end: cursor }, replacement: ' ' },
  };
}
