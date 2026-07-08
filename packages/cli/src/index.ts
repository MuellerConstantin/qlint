#!/usr/bin/env node

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parseArgs } from 'node:util';
import { lint, format, type Diagnostic, type LintConfig } from '@qlint/core';
import { loadConfig } from './config.js';

const HELP_TEXT = `qlint – Style-Linter for Qlik Script (QVS) files

Usage: qlint --config <path> [options] <files|dirs...>

Options:
  --fix                     Auto-fix violations and write files in place
  --format <stylish|json>   Format (default: stylish)
  --quiet                   Show 'error' only, 'warning'/'info' is supressed
  -c, --config <path>       Path to a JSON config file (required)
  -h, --help                This help

The config is used verbatim — there is no implicit default. To run the
opinionated default rule set, name it in the config: { "presets": "recommended" }.`;

function collectScriptFiles(target: string): string[] {
  let stats;

  try {
    stats = statSync(target);
  } catch {
    console.error(`Path not found: ${target}`);
    process.exit(2);
  }

  if (stats.isFile()) {
    return target.endsWith('.qvs') ? [target] : [];
  }

  const out: string[] = [];

  for (const element of readdirSync(target, { withFileTypes: true })) {
    const path = join(target, element.name);
    out.push(...(element.isDirectory() ? collectScriptFiles(path) : path.endsWith('.qvs') ? [path] : []));
  }

  return out;
}

function stylish(file: string, d: Diagnostic): string {
  const { line, column } = d.range.start;
  return `  ${relative(process.cwd(), file)}:${line}:${column}  ${d.severity}  ${d.ruleId}  ${d.message}`;
}

function main(): void {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      fix: { type: 'boolean', default: false },
      format: { type: 'string', default: 'stylish' },
      quiet: { type: 'boolean', default: false },
      config: { type: 'string', short: 'c' },
      help: { type: 'boolean', short: 'h', default: false },
    },
    allowPositionals: true,
  });

  if (values.help || positionals.length === 0) {
    console.log(HELP_TEXT);
    process.exit(values.help ? 0 : 2);
  }

  // The CLI assumes nothing implicitly: a config must be supplied and is used
  // verbatim. To get the opinionated defaults, the config names them via
  // `"presets": "recommended"`.
  if (!values.config) {
    console.error('No config file provided. Pass one with --config <path>, e.g. { "presets": "recommended" }.');
    process.exit(2);
  }

  const files = positionals.flatMap(collectScriptFiles);

  if (files.length === 0) {
    console.error('No Qlik Script (QVS) files found.');
    process.exit(2);
  }

  let config: LintConfig;

  try {
    config = loadConfig(values.config);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(2);
  }

  let errors = 0;
  let warnings = 0;
  let fixedTotal = 0;

  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    let diagnostics: Diagnostic[];

    if (values.fix) {
      const result = format(source, config);
      diagnostics = result.diagnostics;
      fixedTotal += result.fixed;

      if (result.output !== source) {
        writeFileSync(file, result.output, 'utf8');
      }
    } else {
      diagnostics = lint(source, config);
    }

    if (values.quiet) {
      diagnostics = diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
    }

    for (const diagnostic of diagnostics) {
      if (diagnostic.severity === 'error') {
        errors++;
      } else if (diagnostic.severity === 'warning') {
        warnings++;
      }

      if (values.format === 'json') {
        console.log(JSON.stringify({ file, ...diagnostic }));
      } else {
        console.log(stylish(file, diagnostic));
      }
    }
  }

  if (values.format !== 'json') {
    const fixedNote = values.fix ? `, ${fixedTotal} fix(es) applied` : '';
    console.log(`\n${errors} error(s), ${warnings} warning(s) in ${files.length} file(s)${fixedNote}.`);
  }

  process.exit(errors > 0 ? 1 : 0);
}

main();
