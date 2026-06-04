import type { IToken } from 'chevrotain';
import { lexer } from './lexer.js';

export type Severity = 'error' | 'warning' | 'info';

export interface Position {
  line: number;
  column: number;
}

export interface Range {
  start: Position;
  end: Position;
}

export interface Diagnostic {
  ruleId: string;
  severity: Severity;
  range: Range;
  message: string;
}

export type Finding = Omit<Diagnostic, 'ruleId'>;

export interface RuleContext {
  tokens: IToken[];
  firstOnLine: IToken[];
}

export interface Rule {
  id: string;
  check: (ctx: RuleContext) => Finding[];
}

export function tokenRange(token: IToken): Range {
  return {
    start: { line: token.startLine ?? 1, column: token.startColumn ?? 1 },
    end: { line: token.endLine ?? token.startLine ?? 1, column: (token.endColumn ?? token.startColumn ?? 1) + 1 },
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

export interface LintOptions {
  severity?: Record<string, Severity | 'off'>;
}

export function lint(source: string, rules: Rule[], opts: LintOptions = {}): Diagnostic[] {
  const result = lexer.tokenize(source);

  const ctx: RuleContext = {
    tokens: result.tokens,
    firstOnLine: firstTokenPerLine(result.tokens),
  };

  const out: Diagnostic[] = [];

  for (const rule of rules) {
    const override = opts.severity?.[rule.id];

    if (override === 'off') {
      continue;
    }

    for (const findings of rule.check(ctx)) {
      out.push({ ruleId: rule.id, ...findings, severity: override ?? findings.severity });
    }
  }

  return out.sort((a, b) => a.range.start.line - b.range.start.line || a.range.start.column - b.range.start.column);
}
