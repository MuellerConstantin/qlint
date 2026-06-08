# @qlint/chrome-ext

> Chrome extension that lints and formats Qlik load scripts inline in the Qlik Sense Data Load Editor, powered by @qlint/core

## Table of contents

- [Introduction](#introduction)
  - [Features](#features)

## Introduction

Chrome extension for qlint — brings inline linting and one-click formatting directly into
the Qlik Sense Data Load Editor.

> [!NOTE]
> Currently supports **Qlik Sense Enterprise on Windows** only. Qlik Cloud support is planned.

A browser binding around [`@qlint/core`](https://github.com/MuellerConstantin/qlint/tree/main/packages/core):
the extension owns the platform concerns — injecting into the Data Load Editor, locating the script
content, surfacing diagnostics as inline UI, and wiring up the format action — and delegates every
linting and formatting decision to Core. The bundled Core engine runs entirely client-side; no
script ever leaves the browser, and no backend is involved.

## Features

- **Inline lint feedback** — Core's diagnostics rendered against the editor, so style
  violations surface where you write the script.
- **One-click formatting** — apply Core's formatter to the current script and write the
  normalized output back into the editor.
