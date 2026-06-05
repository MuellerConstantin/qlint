import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { format, type Rule } from '../src/index.js';
import { tableLabelBrackets, builtinFunctionCase, recommended } from '../src/rules.js';

const FIXTURES = join(import.meta.dirname, 'fixtures');

function readFixture(ruleId: string, kind: 'violation' | 'clean'): string {
  return readFileSync(join(FIXTURES, ruleId, `${kind}.qvs`), 'utf8');
}

describe('format', () => {
  describe('per-rule fixing', () => {
    it('rewrites unbracketed table labels into the bracketed form', () => {
      const violation = readFixture('table-label-brackets', 'violation');
      const expected = readFixture('table-label-brackets', 'clean');

      const result = format(violation, [tableLabelBrackets]);

      expect(result.output).toBe(expected);
      expect(result.fixed).toBe(1);
      expect(result.diagnostics).toEqual([]);
    });

    it('rewrites built-in functions to canonical case', () => {
      const violation = readFixture('builtin-function-case', 'violation');
      const expected = readFixture('builtin-function-case', 'clean');

      const result = format(violation, [builtinFunctionCase]);

      expect(result.output).toBe(expected);
      expect(result.fixed).toBe(1);
      expect(result.diagnostics).toEqual([]);
    });
  });

  describe('idempotence', () => {
    it('produces no further changes when re-run on already-fixed output', () => {
      const violation = readFixture('table-label-brackets', 'violation');

      const first = format(violation, recommended);
      const second = format(first.output, recommended);

      expect(second.output).toBe(first.output);
      expect(second.fixed).toBe(0);
    });
  });

  describe('overlapping fixes', () => {
    it('applies only the first of two overlapping fixes within a single pass', () => {
      const source = 'abcdef';
      const ruleA: Rule = {
        id: 'rule-a',
        check: ({ tokens }) => {
          if (tokens[0]?.image !== 'abcdef') {
            return [];
          }
          return [
            {
              severity: 'warning',
              range: { start: { line: 1, column: 1 }, end: { line: 1, column: 4 } },
              message: 'a',
              fix: { range: { start: 0, end: 3 }, replacement: 'XXX' },
            },
          ];
        },
      };
      const ruleB: Rule = {
        id: 'rule-b',
        check: ({ tokens }) => {
          if (tokens[0]?.image !== 'abcdef') {
            return [];
          }
          return [
            {
              severity: 'warning',
              range: { start: { line: 1, column: 2 }, end: { line: 1, column: 5 } },
              message: 'b',
              fix: { range: { start: 1, end: 4 }, replacement: 'YYY' },
            },
          ];
        },
      };

      const result = format(source, [ruleA, ruleB]);

      const possibleOutputs = ['XXXdef', 'aYYYef'];
      expect(possibleOutputs).toContain(result.output);
      expect(result.fixed).toBe(1);
    });
  });

  describe('multi-pass convergence', () => {
    it('iterates until no more fixes are produced', () => {
      const chainRule: Rule = {
        id: 'chain',
        check: ({ tokens }) => {
          const out = [];
          for (const token of tokens) {
            const replacement = token.image === 'A' ? 'B' : token.image === 'B' ? 'C' : null;
            if (replacement) {
              out.push({
                severity: 'warning' as const,
                range: { start: { line: 1, column: 1 }, end: { line: 1, column: 2 } },
                message: `replace ${token.image}`,
                fix: { range: { start: token.startOffset, end: (token.endOffset ?? token.startOffset) + 1 }, replacement },
              });
            }
          }
          return out;
        },
      };

      const result = format('A', [chainRule]);

      expect(result.output).toBe('C');
      expect(result.fixed).toBe(2);
    });

    it('throws when fixes never stabilize', () => {
      const flipRule: Rule = {
        id: 'flip',
        check: ({ tokens }) => {
          const out = [];
          for (const token of tokens) {
            const replacement = token.image === 'A' ? 'B' : token.image === 'B' ? 'A' : null;
            if (replacement) {
              out.push({
                severity: 'warning' as const,
                range: { start: { line: 1, column: 1 }, end: { line: 1, column: 2 } },
                message: `flip ${token.image}`,
                fix: { range: { start: token.startOffset, end: (token.endOffset ?? token.startOffset) + 1 }, replacement },
              });
            }
          }
          return out;
        },
      };

      expect(() => format('A', [flipRule])).toThrow(/did not converge/);
    });
  });
});
