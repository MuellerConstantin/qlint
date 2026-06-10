import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { lint, type Diagnostic, type LintConfig, type Rule } from '../src/index.js';

const FIXTURES = join(import.meta.dirname, 'fixtures');

/*
 * Rule is invariant in O, so the helper has to accept any
 * rule regardless of its option type.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lintFixture<R extends Rule<any, string>>(
  ruleId: string,
  kind: 'violation' | 'clean',
  rule: R,
  config?: LintConfig<readonly [R]>,
): Diagnostic[] {
  const source = readFileSync(join(FIXTURES, ruleId, `${kind}.qvs`), 'utf8');
  return lint(source, [rule] as const, config);
}
