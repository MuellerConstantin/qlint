import { classifyPage, isQlikScriptEditor, urlLooksLikeScriptEditor } from './detection.js';
import type { Message, Phase, PhaseMessage } from './types.js';
import { deriveQixConnection, QixConnection } from './qix.js';

const DOM_POLL_TIMEOUT_MS = 10_000;

let phase: Phase = 'inactive';
let qix: QixConnection | null = null;

function broadcastPhase(): void {
  const message: PhaseMessage = { type: 'qlint:phase', phase };
  chrome.runtime.sendMessage(message).catch(() => {});
}

async function activate(): Promise<void> {
  if (phase === 'active') {
    return;
  }

  qix = deriveQixConnection();

  try {
    const global = await qix.open();
    const version = await global.engineVersion();

    console.log('[qlint] qix connected — engine version:', version?.qComponentVersion ?? version);

    phase = 'active';
    console.log('[qlint] activated — qlik script editor detected on', location.href);
    broadcastPhase();
  } catch (err) {
    console.error('[qlint] qix connection failed:', err);
  }
}

async function deactivate(): Promise<void> {
  if (phase === 'inactive') {
    return;
  }

  phase = 'inactive';
  console.log('[qlint] deactivated — left script editor');
  broadcastPhase();

  void qix?.close();
  qix = null;

  console.log('[qlint] qix disconnected');
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
