import { validateConfig, type LintConfig } from '@qlint/core';
import { loadConfig, saveConfig } from './util/config.js';

const title = document.getElementById('options-title') as HTMLHeadingElement;
const subtitle = document.getElementById('options-subtitle') as HTMLParagraphElement;
const configLabel = document.getElementById('options-config-label') as HTMLLabelElement;
const configHelp = document.getElementById('options-config-help') as HTMLParagraphElement;
const configField = document.getElementById('options-config') as HTMLTextAreaElement;
const feedback = document.getElementById('options-feedback') as HTMLDivElement;
const saveButton = document.getElementById('options-save') as HTMLButtonElement;
const resetButton = document.getElementById('options-reset') as HTMLButtonElement;
const form = document.getElementById('options-form') as HTMLFormElement;

const localizedTitle = chrome.i18n.getMessage('optionsTitle');

document.title = localizedTitle;
document.documentElement.lang = chrome.i18n.getUILanguage();

title.textContent = localizedTitle;
subtitle.textContent = chrome.i18n.getMessage('optionsSubtitle');
configLabel.textContent = chrome.i18n.getMessage('optionsConfigLabel');
configHelp.textContent = chrome.i18n.getMessage('optionsConfigHelp');
saveButton.textContent = chrome.i18n.getMessage('optionsSaveButton');
resetButton.textContent = chrome.i18n.getMessage('optionsResetButton');

function formatConfig(config: LintConfig): string {
  return JSON.stringify(config, null, 2);
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

async function persist(config: LintConfig): Promise<void> {
  try {
    await saveConfig(config);
    configField.value = formatConfig(config);
    showFeedback(chrome.i18n.getMessage('optionsConfigSaved'), 'success');
  } catch (err) {
    showFeedback(errorMessage(err), 'error');
  }
}

configField.addEventListener('input', clearFeedback);

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  let parsed: unknown;

  try {
    parsed = JSON.parse(configField.value);
  } catch (err) {
    showFeedback(`Invalid JSON: ${errorMessage(err)}`, 'error');
    return;
  }

  let config: LintConfig;

  try {
    config = validateConfig(parsed);
  } catch (err) {
    showFeedback(errorMessage(err), 'error');
    return;
  }

  await persist(config);
});

resetButton.addEventListener('click', async () => {
  const confirmed = window.confirm(chrome.i18n.getMessage('optionsResetConfirm'));

  if (!confirmed) {
    return;
  }

  await persist({});
});

async function init(): Promise<void> {
  const config = await loadConfig();
  configField.value = formatConfig(config);
}

void init();
