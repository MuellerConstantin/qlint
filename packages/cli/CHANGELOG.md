# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/2.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `qlint --config <path> <files|dirs...>` command that lints `.qvs` files
  against a required config file, applying no implicit defaults.
- Recursive directory traversal: passing a directory walks it and picks up every
  `.qvs` file beneath it.
- `--fix` flag that applies autofixes in place and reports the number of fixes
  applied per run.
- `--format <stylish|json>` flag for diagnostic output, with `stylish` as the
  default human-readable format and `json` for machine consumption (one
  diagnostic per line).
- `--quiet` flag that suppresses `warning` and `info` diagnostics, keeping only
  `error` output for stricter CI gates.
- `--config` / `-c` flag pointing to a JSON config file. It is **required** and
  used verbatim — the CLI adds no implicit base. The file's `presets` and `rules`
  are forwarded to Core: `presets` names the preset base (e.g. `"recommended"`,
  or `[]`/omitted for none) and `rules` turns individual rules off, re-severities
  them, or reconfigures their options per project. A missing config, invalid
  JSON, unknown presets, unknown rule IDs, unknown severities, and malformed rule
  entries fail with a clear error before any linting starts.
- `--help` / `-h` flag printing usage.
- Exit codes suitable for CI: `0` when no errors, `1` when errors are present,
  `2` for invalid usage, a missing/invalid config, or missing input paths.
