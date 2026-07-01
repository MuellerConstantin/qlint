import { identifierToken, keywordToken } from '../lexer.js';
import type { Rule, Finding } from '../types.js';
import { tokenRange } from '../token.js';

export type VariableCaseStyle = 'camel' | 'pascal' | 'snake' | 'upperSnake';

export interface VariableCaseOptions {
  style: VariableCaseStyle;
}

const PATTERNS: Record<VariableCaseStyle, RegExp> = {
  camel: /^\p{Ll}[\p{L}0-9]*$/u,
  pascal: /^\p{Lu}[\p{L}0-9]*$/u,
  snake: /^\p{Ll}[\p{Ll}0-9]*(?:_[\p{Ll}0-9]+)*$/u,
  upperSnake: /^\p{Lu}[\p{Lu}0-9]*(?:_[\p{Lu}0-9]+)*$/u,
};

const LABELS: Record<VariableCaseStyle, string> = {
  camel: 'camelCase',
  pascal: 'PascalCase',
  snake: 'snake_case',
  upperSnake: 'UPPER_SNAKE_CASE',
};

export const variableCase: Rule<VariableCaseOptions, 'variable-case'> = {
  id: 'variable-case',
  defaultSeverity: 'warning',
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
        range: tokenRange(next),
        message: `Variable '${next.image}' should be written in ${LABELS[style]}.`,
      });
    }

    return out;
  },
};
