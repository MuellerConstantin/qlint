import { getEditor } from './editor';

const MOUNT_TIMEOUT_MS = 10_000;

function onEditorReady(editor: ReturnType<typeof getEditor> & object): void {
  console.log('[qlint:main] CodeMirror ready');

  const onFirstContent = (): void => {
    editor.off('change', onFirstContent);

    console.debug('[qlint:main] editor state', {
      chars: editor.getValue().length,
      readOnly: editor.getOption('readOnly'),
    });
    console.debug('[qlint:main] script:\n' + editor.getValue());
  };

  if (editor.getValue().length > 0) {
    onFirstContent();
  } else {
    editor.on('change', onFirstContent);
  }
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
