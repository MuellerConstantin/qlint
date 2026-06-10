// Qlik Sense Enterprise hosts the script editor under `/dataloadeditor/` on every install.
const SCRIPT_EDITOR_URL_SEGMENT = '/dataloadeditor/';

/*
 * `data-testid` is a deliberate Qlik convention used across the Sense UI
 * (hundreds of attributes per page) and survives CSS-in-JS hash churn between
 * builds. `script-editor-container` is the explicit wrapper for the editor
 * surface — present only once the editor is mounted.
 */
const SCRIPT_EDITOR_SELECTOR = '[data-testid="script-editor-container"]';

/*
 * Root container present on every Qlik Sense page (Hub, App viewer, QMC,
 * Data Load Editor) and on no other web app. Single getElementById lookup,
 * stable across Sense versions.
 */
const QLIK_SENSE_SELECTOR = 'qv-page-container';

export function couldBeQSE(): boolean {
  return document.getElementById(QLIK_SENSE_SELECTOR) !== null;
}

export function urlLooksLikeScriptEditor(): boolean {
  return location.pathname.toLowerCase().includes(SCRIPT_EDITOR_URL_SEGMENT);
}

export function couldBeScriptEditor(): boolean {
  return document.querySelector(SCRIPT_EDITOR_SELECTOR) !== null;
}

export function isQlikScriptEditor(): boolean {
  return couldBeQSE() && urlLooksLikeScriptEditor() && couldBeScriptEditor();
}

export function classifyPage(): string {
  if (!couldBeQSE()) {
    return 'not qse dataloadeditor (#qv-page-container missing)';
  }

  if (!urlLooksLikeScriptEditor()) {
    return `not qse dataloadeditor (url not matching)`;
  }

  if (!couldBeScriptEditor()) {
    return 'not qse dataloadeditor (dom not mounted yet)';
  }

  return 'qse detected';
}
