import { semicolonToken } from '../lexer.js';
import type { Rule, Finding } from '../types.js';
import { tokenRange } from '../runner.js';

export type LineEnding = 'auto' | 'lf' | 'crlf';

export interface OneStatementPerLineOptions {
  lineEnding: LineEnding;
}

function resolveLineEnding(option: LineEnding, source: string): string {
  if (option === 'lf') {
    return '\n';
  }

  if (option === 'crlf') {
    return '\r\n';
  }

  return source.includes('\r\n') ? '\r\n' : '\n';
}

export const oneStatementPerLine: Rule<OneStatementPerLineOptions, 'one-statement-per-line'> = {
  id: 'one-statement-per-line',
  defaultOptions: { lineEnding: 'auto' },
  check: ({ source, tokens }, { lineEnding }) => {
    const newline = resolveLineEnding(lineEnding, source);
    const out: Finding[] = [];

    for (let index = 0; index < tokens.length - 1; index++) {
      const token = tokens[index];

      if (token.tokenType !== semicolonToken) {
        continue;
      }

      const next = tokens[index + 1];

      if (next.startLine !== token.startLine) {
        continue;
      }

      out.push({
        severity: 'warning',
        range: tokenRange(next),
        message: 'Each statement must start on its own line.',
        fix: {
          range: { start: (token.endOffset ?? token.startOffset) + 1, end: next.startOffset },
          replacement: newline,
        },
      });
    }

    return out;
  },
};
