import { allRules, validateConfig, type LintConfig, type SeverityOrOff } from '@qlint/core';
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
const rulesLabel = document.getElementById('options-rules-label') as HTMLSpanElement;
const rulesHelp = document.getElementById('options-rules-help') as HTMLParagraphElement;
const ruleList = document.getElementById('options-rule-list') as HTMLUListElement;
const configLabel = document.getElementById('options-config-label') as HTMLSpanElement;
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

  if (Object.keys(rules).length === 0) {
    return {};
  }

  return { rules: rules as LintConfig['rules'] };
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
  state = await loadConfig();
  writeStateToEditor();
  writeStateToList();
}

void init();
