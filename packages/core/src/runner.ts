import type { IToken } from 'chevrotain';
import { collectDisabledLines, isDisabled } from './disableDirectives.js';
import { COMMENT_GROUP, lexer } from './lexer.js';
import { registry } from './rules/index.js';
import type { LintConfig } from './rules/index.js';
import type { Rule, Fix, Diagnostic, RuleContext, RuleConfigEntry, SeverityOrOff, FormatResult } from './types.js';

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

export function lint(source: string, config: LintConfig): Diagnostic[] {
  const result = lexer.tokenize(source);

  const ctx: RuleContext = {
    source,
    tokens: result.tokens,
    firstOnLine: firstTokenPerLine(result.tokens),
    comments: result.groups[COMMENT_GROUP] ?? [],
  };

  const disabled = collectDisabledLines(source);
  const out: Diagnostic[] = [];
  const rulesConfig = config.rules as Record<string, RuleConfigEntry<unknown> | undefined> | undefined;

  if (!rulesConfig) {
    return out;
  }

  for (const [ruleId, entry] of Object.entries(rulesConfig)) {
    const { severity: configSeverity, options: configOptions } = parseEntry(entry);

    if (configSeverity === 'off') {
      continue;
    }

    const rule = registry.get(ruleId);

    if (!rule) {
      throw new Error(`Unknown rule "${ruleId}".`);
    }

    const ruleOptions = mergeOptions(rule.defaultOptions, configOptions);

    for (const findings of (rule as Rule<unknown>).check(ctx, ruleOptions)) {
      if (isDisabled(disabled, findings.range.start.line, rule.id)) {
        continue;
      }

      out.push({ ruleId: rule.id, ...findings, severity: configSeverity ?? rule.defaultSeverity });
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

export function applyFixes(source: string, fixes: Fix[]): { output: string; applied: number } {
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

/**
 * Runs the multi-pass autofix loop against an arbitrary diagnostic producer.
 * The public {@link format} binds this to {@link lint}; keeping it rule-agnostic
 * lets the convergence machinery be exercised in isolation.
 */
export function runFormatLoop(source: string, run: (src: string) => Diagnostic[]): FormatResult {
  let current = source;
  let totalFixed = 0;

  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const diagnostics = run(current);
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

  const finalDiagnostics = run(current);
  const remainingFixes = finalDiagnostics.filter((diagnostic) => diagnostic.fix !== undefined);

  if (remainingFixes.length > 0) {
    throw new Error(`autofix did not converge after ${MAX_PASSES} passes`);
  }

  return { output: current, diagnostics: finalDiagnostics, fixed: totalFixed };
}

export function format(source: string, config: LintConfig): FormatResult {
  return runFormatLoop(source, (src) => lint(src, config));
}
