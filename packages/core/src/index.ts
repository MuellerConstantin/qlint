export { lint, format } from './runner.js';
export type { Diagnostic, Rule, Severity, Fix } from './types.js';
export type {
  LintConfig,
  RulesConfigOf,
  RuleConfigEntry,
  SeverityOrOff,
  FormatResult,
} from './runner.js';
export {
  recommended,
  tableLabelBrackets,
  blockIndent,
  builtinFunctionCase,
  builtinKeywordCase,
  commentSpace,
  noLegacyPathVariables,
  noMultipleEmptyLines,
  trailingWhitespace,
  variableCase,
  configure,
} from './rules/index.js';
export type {
  BlockIndentOptions,
  CaseStyle,
  CaseRuleOptions,
  IndentStyle,
  NoMultipleEmptyLinesOptions,
  VariableCaseStyle,
  VariableCaseOptions,
} from './rules/index.js';
