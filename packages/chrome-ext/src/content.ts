import { classifyPage, isQlikScriptEditor, urlLooksLikeScriptEditor } from './detection.js';
import type { Message, Status, StatusMessage } from './types.js';
import { deriveQixConnection, QixConnection } from './qix.js';

const DOM_POLL_TIMEOUT_MS = 10_000;

let status: Status = 'inactive';
let qix: QixConnection | null = null;

function broadcastStatus(): void {
  const message: StatusMessage = { type: 'qlint:status', status };
  chrome.runtime.sendMessage(message).catch(() => {});
}

async function activate(): Promise<void> {
  if (status === 'active') {
    return;
  }

  qix = deriveQixConnection();

  try {
    const global = await qix.open();
    const version = await global.engineVersion();

    console.log('[qlint] qix connected — engine version:', version?.qComponentVersion ?? version);

    status = 'active';
    console.log('[qlint] activated — qlik script editor detected on', location.href);
    broadcastStatus();
  } catch (err) {
    status = 'errored';
    console.error('[qlint] qix connection failed:', err);
    broadcastStatus();
  }
}

async function deactivate(): Promise<void> {
  if (status === 'inactive') {
    return;
  }

  status = 'inactive';
  console.log('[qlint] deactivated — left script editor');
  broadcastStatus();

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

  if (status === 'active' || !urlLooksLikeScriptEditor()) {
    return;
  }

  const start = performance.now();

  const observer = new MutationObserver(() => {
    evaluate();

    if (status === 'active') {
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

  if (message?.type === 'qlint:get-status') {
    const response: StatusMessage = { type: 'qlint:status', status };
    sendResponse(response);
    return false;
  }

  return false;
});

evaluateAndWatchForMount();
