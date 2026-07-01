import type { IToken } from 'chevrotain';
import type { Range, Fix } from './types.js';

export function tokenRange(token: IToken): Range {
  return {
    start: { line: token.startLine ?? 1, column: token.startColumn ?? 1 },
    end: { line: token.endLine ?? token.startLine ?? 1, column: (token.endColumn ?? token.startColumn ?? 1) + 1 },
  };
}

export function tokenFix(token: IToken, replacement: string): Fix {
  return {
    range: { start: token.startOffset, end: (token.endOffset ?? token.startOffset) + 1 },
    replacement,
  };
}
