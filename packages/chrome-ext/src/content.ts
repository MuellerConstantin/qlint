import { classifyPage, isQlikScriptEditor, urlLooksLikeScriptEditor } from './detection.js';

const DOM_POLL_TIMEOUT_MS = 10_000;

type Phase = 'inactive' | 'active';
let phase: Phase = 'inactive';

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
