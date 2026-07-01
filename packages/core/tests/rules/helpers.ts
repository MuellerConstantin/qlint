import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Diagnostic, Rule } from '../../src/index.js';
import { lintRule } from '../support.js';

const FIXTURES = join(import.meta.dirname, 'fixtures');

/*
 * Rule is invariant in O, so the helper has to accept any
 * rule regardless of its option type.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lintFixture<R extends Rule<any, string>>(
  kind: 'violation' | 'clean',
  rule: R,
  options?: object,
): Diagnostic[] {
  const source = readFileSync(join(FIXTURES, rule.id, `${kind}.qvs`), 'utf8');
  return lintRule(source, rule, options);
}
