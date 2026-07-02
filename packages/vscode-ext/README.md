<p align="center">
  <img width="200" alt="Logo" src="./docs/images/logo.svg">
  <h1 align="center">@qlint/vscode-ext</h1>
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

## Introduction

Everyone on your team writes Qlik script their own way? Nothing consistent, code hard to
read and a pain to maintain? This extension aims to fix that — bringing qlint's opinionated
style guide, on-demand autoformatting, and inline diagnostics directly into VS Code, right
where you write the script.

A editor binding around [`@qlint/core`](https://github.com/MuellerConstantin/qlint/tree/main/packages/core):
the extension owns the platform concerns — activating in the editor, surfacing diagnostics, and
wiring up editor commands — and delegates every linting and formatting decision to Core. No style
logic lives here; the binding only translates between VS Code and Core's string-in, diagnostics-out API.
