import { classifyPage, isQlikScriptEditor, urlLooksLikeScriptEditor } from './detection.js';
import type { Message, Phase, PhaseMessage } from './types.js';

const DOM_POLL_TIMEOUT_MS = 10_000;

let phase: Phase = 'inactive';

function broadcastPhase(): void {
  const message: PhaseMessage = { type: 'qlint:phase', phase };
  chrome.runtime.sendMessage(message).catch(() => {});
}

function activate(): void {
  if (phase === 'active') {
    return;
  }

  phase = 'active';
  console.log('[qlint] activated — qlik script editor detected on', location.href);
  broadcastPhase();
}

function deactivate(): void {
  if (phase === 'inactive') {
    return;
  }

  phase = 'inactive';
  console.log('[qlint] deactivated — left script editor');
  broadcastPhase();
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

chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
  if (message?.type === 'qlint:location-change') {
    evaluateAndWatchForMount();
    return false;
  }

  if (message?.type === 'qlint:get-phase') {
    const response: PhaseMessage = { type: 'qlint:phase', phase };
    sendResponse(response);
    return false;
  }

  return false;
});

evaluateAndWatchForMount();
