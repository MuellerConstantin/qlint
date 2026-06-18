# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/2.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Manifest V3 Chrome extension that injects `@qlint/core` into the Qlik Sense
  Data Load Editor on Qlik Sense Enterprise on Windows (QSEoW).
- Inline lint feedback rendered directly against the editor, with underlines on
  the offending tokens and hover tooltips that explain the rule.
- Severity-aware popup showing live error / warning / info counts for the
  active editor.
- "Format automatically" action that applies every available autofix to the
  current script in a single pass and writes the result back into the editor.
- Per-origin permission gating: the extension declares
  `optional_host_permissions: ["<all_urls>"]` and requests access only for the
  origin the user explicitly enables via the popup.
- English and German UI locales via `_locales/`, selected through
  `default_locale: "en"`.
- Fully client-side processing: the bundled Core engine runs entirely in the
  browser; scripts never leave the page.
