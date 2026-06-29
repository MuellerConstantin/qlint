import { readFileSync } from 'node:fs';
import { validateConfig, type LintConfig } from '@qlint/core';

export function loadConfig(path: string): LintConfig {
  let raw: string;

  try {
    raw = readFileSync(path, 'utf8');
  } catch (err) {
    throw new Error(`Config file not found: ${path}`, { cause: err });
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Invalid JSON in config file ${path}: ${message}`, { cause: err });
  }

  return validateConfig(parsed, path);
}
