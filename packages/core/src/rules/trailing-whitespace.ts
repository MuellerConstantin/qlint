import type { Rule, Finding } from '../types.js';

export const trailingWhitespace: Rule<undefined, 'trailing-whitespace'> = {
  id: 'trailing-whitespace',
  defaultSeverity: 'warning',
  defaultOptions: undefined,
  check: ({ source }) => {
    const out: Finding[] = [];
    const re = /\r?\n/g;
    let lineStart = 0;
    let lineNumber = 1;
    let match: RegExpExecArray | null;

    const scan = (lineEnd: number): void => {
      let trimEnd = lineEnd;

      while (trimEnd > lineStart && (source[trimEnd - 1] === ' ' || source[trimEnd - 1] === '\t')) {
        trimEnd--;
      }

      if (trimEnd === lineEnd) {
        return;
      }

      out.push({
        range: {
          start: { line: lineNumber, column: trimEnd - lineStart + 1 },
          end: { line: lineNumber, column: lineEnd - lineStart + 1 },
        },
        message: 'Trailing whitespace.',
        fix: { range: { start: trimEnd, end: lineEnd }, replacement: '' },
      });
    };

    while ((match = re.exec(source)) !== null) {
      scan(match.index);
      lineStart = match.index + match[0].length;
      lineNumber++;
    }

    scan(source.length);

    return out;
  },
};
