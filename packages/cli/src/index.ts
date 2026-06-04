#!/usr/bin/env node

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parseArgs } from 'node:util';
import { lint, recommended, type Diagnostic } from '@qlint/core';

const HELP_TEXT = `qlint – Style-Linter for Qlik Script (QVS) files

Usage: qlint [options] <files|dirs...>

Options:
  --format <stylish|json>   Format (default: stylish)
  --quiet                   Show 'error' only, 'warning'/'info' is supressed
  -h, --help                This help`;

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
      format: { type: 'string', default: 'stylish' },
      quiet: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
    allowPositionals: true,
  });

  if (values.help || positionals.length === 0) {
    console.log(HELP_TEXT);
    process.exit(values.help ? 0 : 2);
  }

  const files = positionals.flatMap(collectScriptFiles);

  if (files.length === 0) {
    console.error('No Qlik Script (QVS) files found.');
    process.exit(2);
  }

  let errors = 0;
  let warnings = 0;

  for (const file of files) {
    let diagnostics = lint(readFileSync(file, 'utf8'), recommended);

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
    console.log(`\n${errors} error(s), ${warnings} warning(s) in ${files.length} file(s).`);
  }

  process.exit(errors > 0 ? 1 : 0);
}

main();
