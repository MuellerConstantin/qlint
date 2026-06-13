import type { Rule } from '../types.js';
export type { CaseStyle, CaseRuleOptions } from './types';
import { blockCommentStars } from './block-comment-stars.js';
import { blockIndent } from './block-indent.js';
import { builtinFunctionCase } from './builtin-function-case.js';
import { builtinKeywordCase } from './builtin-keyword-case.js';
import { commentSpace } from './comment-space.js';
import { maxLineLength } from './max-line-length.js';
import { noLegacyPathVariables } from './no-legacy-path-variables.js';
import { noMultipleEmptyLines } from './no-multiple-empty-lines.js';
import { oneStatementPerLine } from './one-statement-per-line.js';
import { tableLabelBrackets } from './table-label-brackets.js';
import { trailingWhitespace } from './trailing-whitespace.js';
import { variableCase } from './variable-case.js';
import { variableCharset } from './variable-charset.js';
export type { BlockIndentOptions, IndentStyle } from './block-indent.js';
export type { MaxLineLengthOptions } from './max-line-length.js';
export type { NoMultipleEmptyLinesOptions } from './no-multiple-empty-lines.js';
export type { LineEnding, OneStatementPerLineOptions } from './one-statement-per-line.js';
export type { VariableCaseStyle, VariableCaseOptions } from './variable-case.js';

export function configure<O, Id extends string>(rule: Rule<O, Id>, options: Partial<O>): Rule<O, Id> {
  return {
    ...rule,
    defaultOptions: { ...(rule.defaultOptions as object), ...(options as object) } as O,
  };
}

export const recommended = [
  tableLabelBrackets,
  blockCommentStars,
  blockIndent,
  builtinFunctionCase,
  builtinKeywordCase,
  commentSpace,
  maxLineLength,
  noLegacyPathVariables,
  noMultipleEmptyLines,
  oneStatementPerLine,
  trailingWhitespace,
  variableCase,
  variableCharset,
] as const;

export {
  blockCommentStars,
  blockIndent,
  builtinFunctionCase,
  builtinKeywordCase,
  commentSpace,
  maxLineLength,
  noLegacyPathVariables,
  noMultipleEmptyLines,
  oneStatementPerLine,
  tableLabelBrackets,
  trailingWhitespace,
  variableCase,
  variableCharset,
};
