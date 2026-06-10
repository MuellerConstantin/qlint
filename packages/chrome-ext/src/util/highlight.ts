import type { Editor, TextMarker, Position } from 'codemirror';
import type { Diagnostic, Severity } from '@qlint/core';

const STYLE_ID = 'qlint-styles';
const TOOLTIP_HIDE_DELAY_MS = 200;

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

    #qlint-tooltip {
      position: fixed; z-index: 99999; max-width: 420px; padding: 8px 12px;
      border-radius: 4px; font: 13px/1.5 system-ui, sans-serif;
      color: #1f2937; background: #ffffff;
      border: 1px solid #e5e7eb;
      box-shadow: 0 2px 10px rgba(0,0,0,0.14); display: none;
      white-space: normal;
    }

    .qlint-tt-row { display: flex; align-items: flex-start; gap: 8px; }
    .qlint-tt-icon {
      flex: 0 0 auto; width: 14px; height: 14px; margin-top: 2px;
      border-radius: 50%; display: inline-flex; align-items: center;
      justify-content: center; font-size: 10px; font-weight: 700; color: #fff;
    }
  
    .qlint-tt-icon[data-severity='error']   { background: #ef4444; }
    .qlint-tt-icon[data-severity='warning'] { background: #f59e0b; }
    .qlint-tt-icon[data-severity='info']    { background: #3b82f6; }
    .qlint-tt-body { flex: 1 1 auto; }
    .qlint-tt-rule { color: #2563eb; cursor: pointer; }
    .qlint-tt-rule:hover { text-decoration: underline; }

    .qlint-tt-actions {
      margin: 8px -12px -8px;
      padding: 6px 12px;
      background: #f7f8fa;
      border-top: 1px solid #e5e7eb;
      border-radius: 0 0 4px 4px;
      display: flex; gap: 12px;
    }
    .qlint-tt-action {
      color: #2563eb; cursor: pointer; background: none;
      border: none; padding: 0; font: inherit; font-size: 12px;
    }
    .qlint-tt-action:hover { text-decoration: underline; }
  `;

  document.head.appendChild(style);
}

const SEVERITY_CLASS: Record<Severity, string> = {
  error: 'qlint-mark-error',
  warning: 'qlint-mark-warning',
  info: 'qlint-mark-info',
};

const SEVERITY_GLYPH: Record<Severity, string> = {
  error: '\u00d7',
  warning: '!',
  info: 'i',
};

export function createHighlighter(editor: Editor): {
  apply: (diagnostics: Diagnostic[]) => void;
  clear: () => void;
} {
  const byMarker = new Map<TextMarker, Diagnostic>();
  let tooltipElement: HTMLDivElement | null = null;
  let hideTimer: ReturnType<typeof setTimeout> | undefined;

  const clear = (): void => {
    for (const marker of byMarker.keys()) {
      marker.clear();
    }
    byMarker.clear();
  };

  const apply = (diagnostics: Diagnostic[]): void => {
    clear();

    for (const diagnostic of diagnostics) {
      const from = { line: diagnostic.range.start.line - 1, ch: diagnostic.range.start.column - 1 };
      const to = { line: diagnostic.range.end.line - 1, ch: diagnostic.range.end.column - 1 };

      if (from.line === to.line && from.ch === to.ch) {
        continue;
      }

      const marker = editor.markText(from, to, { className: SEVERITY_CLASS[diagnostic.severity] });
      byMarker.set(marker, diagnostic);
    }
  };

  const applyFix = (fix: NonNullable<Diagnostic['fix']>): void => {
    const from = editor.posFromIndex(fix.range.start);
    const to = editor.posFromIndex(fix.range.end);

    editor.replaceRange(fix.replacement, from, to, 'qlint-fix');

    if (tooltipElement) {
      tooltipElement.style.display = 'none';
    }
  };

  const hideTooltip = (): void => {
    hideTimer = setTimeout(() => {
      if (tooltipElement) {
        tooltipElement.style.display = 'none';
      }
    }, TOOLTIP_HIDE_DELAY_MS);
  };

  const showTooltipFor = (marker: TextMarker, diagnostic: Diagnostic): void => {
    clearTimeout(hideTimer);

    if (!tooltipElement) {
      tooltipElement = document.createElement('div');
      tooltipElement.id = 'qlint-tooltip';
      tooltipElement.addEventListener('mouseenter', () => clearTimeout(hideTimer));
      tooltipElement.addEventListener('mouseleave', hideTooltip);
      document.body.appendChild(tooltipElement);
    }

    const range = marker.find();

    if (!range || !('from' in range)) {
      return;
    }

    const icon = document.createElement('span');
    icon.className = 'qlint-tt-icon';
    icon.dataset.severity = diagnostic.severity;
    icon.textContent = SEVERITY_GLYPH[diagnostic.severity];

    const body = document.createElement('span');
    body.className = 'qlint-tt-body';
    body.append(`${diagnostic.message} `);

    const rule = document.createElement('a');
    rule.className = 'qlint-tt-rule';
    rule.textContent = `qlint(${diagnostic.ruleId})`;
    rule.href = `https://github.com/MuellerConstantin/qlint/blob/main/packages/core/docs/rules.md#${diagnostic.ruleId}`;
    rule.target = '_blank';
    rule.rel = 'noopener noreferrer';
    body.append(rule);

    const row = document.createElement('div');
    row.className = 'qlint-tt-row';
    row.append(icon, body);

    tooltipElement.replaceChildren(row);

    if (diagnostic.fix) {
      const actions = document.createElement('div');
      actions.className = 'qlint-tt-actions';

      const fixButton = document.createElement('button');
      fixButton.type = 'button';
      fixButton.className = 'qlint-tt-action';
      fixButton.textContent = 'Quick Fix';
      fixButton.addEventListener('click', () => {
        applyFix(diagnostic.fix!);
      });

      actions.append(fixButton);
      tooltipElement.append(actions);
    }

    const coords = editor.charCoords(range.from as Position, 'window');
    tooltipElement.style.display = 'block';
    tooltipElement.style.left = `${coords.left}px`;
    tooltipElement.style.top = `${coords.bottom + 4}px`;
  };

  const onMouseMove = (event: MouseEvent): void => {
    const pos = editor.coordsChar({ left: event.clientX, top: event.clientY }, 'window');

    for (const marker of editor.findMarksAt(pos)) {
      const diagnostic = byMarker.get(marker);

      if (diagnostic) {
        showTooltipFor(marker, diagnostic);
        return;
      }
    }

    hideTooltip();
  };

  editor.getWrapperElement().addEventListener('mousemove', onMouseMove);

  return { apply, clear };
}
