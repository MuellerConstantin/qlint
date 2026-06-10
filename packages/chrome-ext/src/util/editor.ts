import type { Editor } from 'codemirror';

/**
 * The Qlik Sense Data Load Editor is {@link https://codemirror.net/ | CodeMirror} based.
 */
const EDITOR_SELECTOR = 'scripteditor-code-area .CodeMirror';

interface CodeMirrorHostElement extends HTMLElement {
  CodeMirror?: Editor;
}

export function getEditor(): Editor | null {
  const editorElement = document.querySelector<CodeMirrorHostElement>(EDITOR_SELECTOR);

  if (!editorElement) {
    return null;
  }

  return editorElement?.CodeMirror ?? null;
}
