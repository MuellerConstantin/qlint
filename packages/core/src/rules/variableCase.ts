import { identifierToken, keywordToken } from '../lexer.js';
import type { Rule, Finding } from '../types.js';
import { tokenRange } from '../runner.js';

export type VariableCaseStyle = 'camel' | 'pascal' | 'snake' | 'upperSnake';

export interface VariableCaseOptions {
  style: VariableCaseStyle;
}

const PATTERNS: Record<VariableCaseStyle, RegExp> = {
  camel: /^[a-z][a-zA-Z0-9]*$/,
  pascal: /^[A-Z][a-zA-Z0-9]*$/,
  snake: /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/,
  upperSnake: /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/,
};

const LABELS: Record<VariableCaseStyle, string> = {
  camel: 'camelCase',
  pascal: 'PascalCase',
  snake: 'snake_case',
  upperSnake: 'UPPER_SNAKE_CASE',
};

export const variableCase: Rule<VariableCaseOptions, 'variable-case'> = {
  id: 'variable-case',
  defaultOptions: { style: 'camel' },
  check: ({ tokens }, { style }) => {
    const out: Finding[] = [];
    const pattern = PATTERNS[style];

    for (let index = 0; index < tokens.length - 1; index++) {
      const token = tokens[index];

      if (token.tokenType !== keywordToken) {
        continue;
      }

      const image = token.image.toLowerCase();

      if (image !== 'set' && image !== 'let') {
        continue;
      }

      const next = tokens[index + 1];

      if (next.tokenType !== identifierToken) {
        continue;
      }

      if (pattern.test(next.image)) {
        continue;
      }

      out.push({
        severity: 'warning',
        range: tokenRange(next),
        message: `Variable '${next.image}' should be written in ${LABELS[style]}.`,
      });
    }

    return out;
  },
};
