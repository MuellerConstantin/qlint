<p align="center">
  <img width="128" alt="Logo" src="./images/qlint-128.png">
  <h1 align="center">qlint-vscode-ext</h1>
</p>
<p align="center">
  VS Code extension for qlint — brings inline linting and one-click formatting for Qlik load scripts into the editor.
</p>
<p align="center">
  <img src="https://img.shields.io/badge/Editor-VS%20Code-007ACC?logo=visualstudiocode&logoColor=white" />
  <img src="https://img.shields.io/badge/Qlik-QVS-009848?logo=qlik" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" />
</p>

<br />

## Table of contents

- [Introduction](#introduction)
- [Configuration](#configuration)

## Introduction

Everyone on your team writes Qlik script their own way? Nothing consistent, code hard to
read and a pain to maintain? This extension aims to fix that — bringing qlint's opinionated
style guide, on-demand autoformatting, and inline diagnostics directly into VS Code, right
where you write the script.

A editor binding around [`@qlint/core`](https://github.com/MuellerConstantin/qlint/tree/main/packages/core):
the extension owns the platform concerns — activating in the editor, surfacing diagnostics, and
wiring up editor commands — and delegates every linting and formatting decision to Core. No style
logic lives here; the binding only translates between VS Code and Core's string-in, diagnostics-out API.

## Configuration

The config for a script is resolved with a strict, two-level precedence — the two are never
merged:

1. **`qlint.json` at the workspace folder root.** Same file and shape the [CLI](https://github.com/MuellerConstantin/qlint/tree/main/packages/cli)
   uses (`{ "presets": "recommended", "rules": { … } }`). When present, it wins. This is the
   right home for a shared, checked-in team style.
2. **VS Code settings**, used when no `qlint.json` is found. Qlik scripts often open as a lone
   `.qvs` file with no project — settings cover exactly that case:
   - `qlint.presets` — preset(s) to use as a base (e.g. `["recommended"]`).
   - `qlint.rules` — per-rule overrides (a severity string, or a `[severity, options]` pair).

Both default to empty, so — matching the CLI and Chrome bindings — **nothing runs implicitly**:
a fresh install with no `qlint.json` and no preset selected reports no diagnostics until you opt
in. The status bar item shows the active source (`qlint.json`, `settings`, or `no rules`); click
it to open the config or the settings.

A broken `qlint.json` is surfaced as an error notification rather than silently ignored, and no
diagnostics are shown for that file until it is fixed.
