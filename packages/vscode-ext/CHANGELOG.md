# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/2.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- VS Code extension that injects `@qlint/core` into the editor for Qlik load
  scripts, contributing a `qlik` language for `.qvs` files (with a file icon)
  and activating on first open.
- Inline lint feedback published to the Problems panel and rendered against the
  offending ranges, refreshed live as the document changes and cleared when it
  closes.
- Core autofixes surfaced as Quick Fix code actions on each fixable diagnostic.
- Per-document configuration resolution with strict precedence: a `qlint.json`
  at the workspace folder root wins, otherwise the `qlint.presets` and
  `qlint.rules` settings apply. Loose `.qvs` files with no workspace folder fall
  through to settings. Both default to empty, so — matching the CLI and Chrome
  extension — nothing runs until a preset or rules are named.
- `qlint.presets` and `qlint.rules` settings contributed to VS Code's native
  settings UI, with the preset picker offering the built-in presets.
- Status bar item showing the active configuration source (`qlint.json`,
  `settings`, or `no rules`); clicking it opens the `qlint.json` or the settings.
- Resolved configs cached per workspace folder and invalidated on settings
  changes and via a `qlint.json` file watcher, so a config edit re-lints open
  documents without a reload.
- A broken `qlint.json` surfaced as an error notification and written to the
  qlint output channel, rather than being silently ignored; no diagnostics are
  shown for the affected file until it is fixed.
- Fully local processing: the bundled Core engine runs entirely in the editor
  host; scripts never leave the machine.
