import { debounce } from './util/debounce';
import { getEditor } from './util/editor';
import { lint, recommended } from '@qlint/core';
import { createHighlighter, injectStyles } from './util/highlight';

const MOUNT_TIMEOUT_MS = 10_000;

function onEditorReady(editor: ReturnType<typeof getEditor> & object): void {
  console.log('[qlint:main] CodeMirror ready');

  injectStyles();
  const highlighter = createHighlighter(editor);

  const onScriptChange = debounce((): void => {
    const diagnostics = lint(editor.getValue(), recommended);
    highlighter.apply(diagnostics);
  }, 150);

  editor.on('change', onScriptChange);

  onScriptChange();
}

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
