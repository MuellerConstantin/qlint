import { readFileSync } from 'node:fs';
import type { LintConfig } from '@qlint/core';

const VALID_SEVERITIES = new Set(['error', 'warning', 'info', 'off']);

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

function validateConfig(value: unknown, path: string): LintConfig {
  if (!isPlainObject(value)) {
    throw new Error(`Config in ${path} must be a JSON object.`);
  }

  if (value.rules === undefined) {
    return {};
  }

  if (!isPlainObject(value.rules)) {
    throw new Error(`Config field "rules" in ${path} must be an object.`);
  }

  for (const [ruleId, entry] of Object.entries(value.rules)) {
    validateRuleEntry(ruleId, entry, path);
  }

  return value as LintConfig;
}

function validateRuleEntry(ruleId: string, entry: unknown, path: string): void {
  if (typeof entry === 'string') {
    assertSeverity(entry, ruleId, path);
    return;
  }

  if (Array.isArray(entry)) {
    if (entry.length < 1 || entry.length > 2) {
      throw new Error(`Rule "${ruleId}" in ${path} must be [severity] or [severity, options].`);
    }
    assertSeverity(entry[0], ruleId, path);
    return;
  }

  throw new Error(`Rule "${ruleId}" in ${path} must be a severity string or an array.`);
}

function assertSeverity(value: unknown, ruleId: string, path: string): void {
  if (typeof value !== 'string' || !VALID_SEVERITIES.has(value)) {
    throw new Error(
      `Rule "${ruleId}" in ${path} has invalid severity "${String(value)}". Expected one of: error, warning, info, off.`,
    );
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
