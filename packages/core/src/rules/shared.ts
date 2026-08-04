import type { IToken } from 'chevrotain';
import { keywordToken, punctuationToken } from '../lexer.js';

/*
 * Keywords that close a LOAD field list and open the clause list. Each one must
 * appear as the first non-whitespace token of its line.
 *
 * `load-indent`, `load-clause-newline`, `load-field-per-line` and
 * `continuation-indent` all have to agree on where the field list ends: one
 * rule indents fields, another puts each on its own line, a third breaks the
 * clauses off, and the fourth treats everything they do not claim as a
 * continuation. When these drift apart, a keyword is a clause for one rule and
 * a field for another — and their autofixes start rewriting each other. The set
 * therefore lives here once rather than being copied per rule.
 *
 * Anything else (Distinct, NoConcatenate, Concatenate, Add, Replace, Mapping,
 * Buffer, First, Join/Keep prefixes, `as`, ...) is intentionally absent — those
 * are modifiers of the LOAD itself, not clauses, and their line placement is
 * governed by a different (future) rule.
 *
 * `Group` and `Order` are listed as the clause start; the trailing `By` is not
 * a separate clause and stays on the same line as its head.
 */
export const CLAUSE_STARTERS = new Set([
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

/** True when the token is a clause keyword that closes the LOAD field list. */
export function isClauseStarter(token: IToken): boolean {
  return token.tokenType === keywordToken && CLAUSE_STARTERS.has(token.image.toLowerCase());
}

export function isOpenParen(token: IToken): boolean {
  return token.tokenType === punctuationToken && token.image === '(';
}

export function isCloseParen(token: IToken): boolean {
  return token.tokenType === punctuationToken && token.image === ')';
}
