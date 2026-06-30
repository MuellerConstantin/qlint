# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/2.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Tokenizer for Qlik load script built on Chevrotain, covering keywords, builtin
  functions, variables, comments, string literals, and the LOAD/SELECT statement
  surface.
- `lint(source, rules, config?)` API that runs a rule set over a script and
  returns structured `Diagnostic` objects (severity, range, ruleId, message).
- `format(source, rules, config?)` API that applies autofixes in successive
  passes until the output stabilizes, returning the formatted source, remaining
  diagnostics, and a fix count.
- `validateConfig(value, sourceLabel?)` API that validates an arbitrary
  JSON-parsed value against the `LintConfig` shape and returns it typed,
  throwing readable errors for invalid severities and malformed rule entries.
  The optional `sourceLabel` is interpolated into error messages so host
  integrations (CLI, browser, IDE) can point users at the offending source.
- Initial rule set covering layout (`block-indent`, `load-indent`,
  `load-clause-newline`, `load-field-per-line`, `multiline-call`,
  `one-statement-per-line`, `max-line-length`, `no-multiple-empty-lines`,
  `trailing-whitespace`), casing (`builtin-function-case`,
  `builtin-keyword-case`, `variable-case`), spacing (`comma-space`,
  `comment-space`, `inline-comment-space`, `block-comment-stars`), and
  correctness (`no-legacy-path-variables`, `table-label-brackets`,
  `variable-charset`).
- `recommended` preset bundling the default rule selection and severities.
- `allRules` export listing every rule shipped with Core. Host integrations (CLI,
  browser, IDE) can enumerate the full rule catalog.
- `configure(rule, options)` helper for per-rule option overrides without
  re-implementing the rule.
- Inline disable directives (`// qlint-disable`, `// qlint-disable-next-line`,
  `// qlint-disable-line`) for opting individual lines or blocks out of
  linting.
- Public TypeScript types: `Diagnostic`, `Rule`, `Severity`, `Fix`,
  `LintConfig`, `RulesConfigOf`, `RuleConfigEntry`, `SeverityOrOff`,
  `FormatResult`, and per-rule option types.
