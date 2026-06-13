# Rules Reference

| Rule                                                  | Description                                                   |
| :---------------------------------------------------- | :------------------------------------------------------------ |
| [block-indent](#block-indent)                         | Enforce consistent indentation for Qlik block constructs.     |
| [table-label-brackets](#table-label-brackets)         | Require table labels to be enclosed in brackets.              |
| [builtin-function-case](#builtin-function-case)       | Enforce canonical casing for Qlik built-in functions.         |
| [builtin-keyword-case](#builtin-keyword-case)         | Enforce canonical casing for Qlik keywords.                   |
| [comment-space](#comment-space)                       | Require a space after `//` and inside `/* */`.                |
| [max-line-length](#max-line-length)                   | Limit how long a single line of script may be.                |
| [no-legacy-path-variables](#no-legacy-path-variables) | Disallow legacy QlikView-era path system variables.           |
| [one-statement-per-line](#one-statement-per-line)     | Require each statement to start on its own line.              |
| [variable-case](#variable-case)                       | Enforce a consistent casing style for user-defined vars.      |
| [variable-charset](#variable-charset)                 | Restrict user-defined variables to a safe identifier charset. |

---

## block-indent

Enforce consistent indentation for Qlik block constructs (`Sub`, `If`, `For`,
`Do`, `Switch`).

### Rule Details

Qlik does not require indentation — block structure is defined by keywords
(`Sub`/`End Sub`, `If`/`End If`, `For`/`Next`, `Do`/`Loop`, `Switch`/`End Switch`),
not by whitespace. Without a convention, scripts mix flat and indented styles and
nested blocks become hard to scan. The rule walks the token stream, tracks the
open block depth, and flags every statement whose leading whitespace does not
match the expected level.

The rule only checks statement-start lines. Multi-line continuations — an `If`
header that spans several lines before `Then`, a `LOAD` body broken across
fields, a long `WHERE` clause — are intentionally **not** enforced; their layout
is a separate concern. This keeps the rule focused on block structure and out of
the way of formatting choices for long statements.

Indentation rules for the supported constructs:

- `Sub … End Sub`, `If … End If`, `For … Next`, `Do … Loop`, `Switch … End Switch`
  open a new block; the body is indented one level deeper.
- `Else` / `ElseIf` align with the surrounding `If`.
- `Case` / `Default` are indented one level **inside** the surrounding `Switch`;
  their bodies are indented one level deeper again.

The autofix replaces the leading whitespace of each offending line with the
expected indent. Lines whose first token is part of a function call named `If(…)`
are not treated as block openers — the lexer distinguishes the keyword from the
built-in function.

Examples of **incorrect** code for this rule (default `size: 4`, `style: 'space'`):

```qlik
Sub greet
Trace hello;
  End Sub

If vYear = 2026 Then
  LET vMsg = 'this year';
    Else
        LET vMsg = 'other';
End If

Switch vMode
Case 'A'
Trace mode A;
End Switch
```

Examples of **correct** code for this rule:

```qlik
Sub greet
    Trace hello;
End Sub

If vYear = 2026 Then
    LET vMsg = 'this year';
ElseIf vYear < 2026 Then
    LET vMsg = 'past';
Else
    LET vMsg = 'other';
End If

Switch vMode
    Case 'A'
        Trace mode A;
    Default
        Trace unknown;
End Switch
```

### Options

| Option  | Type               | Default   | Description                             |
| :------ | :----------------- | :-------- | :-------------------------------------- |
| `size`  | `number`           | `4`       | Number of indent units per block level. |
| `style` | `'space' \| 'tab'` | `'space'` | Character used for one indent unit.     |

- `size` — how many `style` units make up one indent level. With `style: 'space'`,
  the default `4` matches the Qlik Sense Data Load Editor.
- `style: 'space'` — indent with ASCII spaces.
- `style: 'tab'` — indent with literal tab characters; `size` then counts tabs
  per level (the default `4` becomes four tabs per level, so most teams that pick
  `'tab'` also set `size: 1`).

Example configuration:

```ts
import { lint, blockIndent } from '@qlint/core';

lint(source, [blockIndent], {
  rules: {
    'block-indent': ['warning', { size: 2 }],
  },
});
```

With `size: 2`, the following is **correct**:

```qlik
Sub greet
  Trace hello;
End Sub
```

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

## comment-space

Require a single space between a comment marker and its body.

### Rule Details

Comments without separating whitespace (`//foo`, `/*foo*/`) read as one
continuous blob and make a quick scan of the script harder. A consistent single
space between the marker and the text keeps comments visually aligned with the
surrounding code and matches the convention used by every other linter in the
ecosystem.

The rule walks every comment token and enforces:

- `//` line comments must be followed by whitespace before any text.
- `/* … */` block comments must have whitespace immediately after `/*` and
  immediately before `*/` (a newline counts as whitespace, so multi-line block
  comments that open with a line break are fine).

Two intentional exceptions keep the rule out of the way of common idioms:

- Empty markers (`//`, `/**/`) are accepted.
- Decorative banners whose body consists only of the marker character are
  accepted: `////////////////` (only `/`s after `//`) and `/****/` (only `*`s
  between `/*` and `*/`). This covers the section-divider style that Qlik
  scripts often use to delimit pipeline stages without forcing an awkward
  rewrite.

The autofix inserts a single space at each offending position. A tight
`/*foo*/` becomes `/* foo */` in one format pass.

Examples of **incorrect** code for this rule:

```qlik
//No space after slashes
SET vYear = 2026;

/*tight block*/
LET vMonth = 6;

/* missing-at-end*/
LET vDay = 1;
```

Examples of **correct** code for this rule:

```qlik
// Comment with a space
SET vYear = 2026;

//
LET vMonth = 6;

////////////////////////////////////////
// Decorative banner
////////////////////////////////////////

/* spaced block */
LET vDay = 1;

/*
 * multi-line block comment
 * stays untouched
 */
LET vHour = 12;
```

### Options

This rule has no options. The single-space convention is intentionally fixed —
making it configurable would invite every project to redefine "well-formatted
comment", which defeats the point of an opinionated linter.

---

## max-line-length

Limit how long a single line of script may be.

### Rule Details

Long lines force horizontal scrolling, hide statement structure, and make diffs
harder to read. The rule walks the source line by line and flags every line
whose character count exceeds the configured maximum. CRLF and LF endings are
both counted the same way — only the visible characters of the line contribute
to the length.

The default of `120` was chosen because Qlik scripts have structurally long
constructs (`lib://...` data-connection paths, embedded SQL, function chains
like `Date(Timestamp#(...), '...')`) that make tighter defaults noisy on real
scripts. Teams that want a stricter limit can lower it via the `max` option.

There is no autofix: mechanically wrapping a Qlik line would risk cutting
string literals, SQL fragments, or data-connection paths and breaking syntax.

Examples of **incorrect** code for this rule (default `max: 120`):

```qlik
[Sales]:
Load
    Date(Timestamp#(OrderTimestamp, 'YYYY-MM-DDThh:mm:ss')) as OrderDate, CustomerName, ProductCategory, Region, Channel, Subtotal as RevenueLine
From [lib://Sales/orders.qvd] (qvd);
```

Examples of **correct** code for this rule (default `max: 120`):

```qlik
[Sales]:
Load
    Date(Timestamp#(OrderTimestamp, 'YYYY-MM-DDThh:mm:ss')) as OrderDate,
    CustomerName,
    ProductCategory,
    Region,
    Channel,
    Subtotal as RevenueLine
From [lib://Sales/orders.qvd] (qvd);
```

### Options

| Option | Type     | Default | Description                          |
| :----- | :------- | :------ | :----------------------------------- |
| `max`  | `number` | `120`   | Maximum allowed characters per line. |

Example configuration:

```ts
import { lint, maxLineLength } from '@qlint/core';

lint(source, [maxLineLength], {
  rules: {
    'max-line-length': ['warning', { max: 100 }],
  },
});
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

## one-statement-per-line

Require each statement to start on its own line.

### Rule Details

Qlik allows multiple statements to be packed onto a single physical line by
separating them with semicolons (`SET vYear = 2026; LET vMonth = 6;`). The
syntax is legal, but every extra statement on a line hides from a scan-read of
the script and complicates diffs — a one-character change can rewrite the
meaning of half the line.

The rule walks the token stream and flags any token that shares a line with
the semicolon immediately preceding it. Multi-line `LOAD` bodies are not
affected because their field separators are commas, not semicolons. Trailing
comments after a semicolon are also not affected, because the lexer routes
comment tokens to a separate group — only real code on the same line triggers
a finding.

Implicit terminators like `End Sub`, `Next`, and `Loop` end a statement only
across a line break; on the same line Qlik itself rejects a chained statement
unless an explicit semicolon is added, so they collapse to the same
semicolon-based check.

The autofix replaces the gap between the semicolon and the next token with a
single newline, so `SET x = 1;  SET y = 2;` becomes
`SET x = 1;\nSET y = 2;`. Any indentation of the new line is left to a
dedicated indent rule.

Examples of **incorrect** code for this rule:

```qlik
SET vYear = 2026; LET vMonth = 6;

[TableA]:
Load
    Field1,
    Field2
Resident [Source]; SET vDone = 1;
```

Examples of **correct** code for this rule:

```qlik
SET vYear = 2026;
LET vMonth = 6; // trailing comments are fine

[TableA]:
Load
    Field1,
    Field2
Resident [Source];

Sub greet
    Trace hello;
End Sub
SET vDone = 1;
```

### Options

| Option       | Type                       | Default  | Description                                         |
| :----------- | :------------------------- | :------- | :-------------------------------------------------- |
| `lineEnding` | `'auto' \| 'lf' \| 'crlf'` | `'auto'` | Line ending the autofix inserts between statements. |

- `'auto'` — match the source: `'\r\n'` if the source contains any CRLF, `'\n'` otherwise.
- `'lf'` — always insert `'\n'`.
- `'crlf'` — always insert `'\r\n'`.

Example configuration:

```ts
import { lint, oneStatementPerLine } from '@qlint/core';

lint(source, [oneStatementPerLine], {
  rules: {
    'one-statement-per-line': ['warning', { lineEnding: 'crlf' }],
  },
});
```

---

## variable-case

Enforce a consistent casing style for user-defined variables.

### Rule Details

In Qlik script, user-defined variables can only be introduced through a `SET` or
`LET` statement. Without a convention, the same script ends up mixing styles
(`vMaxDate`, `max_date`, `MaxDate`), which makes it harder to tell variable
references apart from fields, table names, or built-in identifiers.

The rule checks the identifier that follows each `SET` / `LET` keyword and flags
it when it does not match the configured style. Qlik system variables (such as
`DateFormat`, `ThousandSep`, `ErrorMode`) are recognised by the lexer as a
distinct token type and are intentionally excluded — their names are fixed by
the platform and are covered by other rules.

There is no autofix: converting between casing styles requires knowing where
the word boundaries are (`maxdate` could become `maxDate`, `MaxDate`, or
`max_date`), and guessing them mechanically would produce wrong names.

Examples of **incorrect** code for this rule (default `style: 'camel'`):

```qlik
SET BadName = 'first';
LET other_var = 1;
```

Examples of **correct** code for this rule (default `style: 'camel'`):

```qlik
SET vYear = 2026;
LET vMaxDate = Today();
Set someValue = 'ok';

// system variables stay untouched regardless of style
Let DateFormat = 'YYYY-MM-DD';
```

### Options

| Option  | Type                                             | Default   | Description                                 |
| :------ | :----------------------------------------------- | :-------- | :------------------------------------------ |
| `style` | `'camel' \| 'pascal' \| 'snake' \| 'upperSnake'` | `'camel'` | Casing required for user-defined variables. |

- `'camel'` — `myVariable`, `vYear`, `someValue`.
- `'pascal'` — `MyVariable`, `VYear`, `SomeValue`.
- `'snake'` — `my_variable`, `v_year`, `some_value`.
- `'upperSnake'` — `MY_VARIABLE`, `V_YEAR`, `SOME_VALUE`.

Example configuration:

```ts
import { lint, variableCase } from '@qlint/core';

lint(source, [variableCase], {
  rules: {
    'variable-case': ['warning', { style: 'snake' }],
  },
});
```

With `style: 'snake'`, the following is **correct**:

```qlik
SET max_date = Today();
LET row_count = NoOfRows('Sales');
```

---

## variable-charset

Restrict user-defined variables to a safe identifier charset.

### Rule Details

Qlik's tokenizer accepts almost anything as a variable name — leading `$`/`#`/`@`,
trailing dots, consecutive dots, non-ASCII letters, and other characters that
would be rejected by virtually every other language. Names like `v$Path`,
`vFoo.`, or `vÖÄÜ` parse without an error but read poorly, break grep,
trip up surrounding tooling, and turn into a different variable on every typo.

The rule checks the identifier that follows each `SET` / `LET` keyword and flags
it when it falls outside an opinionated, conservative charset:

- The name consists of one or more segments separated by dots (for the common
  Qlik namespacing convention like `vL.LocalVar` or `vG.Sys.Path`).
- Each segment must start with an ASCII letter or underscore and may then
  contain ASCII letters, digits, and underscores.

Consequences of that pattern: leading dot, trailing dot, consecutive dots,
segments starting with a digit, and any character outside `[A-Za-z0-9_.]` are
all rejected. Qlik system variables (such as `DateFormat`, `ThousandSep`,
`ErrorMode`) are recognised by the lexer as a distinct token type and are
intentionally excluded — their names are fixed by the platform.

There is no autofix: there is no mechanical way to rewrite `v$Path` or
`vÖÄÜ` into a sensible replacement without changing meaning.

This rule is complementary to [variable-case](#variable-case): casing and
charset are independent concerns. `vFüßBär` is valid camelCase, but its
characters are still outside the safe charset.

Examples of **incorrect** code for this rule:

```qlik
SET vFoo. = 1;
LET vL..Bar = 2;
Set v$Path = 'x';
Let vÖÄÜ = 'y';
```

Examples of **correct** code for this rule:

```qlik
SET vYear = 2026;
LET _privateVar = 1;
Set vL.MyVar = 'ok';
Let vG.Sys.Path = 'y';

// system variables stay untouched
SET DateFormat = 'YYYY-MM-DD';
```

### Options

This rule has no options. The charset is intentionally fixed — making it
configurable would invite every project to redefine "valid identifier", which
defeats the point of an opinionated linter.

---
