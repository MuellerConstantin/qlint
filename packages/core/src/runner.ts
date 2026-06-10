import type { IToken } from 'chevrotain';
import { lexer } from './lexer.js';
import type { Rule, Range, Fix, Severity, Diagnostic, RuleContext } from './types.js';

export function tokenRange(token: IToken): Range {
  return {
    start: { line: token.startLine ?? 1, column: token.startColumn ?? 1 },
    end: { line: token.endLine ?? token.startLine ?? 1, column: (token.endColumn ?? token.startColumn ?? 1) + 1 },
  };
}

export function tokenFix(token: IToken, replacement: string): Fix {
  return {
    range: { start: token.startOffset, end: (token.endOffset ?? token.startOffset) + 1 },
    replacement,
  };
}

function firstTokenPerLine(tokens: IToken[]): IToken[] {
  const seen = new Set<number>();
  const out: IToken[] = [];

  for (const token of tokens) {
    const line = token.startLine ?? 0;

    if (!seen.has(line)) {
      seen.add(line);
      out.push(token);
    }
  }

  return out;
}

export type SeverityOrOff = Severity | 'off';

export type RuleConfigEntry<O = unknown> = [O] extends [undefined]
  ? SeverityOrOff | [SeverityOrOff]
  : SeverityOrOff | [SeverityOrOff] | [SeverityOrOff, Partial<O>];

/*
 * Rule is invariant in O, so heterogeneous rule tuples can
 * only share a common element type via `any`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRule = Rule<any, string>;

export type RulesConfigOf<R extends readonly AnyRule[]> = {
  [I in R[number]['id']]?: RuleConfigEntry<Extract<R[number], { id: I }> extends Rule<infer O, string> ? O : never>;
};

export interface LintConfig<R extends readonly AnyRule[] = readonly AnyRule[]> {
  rules?: RulesConfigOf<R>;
}

export interface FormatResult {
  output: string;
  diagnostics: Diagnostic[];
  fixed: number;
}

const MAX_PASSES = 10;

function parseEntry(entry: RuleConfigEntry<unknown> | undefined): {
  severity?: SeverityOrOff;
  options?: unknown;
} {
  if (entry === undefined) {
    return {};
  }

  if (typeof entry === 'string') {
    return { severity: entry };
  }

  return { severity: entry[0], options: entry[1] };
}

export function lint<R extends readonly AnyRule[]>(source: string, rules: R, config: LintConfig<R> = {}): Diagnostic[] {
  const result = lexer.tokenize(source);

  const ctx: RuleContext = {
    tokens: result.tokens,
    firstOnLine: firstTokenPerLine(result.tokens),
  };

  const out: Diagnostic[] = [];
  const rulesMap = config.rules as Record<string, RuleConfigEntry<unknown> | undefined> | undefined;

  for (const rule of rules) {
    const { severity: configSeverity, options: configOptions } = parseEntry(rulesMap?.[rule.id]);

    if (configSeverity === 'off') {
      continue;
    }

    const ruleOptions = mergeOptions(rule.defaultOptions, configOptions);

    for (const findings of (rule as Rule<unknown>).check(ctx, ruleOptions)) {
      out.push({ ruleId: rule.id, ...findings, severity: configSeverity ?? findings.severity });
    }
  }

  return out.sort((a, b) => a.range.start.line - b.range.start.line || a.range.start.column - b.range.start.column);
}

function mergeOptions(defaults: unknown, override: unknown): unknown {
  if (defaults && typeof defaults === 'object' && override && typeof override === 'object') {
    return { ...defaults, ...override };
  }

  return override ?? defaults;
}

function applyFixes(source: string, fixes: Fix[]): { output: string; applied: number } {
  const sorted = [...fixes].sort((a, b) => b.range.start - a.range.start);
  const accepted: Fix[] = [];
  let lastStart = Number.POSITIVE_INFINITY;

  for (const fix of sorted) {
    if (fix.range.end > lastStart) {
      continue;
    }
    accepted.push(fix);
    lastStart = fix.range.start;
  }

  let output = source;

  for (const fix of accepted) {
    output = output.slice(0, fix.range.start) + fix.replacement + output.slice(fix.range.end);
  }

  return { output, applied: accepted.length };
}

export function format<R extends readonly AnyRule[]>(
  source: string,
  rules: R,
  config: LintConfig<R> = {},
): FormatResult {
  let current = source;
  let totalFixed = 0;

  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const diagnostics = lint(current, rules, config);
    const fixes = diagnostics.map((diagnostic) => diagnostic.fix).filter((fix): fix is Fix => fix !== undefined);

    if (fixes.length === 0) {
      return { output: current, diagnostics, fixed: totalFixed };
    }

    const { output, applied } = applyFixes(current, fixes);

    if (applied === 0) {
      return { output: current, diagnostics, fixed: totalFixed };
    }

    current = output;
    totalFixed += applied;
  }

  const finalDiagnostics = lint(current, rules, config);
  const remainingFixes = finalDiagnostics.filter((diagnostic) => diagnostic.fix !== undefined);

  if (remainingFixes.length > 0) {
    throw new Error(`autofix did not converge after ${MAX_PASSES} passes`);
  }

  return { output: current, diagnostics: finalDiagnostics, fixed: totalFixed };
}
