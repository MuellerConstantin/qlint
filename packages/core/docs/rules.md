# Rules Reference

| Rule                                                  | Description                                           |
| :---------------------------------------------------- | :---------------------------------------------------- |
| [table-label-brackets](#table-label-brackets)         | Require table labels to be enclosed in brackets.      |
| [builtin-function-case](#builtin-function-case)       | Enforce canonical casing for Qlik built-in functions. |
| [builtin-keyword-case](#builtin-keyword-case)         | Enforce canonical casing for Qlik keywords.           |
| [no-legacy-path-variables](#no-legacy-path-variables) | Disallow legacy QlikView-era path system variables.   |

---

## table-label-brackets

Require table labels to be enclosed in square brackets.

### Rule Details

Qlik allows table labels to be written with or without brackets. Unbracketed
labels break as soon as the name contains a space, a reserved word, or a special
character, and they read inconsistently against the bracketed form that `RESIDENT`
and field references already use. Requiring brackets everywhere removes that class
of error and keeps label syntax uniform across the script.

Examples of **incorrect** code for this rule:

```qlik
TableA:
Load
  Field1,
  Field2
Resident [TableA];
```

Examples of **correct** code for this rule:

```qlik
[TableA]:
Load
  Field1,
  Field2
Resident [TableA];
```

### Options

This rule has no options.

---

## builtin-function-case

Enforce the canonical casing for Qlik built-in functions.

### Rule Details

Qlik resolves built-in function names case-insensitively, so `sum`, `Sum`, and
`SUM` all work. That tolerance lets casing drift across a script and between
authors, which obscures the line between built-in functions and user-defined
fields or variables. Pinning each function to its canonical spelling (as listed
in the Qlik documentation) keeps calls visually consistent and makes built-ins
easy to distinguish from surrounding identifiers.

Examples of **incorrect** code for this rule:

```qlik
[Totals]:
Load
  sum(Value) as Total
Resident [TableA];
```

Examples of **correct** code for this rule:

```qlik
[Totals]:
Load
  Sum(Value) as Total
Resident [TableA];
```

### Options

| Option  | Type                             | Default    | Description                                |
| :------ | :------------------------------- | :--------- | :----------------------------------------- |
| `style` | `'pascal' \| 'lower' \| 'upper'` | `'pascal'` | Casing applied to built-in function names. |

- `'pascal'` — use the canonical spelling from the Qlik documentation (e.g. `Sum`, `Date`, `RangeSum`).
- `'lower'` — lowercase the canonical spelling (e.g. `sum`, `date`, `rangesum`).
- `'upper'` — uppercase the canonical spelling (e.g. `SUM`, `DATE`, `RANGESUM`).

Example configuration:

```ts
import { lint, builtinFunctionCase } from '@qlint/core';

lint(source, [builtinFunctionCase], {
  rules: {
    'builtin-function-case': ['warning', { style: 'upper' }],
  },
});
```

With `style: 'upper'`, the following is **correct**:

```qlik
[Totals]:
Load
  SUM(Value) as Total
Resident [TableA];
```

---

## builtin-keyword-case

Enforce the canonical casing for Qlik script keywords.

### Rule Details

Qlik parses keywords case-insensitively, so `LOAD`, `Load`, and `load` are all
accepted. Without a rule, casing drifts across a script and between authors.
Pinning each keyword to its canonical spelling (as listed in the Qlik
documentation) keeps statements visually consistent and makes the script's
structure easy to scan.

Examples of **incorrect** code for this rule:

```qlik
[Totals]:
LOAD
  Sum(Value) as Total
Resident [TableA];
```

Examples of **correct** code for this rule:

```qlik
[Totals]:
Load
  Sum(Value) as Total
Resident [TableA];
```

### Options

| Option  | Type                             | Default    | Description                        |
| :------ | :------------------------------- | :--------- | :--------------------------------- |
| `style` | `'pascal' \| 'lower' \| 'upper'` | `'pascal'` | Casing applied to script keywords. |

- `'pascal'` — use the canonical spelling from the Qlik documentation (e.g. `Load`, `Resident`, `From`).
- `'lower'` — lowercase the canonical spelling (e.g. `load`, `resident`, `from`).
- `'upper'` — uppercase the canonical spelling (e.g. `LOAD`, `RESIDENT`, `FROM`).

Example configuration:

```ts
import { lint, builtinKeywordCase } from '@qlint/core';

lint(source, [builtinKeywordCase], {
  rules: {
    'builtin-keyword-case': ['warning', { style: 'upper' }],
  },
});
```

With `style: 'upper'`, the following is **correct**:

```qlik
[Totals]:
LOAD
  Sum(Value) as Total
RESIDENT [TableA];
```

---

## no-legacy-path-variables

Disallow the legacy QlikView-era path system variables (`CD`, `Floppy`,
`QvPath`, `QvRoot`, `QvWorkPath`, `QvWorkRoot`, `WinPath`, `WinRoot`).

### Rule Details

These variables come from the QlikView era, when scripts referenced files
directly via local operating-system paths. The Qlik Sense documentation still
lists them on the system variables reference page, but Qlik Sense executes
scripts server-side and resolves file access through `lib://` data connections.
The legacy variables are tied to concepts that no longer apply (local floppy
and CD drives, an installed QlikView client, a Windows-shaped working
directory) and their appearance is almost always a sign of code copied
verbatim from a QlikView script.

The rule does not offer an autofix because there is no mechanical replacement —
the script needs a real data connection, which is a configuration decision
outside the source file.

Examples of **incorrect** code for this rule:

```qlik
LET vRoot = QvRoot;

[Files]:
Load
  WinPath as Path
AutoGenerate 1;
```

Examples of **correct** code for this rule:

```qlik
LET vRoot = 'lib://MyDataLake/';

[Files]:
Load
  '$(vRoot)' as Path
AutoGenerate 1;
```

### Options

This rule has no options.

---
