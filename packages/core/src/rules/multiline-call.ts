import type { IToken } from 'chevrotain';
import { builtinFunctionToken, commaToken, punctuationToken } from '../lexer.js';
import type { Rule, Finding } from '../types.js';
import { tokenRange } from '../runner.js';
import type { IndentStyle } from './block-indent.js';

export interface MultilineCallOptions {
  maxLineLength: number;
  indentStyle: IndentStyle;
  indentSize: number;
}

function isOpenParen(token: IToken): boolean {
  return token.tokenType === punctuationToken && token.image === '(';
}

function isCloseParen(token: IToken): boolean {
  return token.tokenType === punctuationToken && token.image === ')';
}

function findMatchingClose(tokens: IToken[], openIdx: number): number {
  let depth = 0;

  for (let i = openIdx; i < tokens.length; i++) {
    if (isOpenParen(tokens[i])) {
      depth++;
    } else if (isCloseParen(tokens[i])) {
      depth--;

      if (depth === 0) {
        return i;
      }
    }
  }

  return -1;
}

function topLevelCommas(tokens: IToken[], openIdx: number, closeIdx: number): IToken[] {
  const out: IToken[] = [];
  let depth = 0;

  for (let i = openIdx + 1; i < closeIdx; i++) {
    const t = tokens[i];

    if (isOpenParen(t)) {
      depth++;
    } else if (isCloseParen(t)) {
      depth--;
    } else if (depth === 0 && t.tokenType === commaToken) {
      out.push(t);
    }
  }

  return out;
}

function baseIndentOf(source: string, offset: number): string {
  let lineStart = offset;

  while (lineStart > 0 && source[lineStart - 1] !== '\n') {
    lineStart--;
  }

  let i = lineStart;

  while (i < offset && (source[i] === ' ' || source[i] === '\t')) {
    i++;
  }

  return source.slice(lineStart, i);
}

function lineLengthAt(source: string, line: number): number {
  const lines = source.split(/\r?\n/);
  return lines[line - 1]?.length ?? 0;
}

export const multilineCall: Rule<MultilineCallOptions, 'multiline-call'> = {
  id: 'multiline-call',
  defaultSeverity: 'warning',
  defaultOptions: { maxLineLength: 120, indentStyle: 'tab', indentSize: 1 },
  check: ({ source, tokens }, { maxLineLength, indentStyle, indentSize }) => {
    const out: Finding[] = [];
    const indentUnit = indentStyle === 'tab' ? '\t' : ' '.repeat(indentSize);
    let i = 0;

    while (i < tokens.length) {
      const funcToken = tokens[i];

      if (funcToken.tokenType !== builtinFunctionToken) {
        i++;
        continue;
      }

      const openIdx = i + 1;

      if (openIdx >= tokens.length || !isOpenParen(tokens[openIdx])) {
        i++;
        continue;
      }

      const closeIdx = findMatchingClose(tokens, openIdx);

      if (closeIdx === -1) {
        i++;
        continue;
      }

      const closeToken = tokens[closeIdx];
      const funcLine = funcToken.startLine ?? 1;
      const closeLine = closeToken.endLine ?? closeToken.startLine ?? funcLine;

      if (funcLine !== closeLine) {
        i++;
        continue;
      }

      if (lineLengthAt(source, funcLine) <= maxLineLength) {
        i++;
        continue;
      }

      const commas = topLevelCommas(tokens, openIdx, closeIdx);

      if (commas.length === 0) {
        i++;
        continue;
      }

      const openToken = tokens[openIdx];
      const innerStart = (openToken.endOffset ?? openToken.startOffset) + 1;
      const innerEnd = closeToken.startOffset;
      const args: string[] = [];
      let cursor = innerStart;

      for (const comma of commas) {
        args.push(source.slice(cursor, comma.startOffset).trim());
        cursor = (comma.endOffset ?? comma.startOffset) + 1;
      }

      args.push(source.slice(cursor, innerEnd).trim());

      const baseIndent = baseIndentOf(source, funcToken.startOffset);
      const deepIndent = baseIndent + indentUnit;
      const replacement = '\n' + args.map((a) => deepIndent + a).join(',\n') + '\n' + baseIndent;

      out.push({
        range: tokenRange(funcToken),
        message: `Call '${funcToken.image}(...)' exceeds the maximum line length of ${maxLineLength}; break each argument onto its own line.`,
        fix: { range: { start: innerStart, end: innerEnd }, replacement },
      });

      i = closeIdx + 1;
    }

    return out;
  },
};
