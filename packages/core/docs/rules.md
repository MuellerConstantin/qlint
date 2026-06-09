# Rules Reference

| Rule                                            | Description                                           |
| :---------------------------------------------- | :---------------------------------------------------- |
| [table-label-brackets](#table-label-brackets)   | Require table labels to be enclosed in brackets.      |
| [builtin-function-case](#builtin-function-case) | Enforce canonical casing for Qlik built-in functions. |
| [builtin-keyword-case](#builtin-keyword-case)   | Enforce canonical casing for Qlik keywords.           |

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

---
