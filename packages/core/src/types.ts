import type { IToken } from 'chevrotain';

/** How serious a diagnostic is. */
export type Severity = 'error' | 'warning' | 'info';

/** A 1-based line/column location in the source. */
export interface Position {
  line: number;
  column: number;
}

/** A span between two {@link Position}s; `end` is exclusive. */
export interface Range {
  start: Position;
  end: Position;
}

/**
 * An autofix: replaces the source between the byte offsets `range.start` and
 * `range.end` (0-based, end-exclusive) with `replacement`.
 */
export interface Fix {
  range: { start: number; end: number };
  replacement: string;
}

/**
 * A single lint result: which rule fired (`ruleId`), how serious it is
 * (`severity`), where (`range`), a human-readable `message`, and an optional
 * {@link Fix} when the violation can be auto-corrected.
 */
export interface Diagnostic {
  ruleId: string;
  severity: Severity;
  range: Range;
  message: string;
  fix?: Fix;
}

export type Finding = Omit<Diagnostic, 'ruleId' | 'severity'>;

export interface RuleContext {
  source: string;
  tokens: IToken[];
  firstOnLine: IToken[];
  comments: IToken[];
}

export interface Rule<O = undefined, Id extends string = string> {
  id: Id;
  defaultSeverity: Severity;
  defaultOptions?: O;
  check(ctx: RuleContext, options: O): Finding[];
}

/** A {@link Severity}, or `'off'` to disable a rule in a config entry. */
export type SeverityOrOff = Severity | 'off';

/**
 * A rule's entry in `config.rules`: a bare severity (`'error'`), a
 * single-element tuple (`['warning']`), or — for rules with options — a
 * `[severity, options]` tuple (`['error', { max: 100 }]`).
 */
export type RuleConfigEntry<O = unknown> = [O] extends [undefined]
  ? SeverityOrOff | [SeverityOrOff]
  : SeverityOrOff | [SeverityOrOff] | [SeverityOrOff, Partial<O>];

/*
 * Rule is invariant in O, so heterogeneous rule tuples can
 * only share a common element type via `any`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyRule = Rule<any, string>;

export type RulesConfigOf<R extends readonly AnyRule[]> = {
  [I in R[number]['id']]?: RuleConfigEntry<Extract<R[number], { id: I }> extends Rule<infer O, string> ? O : never>;
};

/**
 * The result of {@link format}: the fixed `output`, the `diagnostics` that remain
 * after fixing (i.e. those without an autofix), and `fixed`, the number of fixes
 * applied across all passes.
 */
export interface FormatResult {
  output: string;
  diagnostics: Diagnostic[];
  fixed: number;
}
