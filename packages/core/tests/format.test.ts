import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { format, type Diagnostic, type Fix } from '../src/index.js';
import { applyFixes, runFormatLoop } from '../src/runner.js';
import { tableLabelBrackets, builtinFunctionCase, builtinKeywordCase, recommended } from '../src/rules/index.js';
import { formatRule } from './support.js';

const FIXTURES = join(import.meta.dirname, 'rules', 'fixtures');

function readFixture(ruleId: string, kind: 'violation' | 'clean'): string {
  return readFileSync(join(FIXTURES, ruleId, `${kind}.qvs`), 'utf8');
}

describe('format', () => {
  describe('per-rule fixing', () => {
    it('rewrites unbracketed table labels into the bracketed form', () => {
      const violation = readFixture('table-label-brackets', 'violation');
      const expected = readFixture('table-label-brackets', 'clean');

      const result = formatRule(violation, tableLabelBrackets);

      expect(result.output).toBe(expected);
      expect(result.fixed).toBe(1);
      expect(result.diagnostics).toEqual([]);
    });

    it('rewrites built-in functions to canonical case', () => {
      const violation = readFixture('builtin-function-case', 'violation');
      const expected = readFixture('builtin-function-case', 'clean');

      const result = formatRule(violation, builtinFunctionCase);

      expect(result.output).toBe(expected);
      expect(result.fixed).toBe(1);
      expect(result.diagnostics).toEqual([]);
    });

    it('rewrites keywords to canonical case', () => {
      const violation = readFixture('builtin-keyword-case', 'violation');
      const expected = readFixture('builtin-keyword-case', 'clean');

      const result = formatRule(violation, builtinKeywordCase);

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

    it('formats identically whether the preset is named or passed as the object', () => {
      const violation = readFixture('table-label-brackets', 'violation');

      const byName = format(violation, { presets: 'recommended' });
      const byObject = format(violation, recommended);

      expect(byName.output).toBe(byObject.output);
    });
  });

  describe('overlapping fixes', () => {
    it('applies only the first of two overlapping fixes within a single pass', () => {
      const fixA: Fix = { range: { start: 0, end: 3 }, replacement: 'XXX' };
      const fixB: Fix = { range: { start: 1, end: 4 }, replacement: 'YYY' };

      const { output, applied } = applyFixes('abcdef', [fixA, fixB]);

      expect(['XXXdef', 'aYYYef']).toContain(output);
      expect(applied).toBe(1);
    });
  });

  describe('multi-pass convergence', () => {
    /** Diagnostic producer that rewrites the whole source A -> B -> C, one step per pass. */
    function chain(src: string): Diagnostic[] {
      const replacement = src === 'A' ? 'B' : src === 'B' ? 'C' : null;

      if (replacement === null) {
        return [];
      }

      return [
        {
          ruleId: 'chain',
          severity: 'warning',
          range: { start: { line: 1, column: 1 }, end: { line: 1, column: 2 } },
          message: `replace ${src}`,
          fix: { range: { start: 0, end: src.length }, replacement },
        },
      ];
    }

    it('iterates until no more fixes are produced', () => {
      const result = runFormatLoop('A', chain);

      expect(result.output).toBe('C');
      expect(result.fixed).toBe(2);
    });

    it('throws when fixes never stabilize', () => {
      const flip = (src: string): Diagnostic[] => {
        const replacement = src === 'A' ? 'B' : src === 'B' ? 'A' : null;

        if (replacement === null) {
          return [];
        }

        return [
          {
            ruleId: 'flip',
            severity: 'warning',
            range: { start: { line: 1, column: 1 }, end: { line: 1, column: 2 } },
            message: `flip ${src}`,
            fix: { range: { start: 0, end: src.length }, replacement },
          },
        ];
      };

      expect(() => runFormatLoop('A', flip)).toThrow(/did not converge/);
    });
  });
});
