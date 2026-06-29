import type { LintConfig } from './runner.js';

const VALID_SEVERITIES = new Set(['error', 'warning', 'info', 'off']);

export function validateConfig(value: unknown, sourceLabel?: string): LintConfig {
  const where = sourceLabel ? ` in ${sourceLabel}` : '';

  if (!isPlainObject(value)) {
    throw new Error(`Config${where} must be a JSON object.`);
  }

  for (const key of Object.keys(value)) {
    if (key !== 'rules') {
      throw new Error(`Config${where} has unknown key "${key}". Only "rules" is supported.`);
    }
  }

  if (value.rules === undefined) {
    return {};
  }

  if (!isPlainObject(value.rules)) {
    throw new Error(`Config field "rules"${where} must be an object.`);
  }

  for (const [ruleId, entry] of Object.entries(value.rules)) {
    validateRuleEntry(ruleId, entry, where);
  }

  return value as LintConfig;
}

function validateRuleEntry(ruleId: string, entry: unknown, where: string): void {
  if (typeof entry === 'string') {
    assertSeverity(entry, ruleId, where);
    return;
  }

  if (Array.isArray(entry)) {
    if (entry.length < 1 || entry.length > 2) {
      throw new Error(`Rule "${ruleId}"${where} must be [severity] or [severity, options].`);
    }
    assertSeverity(entry[0], ruleId, where);
    return;
  }

  throw new Error(`Rule "${ruleId}"${where} must be a severity string or an array.`);
}

function assertSeverity(value: unknown, ruleId: string, where: string): void {
  if (typeof value !== 'string' || !VALID_SEVERITIES.has(value)) {
    throw new Error(
      `Rule "${ruleId}"${where} has invalid severity "${String(value)}". Expected one of: error, warning, info, off.`,
    );
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
