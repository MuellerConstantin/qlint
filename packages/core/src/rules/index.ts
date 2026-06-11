import type { Rule } from '../types.js';
export type { CaseStyle, CaseRuleOptions } from './types';
import { blockIndent } from './blockIndent.js';
import { builtinFunctionCase } from './builtinFunctionCase.js';
import { builtinKeywordCase } from './builtinKeywordCase.js';
import { maxLineLength } from './maxLineLength.js';
import { noLegacyPathVariables } from './noLegacyPathVariables.js';
import { oneStatementPerLine } from './oneStatementPerLine.js';
import { tableLabelBrackets } from './tableLabelBrackets.js';
import { variableCase } from './variableCase.js';
import { variableCharset } from './variableCharset.js';
export type { BlockIndentOptions, IndentStyle } from './blockIndent.js';
export type { MaxLineLengthOptions } from './maxLineLength.js';
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
  blockIndent,
  builtinFunctionCase,
  builtinKeywordCase,
  maxLineLength,
  noLegacyPathVariables,
  oneStatementPerLine,
  variableCase,
  variableCharset,
] as const;

export {
  blockIndent,
  builtinFunctionCase,
  builtinKeywordCase,
  maxLineLength,
  noLegacyPathVariables,
  oneStatementPerLine,
  tableLabelBrackets,
  variableCase,
  variableCharset,
};
