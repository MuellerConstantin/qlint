# @qlint/cli

> Command-line linter and formatter for Qlik load scripts, powered by @qlint/core

## Table of contents

- [Introduction](#introduction)
  - [Modes](#modes)

## Introduction

Command-line interface for qlint — lints and formats Qlik load scripts from the terminal
or in CI.

A thin wrapper around [`@qlint/core`](https://github.com/MuellerConstantin/qlint/tree/main/packages/core):
the CLI owns the platform concerns — file discovery (globs), reading/writing scripts,
configuration resolution, and process exit codes — and delegates every linting and formatting
decision to Core. No style logic lives here; the binding only translates between the filesystem and
Core's string-in, diagnostics-out API.

## Modes

- **check** — lint-only. Reports diagnostics and exits non-zero on violations, leaving
  files untouched. Intended for CI gates and pre-commit hooks.
- **fix** — auto-format. Applies Core's formatter in place and writes the normalized
  output back to disk.
