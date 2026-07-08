<p align="center">
  <img width="200" alt="Logo" src="./docs/images/logo.svg">
  <h1 align="center">@qlint/cli</h1>
</p>
<p align="center">
  Command-line interface for qlint — lints and formats Qlik load scripts from the terminal or in CI.
</p>
<p align="center">
  <img src="https://img.shields.io/badge/npm-CB3837?logo=npm" />
  <img src="https://img.shields.io/badge/Node.js-5FA04E?logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" />
</p>

<br />

## Table of contents

- [Introduction](#introduction)
  - [Features](#features)
  - [Usage](#usage)
    - [Synopsis](#synopsis)
    - [Options](#options)
    - [Configuration](#configuration)
    - [Examples](#examples)
    - [Exit codes](#exit-codes)

## Introduction

Everyone on your team writes Qlik script their own way? Nothing consistent, code hard to
read and a pain to maintain? The qlint CLI fixes that — run it locally against your
scripts or wire it into CI to enforce an opinionated style guide on every commit,
autoformat in place, and fail the build when violations slip through.

A thin wrapper around [`@qlint/core`](https://github.com/MuellerConstantin/qlint/tree/main/packages/core):
the CLI owns the platform concerns — file discovery (globs), reading/writing scripts,
configuration resolution, and process exit codes — and delegates every linting and formatting
decision to Core. No style logic lives here; the binding only translates between the filesystem and
Core's string-in, diagnostics-out API.

## Features

- **`check` mode** — lint-only. Reports diagnostics and exits non-zero on errors,
  leaving files untouched. Intended for CI gates and pre-commit hooks.
- **`--fix` mode** — auto-format. Applies Core's formatter in place and writes the
  normalized output back to disk.
- **Files or directories** — accepts one or more file paths or directories; directories
  are walked recursively for `.qvs` scripts.
- **Multiple output formats** — human-readable `stylish` (default) or machine-readable
  `json`, so diagnostics can feed straight into CI reporters or other tooling.
- **Severity-aware exit codes** — `0` when clean, non-zero on errors. Drop-in ready for
  CI gates, pre-commit hooks, and pipeline steps.
- **Opinionated default ruleset** — ships with the same `recommended` style guide as the
  rest of the qlint ecosystem, so the CLI, the Chrome extension, and any future binding
  enforce the exact same conventions.

## Usage

### Synopsis

```
qlint [options] <files|dirs...>
```

The CLI takes one or more positional arguments — each a path to a `.qvs` file or a
directory. Directories are walked recursively and every `.qvs` script inside is linted.
Shell globs (e.g. `src/**/*.qvs`) work via shell expansion; the CLI itself does not
interpret glob patterns.

### Options

| Option                      | Description                                                          |
| --------------------------- | -------------------------------------------------------------------- |
| `--fix`                     | Auto-fix violations and write the formatted output back to disk.     |
| `--format <stylish\|json>`  | Output format. `stylish` (default) is human-readable; `json` emits one JSON object per diagnostic for machine consumption. |
| `--quiet`                   | Only print `error`-level diagnostics; suppress `warning` and `info`. |
| `-c`, `--config <path>`     | Path to a JSON config file overriding the recommended defaults per rule. |
| `-h`, `--help`              | Print the help text and exit.                                        |

### Configuration

By default the CLI runs Core's `recommended` rule set as-is. To turn individual
rules off, change their severity, or pass options, point the CLI at a JSON file
via `--config <path>`. There is no auto-discovery — the path must be supplied
explicitly.

The file has the same shape as Core's `LintConfig`: an optional `presets` field
and a `rules` object keyed by rule ID. Each `rules` entry is either a severity
string (`"error"`, `"warning"`, `"info"`, `"off"`) or a `[severity, options]`
tuple:

```json
{
  "presets": "recommended",
  "rules": {
    "trailing-whitespace": "off",
    "max-line-length": ["warning", { "max": 120 }]
  }
}
```

`presets` names the built-in preset(s) to start from — currently only
`"recommended"` — and `rules` overrides them per rule. The CLI already applies
`"recommended"` as the default base, so you only need `presets` to change it:
set `"presets": []` to opt out of every preset and evaluate **only** your own
`rules`.

Unknown rule IDs, unknown preset names, invalid JSON, unknown severities, and
malformed rule entries all fail with a clear error and exit code `2` before any
linting starts.

### Examples

```bash
# Lint a single script
qlint scripts/load.qvs

# Lint everything under a directory tree
qlint src/

# Lint multiple targets at once
qlint src/load.qvs src/transform.qvs lib/

# Auto-fix and write changes back in place
qlint --fix src/

# Lint with a project-specific config
qlint --config qlint.json src/

# Errors only, machine-readable output (e.g. for CI reporters)
qlint --quiet --format json src/
```

### Exit codes

| Code | Meaning                                                                |
| ---- | ---------------------------------------------------------------------- |
| `0`  | No errors. Files were clean, or only `warning`/`info` diagnostics were reported. |
| `1`  | At least one `error`-level diagnostic was reported.                    |
| `2`  | Usage error — no targets given, path not found, or no `.qvs` files matched. |
