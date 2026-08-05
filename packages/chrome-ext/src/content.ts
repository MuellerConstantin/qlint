import { classifyPage, isQlikScriptEditor, urlLooksLikeScriptEditor } from './util/detection.js';
import { loadConfig, onConfigChange } from './util/config.js';
import type { LintConfig } from '@qlinter/core';
import type {
  Message,
  Status,
  StatusMessage,
  DiagnosticCounts,
  BridgeMessage,
  ConfigBridgeMessage,
  DiagnosticsMessage,
  FixAllBridgeMessage,
} from './types.js';

const DOM_POLL_TIMEOUT_MS = 10_000;

let status: Status = 'not-applicable';
let diagnosticCounts: DiagnosticCounts | null = null;
let fixableCount = 0;
let currentConfig: LintConfig = {};

function postConfig(): void {
  const message: ConfigBridgeMessage = {
    source: 'qlinter-content',
    type: 'qlinter:config',
    config: currentConfig,
  };
  window.postMessage(message, window.location.origin);
}

void loadConfig().then((config) => {
  currentConfig = config;
  postConfig();
});

onConfigChange((config) => {
  currentConfig = config;
  postConfig();
});

function broadcastStatus(): void {
  const message: StatusMessage = { type: 'qlinter:status', status };
  chrome.runtime.sendMessage(message).catch(() => {
    // Intentionally ignored
  });
}

async function activate(): Promise<void> {
  if (status === 'active') {
    return;
  }

  status = 'active';
  diagnosticCounts = null;
  fixableCount = 0;
  console.log('[qlinter] activated — qlik script editor detected on', location.href);
  broadcastStatus();
}

async function deactivate(): Promise<void> {
  if (status === 'not-applicable') {
    return;
  }

  status = 'not-applicable';
  diagnosticCounts = null;
  fixableCount = 0;
  console.log('[qlinter] deactivated — left script editor');
  broadcastStatus();
}

function evaluate(): void {
  console.debug('[qlinter] detection status:', classifyPage());

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
      console.debug('[qlinter] editor mount watch timed out');
      observer.disconnect();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

console.log('[qlinter] content script loaded on', location.href);

chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
  if (message?.type === 'qlinter:location-change') {
    evaluateAndWatchForMount();
    return false;
  }

  if (message?.type === 'qlinter:get-status') {
    const response: StatusMessage = { type: 'qlinter:status', status };
    sendResponse(response);
    return false;
  }

  if (message?.type === 'qlinter:get-diagnostics') {
    const response: DiagnosticsMessage | null = diagnosticCounts
      ? { type: 'qlinter:diagnostics', counts: diagnosticCounts, fixable: fixableCount }
      : null;
    sendResponse(response);
    return false;
  }

  if (message?.type === 'qlinter:fix-all') {
    const bridge: FixAllBridgeMessage = { source: 'qlinter-content', type: 'qlinter:fix-all' };
    window.postMessage(bridge, window.location.origin);
    return false;
  }

  return false;
});

window.addEventListener('message', (event: MessageEvent) => {
  if (event.source !== window) {
    return;
  }

  const data = event.data as BridgeMessage | undefined;

  if (data?.source !== 'qlinter-main') {
    return;
  }

  if (data.type === 'qlinter:get-config') {
    postConfig();
    return;
  }

  if (data.type === 'qlinter:diagnostics') {
    diagnosticCounts = data.counts;
    fixableCount = data.fixable;
    const message: DiagnosticsMessage = {
      type: 'qlinter:diagnostics',
      counts: diagnosticCounts,
      fixable: fixableCount,
    };
    chrome.runtime.sendMessage(message).catch(() => {});
  }
});

evaluateAndWatchForMount();
