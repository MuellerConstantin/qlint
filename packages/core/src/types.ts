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

export type Finding = Omit<Diagnostic, 'ruleId'>;

export interface RuleContext {
  tokens: IToken[];
  firstOnLine: IToken[];
}

export interface Rule<O = undefined, Id extends string = string> {
  id: Id;
  defaultOptions?: O;
  check(ctx: RuleContext, options: O): Finding[];
}
