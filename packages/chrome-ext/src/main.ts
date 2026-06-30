import { debounce } from './util/debounce';
import { getEditor } from './util/editor';
import { format, lint, recommended } from '@qlint/core';
import { createHighlighter, injectStyles } from './util/highlight';
import type { BridgeMessage, DiagnosticCounts, DiagnosticsBridgeMessage, GetConfigBridgeMessage } from './types.js';
import type { Diagnostic, LintConfig } from '@qlint/core';
import type { Editor } from 'codemirror';

const MOUNT_TIMEOUT_MS = 10_000;

let currentConfig: LintConfig = {};
let triggerLint: (() => void) | undefined;
let editorRef: Editor | undefined;

function countBySeverity(diagnostics: Diagnostic[]): DiagnosticCounts {
  const counts: DiagnosticCounts = { error: 0, warning: 0, info: 0 };

  for (const diagnostic of diagnostics) {
    counts[diagnostic.severity]++;
  }

  return counts;
}

function fixAll(editor: Editor): void {
  const source = editor.getValue();

  try {
    const { output, fixed } = format(source, recommended, currentConfig);

    if (fixed === 0 || output === source) {
      return;
    }

    const lastLine = editor.lastLine();
    const end = { line: lastLine, ch: (editor.getLine(lastLine) ?? '').length };
    editor.replaceRange(output, { line: 0, ch: 0 }, end, '+qlint-fix-all');
  } catch (error) {
    console.warn('[qlint:main] fix-all failed', error);
  }
}

function onEditorReady(editor: ReturnType<typeof getEditor> & object): void {
  console.log('[qlint:main] CodeMirror ready');

  editorRef = editor;
  injectStyles();
  const highlighter = createHighlighter(editor);

  const onScriptChange = debounce((): void => {
    const diagnostics = lint(editor.getValue(), recommended, currentConfig);
    highlighter.apply(diagnostics);

    const fixable = diagnostics.reduce((count, diagnostic) => (diagnostic.fix ? count + 1 : count), 0);

    const message: DiagnosticsBridgeMessage = {
      source: 'qlint-main',
      type: 'qlint:diagnostics',
      counts: countBySeverity(diagnostics),
      fixable,
    };
    window.postMessage(message, window.location.origin);
  }, 150);

  editor.on('change', onScriptChange);
  triggerLint = onScriptChange;

  onScriptChange();
}

window.addEventListener('message', (event: MessageEvent) => {
  if (event.source !== window) {
    return;
  }

  const data = event.data as BridgeMessage | undefined;

  if (data?.source !== 'qlint-content') {
    return;
  }

  if (data.type === 'qlint:config') {
    currentConfig = data.config;
    triggerLint?.();
    return;
  }

  if (data.type === 'qlint:fix-all' && editorRef) {
    fixAll(editorRef);
  }
});

const getConfigRequest: GetConfigBridgeMessage = { source: 'qlint-main', type: 'qlint:get-config' };
window.postMessage(getConfigRequest, window.location.origin);

function waitForEditor(): void {
  const editor = getEditor();

  if (editor) {
    onEditorReady(editor);
    return;
  }

  const start = performance.now();

  const observer = new MutationObserver(() => {
    const found = getEditor();

    if (found) {
      observer.disconnect();
      onEditorReady(found);
      return;
    }

    if (performance.now() - start > MOUNT_TIMEOUT_MS) {
      observer.disconnect();
      console.warn('[qlint:main] CodeMirror mount watch timed out at', location.href);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

waitForEditor();
