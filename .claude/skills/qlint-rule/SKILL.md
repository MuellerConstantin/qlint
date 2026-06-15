---
name: qlint-rule
description: Add, modify, rename, or remove a qlint lint rule in packages/core. Use whenever the user asks to "add a rule", "create a new lint rule", "modify the X rule", "rename a rule", "remove a rule", "add an autofix to X", or otherwise edits files under packages/core/src/rules/. Enforces the rule file shape, the test+fixture layout, the four-step registration in rules/index.ts, the docs entry in packages/core/docs/rules.md, and protects the public rule contract from accidental changes.
---

# qlint-rule

Scaffold and maintain qlint lint rules consistently across rule file, registration,
tests, fixtures, and docs. The rule contract is a public API the CLI and the Chrome
extension depend on — keep it stable.

## When to use

- Adding a new rule.
- Modifying an existing rule's logic, message, severity, options, or fix.
- Renaming a rule (id, file, export, test, fixture dir, docs section all change).
- Removing a rule.
- Adding or removing an autofix on an existing rule.

## Naming contract

For a rule named `my-rule`, all five identifiers share the same kebab-case stem:

| Artifact          | Path / name                                   |
| ----------------- | --------------------------------------------- |
| Rule file         | `packages/core/src/rules/my-rule.ts`          |
| Exported binding  | `myRule` (camelCase)                          |
| Rule id literal   | `'my-rule'`                                   |
| Test file         | `packages/core/tests/rules/my-rule.test.ts`   |
| Fixture directory | `packages/core/tests/rules/fixtures/my-rule/` |

## Public contract — do not edit

A new or modified rule must **never** edit these files:

- `packages/core/src/types.ts` — `Rule`, `RuleContext`, `Finding`, `Diagnostic`, `Fix`, `Range`, `Severity`, `Position`.
- `packages/core/src/runner.ts` — `lint`, `format`, `tokenRange`, `tokenFix`, `LintConfig`, `FormatResult`.
- `packages/core/src/disableDirectives.ts` — disable wiring is automatic; rules need no participation.

If a rule appears to need a change in one of these files, **stop and confirm with
the user first**. State which downstream consumer (CLI, Chrome extension) is
affected and why the rule's own `options` type cannot cover the need. Do not edit
these files without explicit approval.

## Anatomy of a rule

The contract from [types.ts](../../../packages/core/src/types.ts):

```ts
interface Rule<O = undefined, Id extends string = string> {
  id: Id;
  defaultOptions?: O;
  check(ctx: RuleContext, options: O): Finding[];
}

interface RuleContext {
  source: string;
  tokens: IToken[];
  firstOnLine: IToken[];
  comments: IToken[];
}

type Finding = Omit<Diagnostic, 'ruleId'>; // severity, range, message, fix?
```

Helpers in [runner.ts](../../../packages/core/src/runner.ts):

- `tokenRange(token)` — converts a chevrotain `IToken` to a `Range`.
- `tokenFix(token, replacement)` — `Fix` that replaces a single token.

### Template: rule without options, with autofix

```ts
import type { Rule, Finding } from '../types.js';

export const myRule: Rule<undefined, 'my-rule'> = {
  id: 'my-rule',
  defaultOptions: undefined,
  check: ({ source }) => {
    const out: Finding[] = [];

    // ... detect violations, push Findings ...
    out.push({
      severity: 'warning',
      range: { start: { line: 1, column: 1 }, end: { line: 1, column: 2 } },
      message: 'Describe the violation.',
      fix: { range: { start: 0, end: 1 }, replacement: '' }, // optional
    });

    return out;
  },
};
```

### Template: rule with options

```ts
import { keywordToken } from '../lexer.js';
import type { Rule, Finding } from '../types.js';
import { tokenRange } from '../runner.js';

export type MyRuleStyle = 'a' | 'b';

export interface MyRuleOptions {
  style: MyRuleStyle;
}

export const myRule: Rule<MyRuleOptions, 'my-rule'> = {
  id: 'my-rule',
  defaultOptions: { style: 'a' },
  check: ({ tokens }, { style }) => {
    const out: Finding[] = [];

    for (const token of tokens) {
      if (token.tokenType !== keywordToken) {
        continue;
      }
      // ... use `style` ...
      out.push({
        severity: 'warning',
        range: tokenRange(token),
        message: `Violation in ${style} style.`,
      });
    }

    return out;
  },
};
```

### General notes

- `severity`: `'error' | 'warning' | 'info'`. Default for new rules: `'warning'`.
  Use `'error'` only when the script is broken or near-broken; `'info'` for purely
  stylistic nudges.
- `range`: 1-based `line`/`column`, end-exclusive. Use `tokenRange()` for token
  scoped findings.
- `fix.range`: **byte offsets** into `source` (0-based), not line/column. Use
  `tokenFix()` for token-scoped replacements.
- `fix` is optional. Omit it entirely if the rule cannot safely auto-fix.
- Disable directives (`// qlint-disable-next-line my-rule`) are handled by the
  runner — do not implement them in the rule.
- Before adding a new rule, check whether it makes sense to extend or modify an existing rule.
- Keep the rules as generic and configurable as possible, if feasible.

## Registration in `rules/index.ts`

Four edits, alphabetical placement, in this order:

1. **Import:**
   ```ts
   import { myRule } from './my-rule.js';
   ```
2. **Options type re-export** (only if the rule has options):
   ```ts
   export type { MyRuleOptions, MyRuleStyle } from './my-rule.js';
   ```
3. **Add to `recommended` array** (always — every existing rule is in this list).
4. **Add to the named `export { ... }` block** at the bottom.

## Tests + fixtures

Layout for `my-rule`:

```
packages/core/tests/rules/
├── my-rule.test.ts
└── fixtures/
    └── my-rule/
        ├── violation.qvs
        └── clean.qvs
```

Fixtures are plain `.qvs` Qlik script — no metadata. `violation.qvs` must trigger
the rule at least once; `clean.qvs` must not trigger it at all.

Helper: `lintFixture(ruleId, kind, rule, config?)` from
[helpers.ts](../../../packages/core/tests/rules/helpers.ts) reads
`fixtures/{ruleId}/{kind}.qvs` and lints it with the provided rule.

### Test template

```ts
import { describe, expect, it } from 'vitest';
import { format } from '../../src/index.js';
import { myRule } from '../../src/rules/index.js';
import { lintFixture } from './helpers.js';

describe('my-rule', () => {
  it('flags violations in the violation fixture', () => {
    const diagnostics = lintFixture('my-rule', 'violation', myRule);

    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics[0]).toMatchObject({
      ruleId: 'my-rule',
      severity: 'warning',
    });
  });

  it('does not flag the clean fixture', () => {
    const diagnostics = lintFixture('my-rule', 'clean', myRule);

    expect(diagnostics).toEqual([]);
  });

  // Only if the rule provides a fix:
  it('autofixes the violation', () => {
    const result = format('<input>', [myRule]);

    expect(result.output).toBe('<expected output>');
    expect(result.fixed).toBeGreaterThan(0);
    expect(result.diagnostics).toEqual([]);
  });
});
```

For rules with options, add a nested `describe('style option', ...)` block using
`configure(myRule, { ... })` from `../../src/index.js` — see
`variable-case.test.ts` for the pattern.

Disable-directive behavior is covered centrally; do not test it per rule.

## Docs entry — `packages/core/docs/rules.md`

This file is the public rules reference. On the first invocation of this skill, if
the file does not exist, bootstrap it with a short intro and one section per
existing rule (extract id, severity, options shape, and a small example from each
rule file in `packages/core/src/rules/`).

For every new or modified rule, write or update its section using this template:

```markdown
## `my-rule`

<one-line purpose>

- **Default severity:** warning
- **Autofix:** yes | no
- **Options:**

  | Field   | Type         | Default | Description |
  | ------- | ------------ | ------- | ----------- |
  | `style` | `'a' \| 'b'` | `'a'`   | ...         |

  _(Omit the Options block entirely if the rule has no options.)_

**Violates:**

\`\`\`qvs
<minimal violating snippet>
\`\`\`

**Passes:**

\`\`\`qvs
<minimal clean snippet>
\`\`\`
```

Keep sections alphabetical by rule id.

## Workflow

When invoked, walk this checklist in order. Skip steps that do not apply.

1. **Identify intent.** Add / modify / rename / remove? For modify and remove,
   confirm which existing rule and which aspect.
2. **Bootstrap docs if missing.** If `packages/core/docs/rules.md` does not exist,
   create it and seed entries for the existing rules before proceeding.
3. **Write/edit the rule file** following the templates above. Stay inside the
   rule file — never touch `types.ts`, `runner.ts`, or `disableDirectives.ts`.
4. **Update `rules/index.ts`** with the four registration edits (alphabetical).
5. **Write/edit the test file** with at least violation + clean assertions, plus
   a `format()` assertion if the rule has a fix.
6. **Write/edit the fixtures** (`violation.qvs`, `clean.qvs`).
7. **Write/edit the docs section** in `packages/core/docs/rules.md`.
8. **Run the tests:** `npm test --workspace packages/core`. Fix any failures; do
   not declare the task complete with red tests.

For **rename**, update all five artifacts (file, export, id literal, test file,
fixture directory) plus the docs section heading plus the four entries in
`rules/index.ts` in a single pass — leave nothing referencing the old name.

For **remove**, delete the rule file, the test file, the fixture directory, the
four entries in `rules/index.ts`, and the docs section.
