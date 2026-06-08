# @qlint/core

> Opinionated linting/formatting utilities for Qlik Script (QVS)

## Table of contents

- [Introduction](#introduction)
  - [What it does](#what-it-does)

## Introduction

The engine behind qlint — parses Qlik load scripts, applies an
opinionated ruleset, and emits both lint diagnostics and formatted output.

Core is the single source of truth for all qlint bindings (CLI, Chrome extension, future
IDE integrations). It bundles the tokenizer/parser, the complete ruleset, and the
formatting logic into one platform-agnostic module — no I/O, no filesystem access, no
DOM, no runtime dependencies. Everything operates on strings: you hand it script source,
it hands back diagnostics and/or formatted source. That makes it equally at home in
Node, the browser, or a Web Worker.

## What it does

- **Lint** — surface style violations (whitespace, keyword casing, statement
  conventions) as structured diagnostics with positions, so callers can render them
  however they like.
- **Format** — apply the same ruleset deterministically to produce normalized output;
  formatting and linting share one source of truth, so they never disagree.

Bindings stay thin by design: they handle their platform concerns (file discovery and
exit codes in the CLI, editor injection in the extension) and delegate every linting and
formatting decision to core.
