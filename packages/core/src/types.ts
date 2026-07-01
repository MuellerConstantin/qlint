import type { IToken } from 'chevrotain';

export type Severity = 'error' | 'warning' | 'info';

export interface Position {
  line: number;
  column: number;
}

export interface Range {
  start: Position;
  end: Position;
}

export interface Fix {
  range: { start: number; end: number };
  replacement: string;
}

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

export type SeverityOrOff = Severity | 'off';

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

export interface FormatResult {
  output: string;
  diagnostics: Diagnostic[];
  fixed: number;
}
