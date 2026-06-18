# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/2.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `qlint <files|dirs...>` command that lints `.qvs` files using the recommended
  rule set from `@qlint/core`.
- Recursive directory traversal: passing a directory walks it and picks up every
  `.qvs` file beneath it.
- `--fix` flag that applies autofixes in place and reports the number of fixes
  applied per run.
- `--format <stylish|json>` flag for diagnostic output, with `stylish` as the
  default human-readable format and `json` for machine consumption (one
  diagnostic per line).
- `--quiet` flag that suppresses `warning` and `info` diagnostics, keeping only
  `error` output for stricter CI gates.
- `--help` / `-h` flag printing usage.
- Exit codes suitable for CI: `0` when no errors, `1` when errors are present,
  `2` for invalid usage or missing input paths.
