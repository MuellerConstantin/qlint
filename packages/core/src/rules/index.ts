import type { Rule } from '../types.js';
export type { CaseStyle, CaseRuleOptions } from './types';
import { builtinFunctionCase } from './builtinFunctionCase.js';
import { builtinKeywordCase } from './builtinKeywordCase.js';
import { noLegacyPathVariables } from './noLegacyPathVariables.js';
import { oneStatementPerLine } from './oneStatementPerLine.js';
import { tableLabelBrackets } from './tableLabelBrackets.js';
import { variableCase } from './variableCase.js';
export type { LineEnding, OneStatementPerLineOptions } from './oneStatementPerLine.js';
export type { VariableCaseStyle, VariableCaseOptions } from './variableCase.js';

export function configure<O, Id extends string>(rule: Rule<O, Id>, options: Partial<O>): Rule<O, Id> {
  return {
    ...rule,
    defaultOptions: { ...(rule.defaultOptions as object), ...(options as object) } as O,
  };
}

export const recommended = [
  tableLabelBrackets,
  builtinFunctionCase,
  builtinKeywordCase,
  noLegacyPathVariables,
  oneStatementPerLine,
  variableCase,
] as const;

export {
  builtinFunctionCase,
  builtinKeywordCase,
  noLegacyPathVariables,
  oneStatementPerLine,
  tableLabelBrackets,
  variableCase,
};
