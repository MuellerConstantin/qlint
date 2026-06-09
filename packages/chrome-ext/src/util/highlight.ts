import type { Editor, TextMarker } from 'codemirror';
import type { Diagnostic, Severity } from '@qlint/core';

const STYLE_ID = 'qlint-styles';

export function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement('style');

  style.id = STYLE_ID;
  style.textContent = `
    .qlint-mark-error   { text-decoration: red wavy underline; text-decoration-skip-ink: none; }
    .qlint-mark-warning { text-decoration: orange wavy underline; text-decoration-skip-ink: none; }
    .qlint-mark-info    { text-decoration: #3b82f6 dotted underline; }
  `;

  document.head.appendChild(style);
}

const SEVERITY_CLASS: Record<Severity, string> = {
  error: 'qlint-mark-error',
  warning: 'qlint-mark-warning',
  info: 'qlint-mark-info',
};

export function createHighlighter(editor: Editor): {
  apply: (diagnostics: Diagnostic[]) => void;
  clear: () => void;
} {
  let markers: TextMarker[] = [];

  const clear = (): void => {
    for (const marker of markers) {
      marker.clear();
    }
    markers = [];
  };

  const apply = (diagnostics: Diagnostic[]): void => {
    clear();

    for (const diagnostic of diagnostics) {
      const from = { line: diagnostic.range.start.line - 1, ch: diagnostic.range.start.column - 1 };
      const to = { line: diagnostic.range.end.line - 1, ch: diagnostic.range.end.column - 1 };

      if (from.line === to.line && from.ch === to.ch) {
        continue;
      }

      const marker = editor.markText(from, to, {
        className: SEVERITY_CLASS[diagnostic.severity],
        title: `${diagnostic.message} (${diagnostic.ruleId})`,
      });

      markers.push(marker);
    }
  };

  return { apply, clear };
}
