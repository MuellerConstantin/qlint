import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { lint, type Diagnostic, type LintOptions, type Rule } from '../src/index.js';

const FIXTURES = join(import.meta.dirname, 'fixtures');

export function lintFixture(
  ruleId: string,
  kind: 'violation' | 'clean',
  rule: Rule<unknown>,
  opts?: LintOptions,
): Diagnostic[] {
  const source = readFileSync(join(FIXTURES, ruleId, `${kind}.qvs`), 'utf8');
  return lint(source, [rule], opts);
}
