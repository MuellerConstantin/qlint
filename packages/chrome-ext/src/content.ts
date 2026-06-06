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

const DOM_POLL_TIMEOUT_MS = 10_000;

type Phase = 'inactive' | 'active';
let phase: Phase = 'inactive';

function couldBeQSE(): boolean {
  return document.getElementById(QLIK_SENSE_SELECTOR) !== null;
}

function urlLooksLikeScriptEditor(): boolean {
  return location.pathname.toLowerCase().includes(SCRIPT_EDITOR_URL_SEGMENT);
}

function couldBeScriptEditor(): boolean {
  return document.querySelector(SCRIPT_EDITOR_SELECTOR) !== null;
}

function isQlikScriptEditor(): boolean {
  return couldBeQSE() && urlLooksLikeScriptEditor() && couldBeScriptEditor();
}

function activate(): void {
  if (phase === 'active') {
    return;
  }

  phase = 'active';
  console.log('[qlint] activated — qlik script editor detected on', location.href);
}

function deactivate(): void {
  if (phase === 'inactive') {
    return;
  }

  phase = 'inactive';
  console.log('[qlint] deactivated — left script editor');
}

function classifyPage(): string {
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

function evaluate(): void {
  console.debug('[qlint] detection status:', classifyPage());

  if (isQlikScriptEditor()) {
    activate();
  } else {
    deactivate();
  }
}

function evaluateAndWatchForMount(): void {
  evaluate();

  if (phase === 'active' || !urlLooksLikeScriptEditor()) {
    return;
  }

  const start = performance.now();

  const observer = new MutationObserver(() => {
    evaluate();

    if (phase === 'active') {
      observer.disconnect();
      return;
    }
    if (performance.now() - start > DOM_POLL_TIMEOUT_MS) {
      console.debug('[qlint] editor mount watch timed out');
      observer.disconnect();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

console.log('[qlint] content script loaded on', location.href);

// Listener is required for detecting client side navigation in SPA applications.
chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === 'qlint:locationchange') evaluateAndWatchForMount();
});

evaluateAndWatchForMount();
