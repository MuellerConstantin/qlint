import {
  allRules,
  presetNames,
  validateConfig,
  type LintConfig,
  type PresetName,
  type SeverityOrOff,
} from '@qlint/core';
import CodeMirror from 'codemirror';
import 'codemirror/mode/javascript/javascript.js';
import 'codemirror/addon/edit/matchbrackets.js';
import 'codemirror/addon/edit/closebrackets.js';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/material-darker.css';
import { loadConfig, saveConfig } from './util/config.js';

type SeverityChoice = SeverityOrOff | 'default';

const SEVERITY_CHOICES: readonly SeverityChoice[] = ['default', 'error', 'warning', 'info', 'off'];

const SYNC_DEBOUNCE_MS = 150;

const title = document.getElementById('options-title') as HTMLHeadingElement;
const subtitle = document.getElementById('options-subtitle') as HTMLParagraphElement;
const presetsLabel = document.getElementById('options-presets-label') as HTMLSpanElement;
const presetsHelp = document.getElementById('options-presets-help') as HTMLParagraphElement;
const presetList = document.getElementById('options-preset-list') as HTMLUListElement;
const presetSelect = document.getElementById('options-preset-select') as HTMLSelectElement;
const presetAddButton = document.getElementById('options-preset-add') as HTMLButtonElement;
const rulesLabel = document.getElementById('options-rules-label') as HTMLSpanElement;
const rulesHelp = document.getElementById('options-rules-help') as HTMLParagraphElement;
const ruleList = document.getElementById('options-rule-list') as HTMLUListElement;
const advancedDetails = document.getElementById('options-advanced') as HTMLDetailsElement;
const configLabel = document.getElementById('options-config-label') as HTMLElement;
const configHelp = document.getElementById('options-config-help') as HTMLParagraphElement;
const editorMount = document.getElementById('options-config') as HTMLDivElement;
const feedback = document.getElementById('options-feedback') as HTMLDivElement;
const saveButton = document.getElementById('options-save') as HTMLButtonElement;
const resetButton = document.getElementById('options-reset') as HTMLButtonElement;
const form = document.getElementById('options-form') as HTMLFormElement;

const localizedTitle = chrome.i18n.getMessage('optionsTitle');

document.title = localizedTitle;
document.documentElement.lang = chrome.i18n.getUILanguage();

title.textContent = localizedTitle;
subtitle.textContent = chrome.i18n.getMessage('optionsSubtitle');
presetsLabel.textContent = chrome.i18n.getMessage('optionsPresetsLabel');
presetsHelp.textContent = chrome.i18n.getMessage('optionsPresetsHelp');
presetAddButton.textContent = chrome.i18n.getMessage('optionsPresetAddButton');
rulesLabel.textContent = chrome.i18n.getMessage('optionsRulesLabel');
rulesHelp.textContent = chrome.i18n.getMessage('optionsRulesHelp');
configLabel.textContent = chrome.i18n.getMessage('optionsConfigLabel');
configHelp.textContent = chrome.i18n.getMessage('optionsConfigHelp');
saveButton.textContent = chrome.i18n.getMessage('optionsSaveButton');
resetButton.textContent = chrome.i18n.getMessage('optionsResetButton');

let state: LintConfig = {};
const ruleSelects = new Map<string, HTMLSelectElement>();

function formatConfig(config: LintConfig): string {
  return JSON.stringify(config, null, 2);
}

function severityFor(ruleId: string): SeverityChoice {
  const entry = (state.rules as Record<string, unknown> | undefined)?.[ruleId];

  if (entry === undefined) {
    return 'default';
  }

  if (typeof entry === 'string') {
    return entry as SeverityOrOff;
  }

  if (Array.isArray(entry) && typeof entry[0] === 'string') {
    return entry[0] as SeverityOrOff;
  }

  return 'default';
}

function withSeverity(ruleId: string, severity: SeverityChoice): LintConfig {
  const rules: Record<string, unknown> = { ...(state.rules as Record<string, unknown> | undefined) };

  if (severity === 'default') {
    delete rules[ruleId];
  } else {
    const existing = rules[ruleId];

    if (Array.isArray(existing) && existing.length === 2) {
      rules[ruleId] = [severity, existing[1]];
    } else {
      rules[ruleId] = severity;
    }
  }

  const next: LintConfig = { ...state };

  if (Object.keys(rules).length === 0) {
    delete next.rules;
  } else {
    next.rules = rules as LintConfig['rules'];
  }

  return next;
}

/** The currently selected presets, normalized to an array. */
function presetsOf(config: LintConfig): PresetName[] {
  const presets = config.presets;

  if (presets === undefined) {
    return [];
  }

  return Array.isArray(presets) ? [...presets] : [presets];
}

/**
 * Returns `state` with its preset list replaced. An empty list drops the
 * `presets` key entirely (nothing is applied implicitly); a single entry is
 * stored as a plain string to keep the JSON idiomatic, more as an array.
 */
function withPresets(next: readonly PresetName[]): LintConfig {
  const config: LintConfig = { ...state };

  if (next.length === 0) {
    delete config.presets;
  } else {
    config.presets = next.length === 1 ? next[0] : [...next];
  }

  return config;
}

function showFeedback(text: string, kind: 'error' | 'success'): void {
  feedback.textContent = text;
  feedback.classList.toggle('feedback-error', kind === 'error');
  feedback.classList.toggle('feedback-success', kind === 'success');
  feedback.hidden = false;
}

function clearFeedback(): void {
  feedback.hidden = true;
  feedback.textContent = '';
  feedback.classList.remove('feedback-error', 'feedback-success');
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

const darkMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

const editor = CodeMirror(editorMount, {
  value: '',
  mode: { name: 'javascript', json: true },
  lineNumbers: true,
  matchBrackets: true,
  autoCloseBrackets: true,
  smartIndent: true,
  indentUnit: 2,
  tabSize: 2,
  indentWithTabs: false,
  theme: darkMediaQuery.matches ? 'material-darker' : 'default',
});

darkMediaQuery.addEventListener('change', (event) => {
  editor.setOption('theme', event.matches ? 'material-darker' : 'default');
});

advancedDetails.addEventListener('toggle', () => {
  if (advancedDetails.open) {
    editor.refresh();
  }
});

function buildRuleList(): void {
  ruleSelects.clear();
  ruleList.replaceChildren();

  for (const rule of allRules) {
    const row = document.createElement('li');
    row.className = 'rule-row';

    const id = document.createElement('a');
    id.className = 'rule-id';
    id.textContent = rule.id;
    id.href = `https://github.com/MuellerConstantin/qlint/blob/main/packages/core/docs/rules.md#${rule.id}`;
    id.target = '_blank';
    id.rel = 'noopener noreferrer';

    const select = document.createElement('select');
    select.className = 'rule-severity';
    select.setAttribute('aria-label', rule.id);

    for (const choice of SEVERITY_CHOICES) {
      const option = document.createElement('option');
      option.value = choice;
      option.textContent = choice;
      select.appendChild(option);
    }

    select.addEventListener('change', () => {
      state = withSeverity(rule.id, select.value as SeverityChoice);
      writeStateToEditor();
      clearFeedback();
    });

    row.append(id, select);
    ruleList.appendChild(row);
    ruleSelects.set(rule.id, select);
  }
}

function writeStateToList(): void {
  for (const [ruleId, select] of ruleSelects) {
    select.value = severityFor(ruleId);
  }
}

/** Wires the "add preset" control once. Options are (re)populated on render. */
function buildPresetControls(): void {
  presetAddButton.addEventListener('click', () => {
    const value = presetSelect.value as PresetName | '';

    if (value === '') {
      return;
    }

    const selected = presetsOf(state);

    if (selected.includes(value)) {
      return;
    }

    state = withPresets([...selected, value]);
    writeStateToEditor();
    writeStateToPresetList();
    clearFeedback();
  });
}

/**
 * Renders the selected presets as a removable list and refills the add-dropdown
 * with the presets that are not yet selected. Built as a list from the start so
 * that supporting multiple presets is only a matter of `presetNames` growing.
 */
function writeStateToPresetList(): void {
  const selected = presetsOf(state);

  presetList.replaceChildren();

  for (const preset of selected) {
    const row = document.createElement('li');
    row.className = 'preset-row';

    const name = document.createElement('span');
    name.className = 'preset-name';
    name.textContent = preset;

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'preset-remove';
    remove.textContent = '×';
    remove.setAttribute('aria-label', chrome.i18n.getMessage('optionsPresetRemove', [preset]));
    remove.addEventListener('click', () => {
      state = withPresets(selected.filter((entry) => entry !== preset));
      writeStateToEditor();
      writeStateToPresetList();
      clearFeedback();
    });

    row.append(name, remove);
    presetList.appendChild(row);
  }

  presetList.hidden = selected.length === 0;

  const available = presetNames.filter((preset) => !selected.includes(preset));

  presetSelect.replaceChildren();

  for (const preset of available) {
    const option = document.createElement('option');
    option.value = preset;
    option.textContent = preset;
    presetSelect.appendChild(option);
  }

  presetSelect.disabled = available.length === 0;
  presetAddButton.disabled = available.length === 0;
}

let suppressEditorChange = false;

function writeStateToEditor(): void {
  suppressEditorChange = true;

  try {
    editor.setValue(formatConfig(state));
  } finally {
    suppressEditorChange = false;
  }
}

let syncTimer: ReturnType<typeof setTimeout> | undefined;

editor.on('change', () => {
  if (suppressEditorChange) {
    return;
  }

  clearFeedback();

  if (syncTimer !== undefined) {
    clearTimeout(syncTimer);
  }

  syncTimer = setTimeout(() => {
    syncTimer = undefined;

    try {
      const parsed = JSON.parse(editor.getValue()) as unknown;
      state = validateConfig(parsed);
      writeStateToList();
      writeStateToPresetList();
    } catch {
      // Invalid JSON or schema: leave state and rule list on last good value.
    }
  }, SYNC_DEBOUNCE_MS);
});

async function persist(next: LintConfig): Promise<void> {
  try {
    await saveConfig(next);
    state = next;
    writeStateToEditor();
    writeStateToList();
    writeStateToPresetList();
    showFeedback(chrome.i18n.getMessage('optionsConfigSaved'), 'success');
  } catch (err) {
    showFeedback(errorMessage(err), 'error');
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  let parsed: unknown;

  try {
    parsed = JSON.parse(editor.getValue());
  } catch (err) {
    showFeedback(`Invalid JSON: ${errorMessage(err)}`, 'error');
    return;
  }

  let next: LintConfig;

  try {
    next = validateConfig(parsed);
  } catch (err) {
    showFeedback(errorMessage(err), 'error');
    return;
  }

  await persist(next);
});

resetButton.addEventListener('click', async () => {
  const confirmed = window.confirm(chrome.i18n.getMessage('optionsResetConfirm'));

  if (!confirmed) {
    return;
  }

  await persist({});
});

async function init(): Promise<void> {
  buildRuleList();
  buildPresetControls();
  state = await loadConfig();
  writeStateToEditor();
  writeStateToList();
  writeStateToPresetList();
}

void init();
