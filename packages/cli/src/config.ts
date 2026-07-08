import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateConfig, type LintConfig } from '@qlint/core';

/** Conventional config filename, matching what the `--config` docs use. */
export const CONFIG_FILENAME = 'qlint.json';

const DEFAULT_CONFIG = `${JSON.stringify({ presets: 'recommended', rules: {} }, null, 2)}\n`;

/**
 * Scaffolds a `qlint.json` in `dir` that names the `recommended` preset and
 * leaves an empty `rules` map to fill in. Refuses to overwrite an existing file
 * (opened with the `wx` flag), so an established config is never clobbered.
 *
 * @returns The path of the written file.
 * @throws If a config file already exists at the target path.
 */
export function initConfig(dir: string): string {
  const path = join(dir, CONFIG_FILENAME);

  try {
    writeFileSync(path, DEFAULT_CONFIG, { flag: 'wx' });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'EEXIST') {
      throw new Error(`Config file already exists: ${path}`, { cause: err });
    }

    throw err;
  }

  return path;
}

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
