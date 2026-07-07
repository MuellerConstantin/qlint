import type { Rule, Finding, RuleContext } from '../types.js';
import type { IndentStyle } from './block-indent.js';

export type { IndentStyle } from './block-indent.js';

export interface IndentCharOptions {
  style: IndentStyle;
}

/*
 * Enforces the *character* used for indentation, orthogonally to how much.
 * `block-indent` and `load-indent` own the indentation width, but only on the
 * lines they check (statement/field/clause starts); continuation lines inside
 * a wrapped expression, a multi-line condition, or a `&`-chain keep whatever
 * amount the author chose and are therefore never inspected. Their leading
 * whitespace can still silently drift to the wrong character (a stray tab in a
 * space-indented file, or a tab/space mix). This rule closes that gap: every
 * tokenized line's leading whitespace must consist solely of the configured
 * indent character, whatever its length.
 *
 * Scope note: the check keys off the first *code* token of each line, so lines
 * that carry no token of their own — the interior of a multi-line comment, a
 * multi-line string, or an `Inline [...]` data block (all single tokens) — are
 * left untouched, matching how `load-indent` already treats them.
 */
export const indentChar: Rule<IndentCharOptions, 'indent-char'> = {
  id: 'indent-char',
  defaultSeverity: 'warning',
  defaultOptions: { style: 'space' },
  check: ({ source, firstOnLine }: RuleContext, { style }): Finding[] => {
    const wanted = style === 'tab' ? '\t' : ' ';
    const unitLabel = style === 'tab' ? 'tab' : 'space';
    const out: Finding[] = [];

    for (const token of firstOnLine) {
      const line = token.startLine ?? 1;
      const lineStart = token.startOffset - ((token.startColumn ?? 1) - 1);

      let i = lineStart;
      let hasWrongChar = false;

      while (i < source.length && (source[i] === ' ' || source[i] === '\t')) {
        if (source[i] !== wanted) {
          hasWrongChar = true;
        }
        i++;
      }

      if (!hasWrongChar) {
        continue;
      }

      /*
       * No autofix: the correct replacement width is precisely the amount
       * this rule refuses to have an opinion on. Swapping a tab for `n`
       * spaces (or vice versa) would guess a level width and risk fighting
       * the indent rules — or mangling deliberate alignment on a continuation
       * line. The offending line is reported for the author to resolve.
       */
      out.push({
        range: {
          start: { line, column: 1 },
          end: { line, column: i - lineStart + 1 },
        },
        message: `Leading whitespace must use only ${unitLabel}s.`,
      });
    }

    return out;
  },
};
