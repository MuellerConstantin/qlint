import type { Rule } from '../types.js';
export type { CaseStyle, CaseRuleOptions } from './types';
import { builtinFunctionCase } from './builtinFunctionCase.js';
import { builtinKeywordCase } from './builtinKeywordCase.js';
import { noLegacyPathVariables } from './noLegacyPathVariables.js';
import { tableLabelBrackets } from './tableLabelBrackets.js';

export function configure<O>(rule: Rule<O>, options: Partial<O>): Rule<O> {
  return {
    ...rule,
    defaultOptions: { ...(rule.defaultOptions as object), ...(options as object) } as O,
  };
}

export const recommended: Rule<unknown>[] = [
  tableLabelBrackets,
  builtinFunctionCase,
  builtinKeywordCase,
  noLegacyPathVariables,
];

export { builtinFunctionCase, builtinKeywordCase, noLegacyPathVariables, tableLabelBrackets };
