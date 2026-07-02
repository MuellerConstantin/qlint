# Project Overview

Opinionated linting and formatting utilities for Qlik script.

qlint enforces a consistent, opinionated style for Qlik load scripts — so you spend
review time on logic, not on whitespace, casing, or keyword conventions. The linting and
formatting logic lives in a single, dependency-free core; everything else (CLI, browser,
IDE integrations) is a thin binding on top of it.

The following sub-modules/projects exists:

- **Core**: The dependency-free engine that parses Qlik script, applies the linting rules,
  and produces formatted output. Holds the entire ruleset, the parser/tokenizer, and the
  formatting logic. Has no I/O or platform assumptions and serves as the single source of
  truth that every other binding builds upon.

- **CLI**: A thin command-line wrapper around Core for local and CI usage. Handles file
  discovery, reading/writing scripts, exit codes, and configuration resolution, then
  delegates all linting and formatting to Core. Supports check (lint-only) and write
  (auto-format) modes.

- **Chrome Extension**: A browser binding that injects Core into the Qlik Sense Data Load
  Editor, providing inline lint feedback and one-click formatting directly in the editor.
  All processing runs client-side via the bundled Core engine.

- **VS Code Extension**: An editor binding that integrates Core into VS Code, providing
  inline lint feedback and formatting for Qlik load scripts in the editor. All processing
  runs locally via the bundled Core engine.

# Project Structure

```
.
├── packages/
│   ├── core/                     # Core package
│   │   ├── src
│   │   ├── tests
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── tsdown.config.ts
│   ├── cli/                      # CLI package
│   |   ├── src
│   |   ├── tests
│   |   ├── package.json
│   |   ├── tsconfig.json
│   |   └── tsdown.config.ts
│   ├── chrome-ext/               # Chrome extension
│   |   ├── src
│   |   ├── tests
│   |   ├── public
│   |   ├── package.json
│   |   ├── tsconfig.json
│   |   └── tsdown.config.ts
|   └── vscode-ext/               # VS Code extension
│       ├── src
│       ├── images
│       ├── package.json
│       ├── tsconfig.json
│       └── tsdown.config.ts
├── eslint.config.mjs
├── tsconfig.base.json
├── package.json
└── README.md
```

# Design Decisions

## Coding Principles

- **KISS**: Prefer the simplest solution that works. Avoid unnecessary abstractions – extract only after the third repetition (Rule of Three).
- **DRY**: Define logic once, import everywhere. Duplicated code is a maintenance liability.
- **YAGNI**: Don't build features or abstractions on speculation. Implement what's needed now.
- **Single Responsibility**: Each function, component, and module has one clear purpose.
- **Fail Fast**: Validate inputs early, throw meaningful errors immediately. Never swallow exceptions silently.
- **Guard Clauses over Nesting**: Prefer early returns over deeply nested `if/else` blocks.
- **Immutability by Default**: Use `const`, `readonly`, and spread operators. Avoid mutation unless there's a clear performance reason.
- **Explicit over Implicit**: Prefer explicit parameters and return types over hidden assumptions or side effects.
- **No Comment Spam**: Document _why_, not _what_. Docstrings on public APIs are welcome; `// increment counter` before `counter += 1` is not.
- **Explicit Blocks over Inline Statements**: Always use braces and a separate body line for control structures – `if (cond) {\n  doThing();\n}` instead of `if (cond) doThing();`. Explicit blocks prevent dangling-statement bugs, keep diffs clean when adding lines, and make control flow unambiguous.
