import { lint, format } from '../src/index.js';
import type { Diagnostic, FormatResult, LintConfig, RuleConfigEntry, Rule } from '../src/index.js';

/*
 * Rule is invariant in O, so the test helpers accept any
 * rule regardless of its option type.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyRule = Rule<any, string>;

function entry(rule: AnyRule, options?: object): RuleConfigEntry {
  return options === undefined ? rule.defaultSeverity : [rule.defaultSeverity, options];
}

function configFor(rules: readonly AnyRule[]): LintConfig {
  return { rules: Object.fromEntries(rules.map((rule) => [rule.id, rule.defaultSeverity])) } as LintConfig;
}

/** Lint `source` with a single rule enabled at its default severity (optionally with options). */
export function lintRule(source: string, rule: AnyRule, options?: object): Diagnostic[] {
  return lint(source, { rules: { [rule.id]: entry(rule, options) } } as LintConfig);
}

/** Format `source` with a single rule enabled at its default severity (optionally with options). */
export function formatRule(source: string, rule: AnyRule, options?: object): FormatResult {
  return format(source, { rules: { [rule.id]: entry(rule, options) } } as LintConfig);
}

/** Lint `source` with several rules enabled at their default severities. */
export function lintRules(source: string, rules: readonly AnyRule[]): Diagnostic[] {
  return lint(source, configFor(rules));
}

/** Format `source` with several rules enabled at their default severities. */
export function formatRules(source: string, rules: readonly AnyRule[]): FormatResult {
  return format(source, configFor(rules));
}
