import { systemVariableToken } from '../lexer.js';
import type { Rule, Finding } from '../types.js';
import { tokenRange } from '../runner.js';

const LEGACY_PATH_VARIABLES = new Set([
  'cd',
  'floppy',
  'qvpath',
  'qvroot',
  'qvworkpath',
  'qvworkroot',
  'winpath',
  'winroot',
]);

export const noLegacyPathVariables: Rule<undefined, 'no-legacy-path-variables'> = {
  id: 'no-legacy-path-variables',
  check: ({ tokens }) => {
    const out: Finding[] = [];

    for (const token of tokens) {
      if (token.tokenType !== systemVariableToken) {
        continue;
      }

      if (!LEGACY_PATH_VARIABLES.has(token.image.toLowerCase())) {
        continue;
      }

      out.push({
        severity: 'error',
        range: tokenRange(token),
        message: `'${token.image}' is a legacy QlikView-era system variable; use a lib:// data connection instead.`,
      });
    }

    return out;
  },
};
