# Project Overview

Opinionated linting and formatting utilities for Qlik script.

qlinter enforces a consistent, opinionated style for Qlik load scripts — so you spend
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

## Versioning and Releases

- **Every package versions independently.** There is no lockstep bump. Tags therefore
  carry a package prefix (`core-v0.2.0`, `cli-v0.3.1`); a bare `vX.Y.Z` is ambiguous once
  more than one package is published from this repo.
- **On `0.x`, breaking changes bump the minor**, features and fixes bump the patch. SemVer
  permits breaking changes anywhere in `0.y.z`, but npm resolves `^0.1.0` to
  `>=0.1.0 <0.2.0` — so the minor is the boundary consumers actually rely on.
- **Pushing a tag is the release.** The workflow verifies that the tag matches the
  package's `package.json` version, extracts the matching `CHANGELOG.md` section as the
  release body, and aborts if that section is missing. Prereleases read `[Unreleased]`
  instead and publish to the `next` dist-tag; npm rejects a prerelease published without
  an explicit `--tag`.
- **A manual `workflow_dispatch` is a rehearsal**, never a release: the same steps run,
  but the publish is a dry run and no GitHub release is created. Any step with an external
  side effect must therefore be guarded by `if: github.event_name == 'push'`.

## Dependency Wiring

- **The bindings carry Core as a `devDependency`, not a `dependency`.** All three bundle it
  via `deps.alwaysBundle` in their tsdown config, so none needs it installed at runtime.
  Listing it under `dependencies` would make npm and `vsce` ship a second, redundant copy.
- **The version range on `@qlinter/core` decides where npm resolves it from.** Satisfied by
  the workspace version → symlink to `packages/core`; not satisfied → download the
  published release. This is deliberate, and it is the mechanism that lets a binding track
  Core during development yet stay pinned once Core moves on.
- **While Core sits on a prerelease, the bindings pin the exact version.** SemVer makes no
  compatibility promise between prereleases, so `^0.1.0-alpha.1` would silently accept a
  breaking `alpha.2`. Widen to a caret (`^0.1.0`) once Core reaches a stable release, where
  the range means what it says.
