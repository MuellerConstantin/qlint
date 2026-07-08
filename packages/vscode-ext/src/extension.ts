import * as vscode from 'vscode';
import { lint, type Diagnostic, type Fix, type LintConfig, type Severity } from '@qlint/core';

/**
 * Language identifier contributed for Qlik load scripts. Kept in sync with the
 * `contributes.languages` entry in package.json.
 */
const QLIK_LANGUAGE_ID = 'qlik';

/** Identifies qlint diagnostics in the editor UI and the Problems panel. */
const DIAGNOSTIC_SOURCE = 'qlint';

/**
 * The lint configuration. The extension has no user-config surface yet, so it
 * explicitly runs the built-in `recommended` preset.
 */
const CONFIG: LintConfig = { presets: 'recommended' };

const SEVERITY_MAP: Record<Severity, vscode.DiagnosticSeverity> = {
  error: vscode.DiagnosticSeverity.Error,
  warning: vscode.DiagnosticSeverity.Warning,
  info: vscode.DiagnosticSeverity.Information,
};

/**
 * Maps a Core diagnostic range to a VS Code range. Core positions are 1-based
 * while VS Code positions are 0-based, so both line and column are shifted down
 * by one (floored at zero to stay within valid bounds).
 */
function toVscodeRange(range: Diagnostic['range']): vscode.Range {
  const { start, end } = range;
  return new vscode.Range(
    Math.max(0, start.line - 1),
    Math.max(0, start.column - 1),
    Math.max(0, end.line - 1),
    Math.max(0, end.column - 1),
  );
}

/** Maps a Core {@link Diagnostic} to a VS Code diagnostic. */
function toVscodeDiagnostic(diagnostic: Diagnostic): vscode.Diagnostic {
  const result = new vscode.Diagnostic(
    toVscodeRange(diagnostic.range),
    diagnostic.message,
    SEVERITY_MAP[diagnostic.severity],
  );
  result.source = DIAGNOSTIC_SOURCE;
  result.code = diagnostic.ruleId;

  return result;
}

/**
 * Lints a Qlik script document with the recommended preset and publishes the
 * results into the shared collection. Documents that are not Qlik scripts have
 * any stale diagnostics cleared instead.
 */
function refreshDiagnostics(document: vscode.TextDocument, collection: vscode.DiagnosticCollection): void {
  if (document.languageId !== QLIK_LANGUAGE_ID) {
    collection.delete(document.uri);
    return;
  }

  const diagnostics = lint(document.getText(), CONFIG).map(toVscodeDiagnostic);
  collection.set(document.uri, diagnostics);
}

/**
 * Builds a quick-fix code action that applies a Core {@link Fix} to `document`.
 * The fix's byte offsets are turned into a document range via
 * {@link vscode.TextDocument.positionAt}, and the action is linked back to its
 * diagnostic so the editor marks the problem as fixable.
 */
function createFixAction(document: vscode.TextDocument, diagnostic: vscode.Diagnostic, fix: Fix): vscode.CodeAction {
  const action = new vscode.CodeAction(`Fix: ${diagnostic.message}`, vscode.CodeActionKind.QuickFix);
  action.diagnostics = [diagnostic];
  action.isPreferred = true;

  action.edit = new vscode.WorkspaceEdit();
  action.edit.replace(
    document.uri,
    new vscode.Range(document.positionAt(fix.range.start), document.positionAt(fix.range.end)),
    fix.replacement,
  );

  return action;
}

/**
 * Surfaces Core's autofixes as VS Code quick fixes. For each qlint diagnostic
 * the editor asks about, the document is re-linted and the matching Core
 * diagnostic (by rule id and range) is checked for a fix; when present, a
 * quick-fix action carrying the corresponding edit is offered.
 */
const fixProvider: vscode.CodeActionProvider = {
  provideCodeActions(document, _range, context): vscode.CodeAction[] {
    const qlintDiagnostics = context.diagnostics.filter((diagnostic) => diagnostic.source === DIAGNOSTIC_SOURCE);

    if (qlintDiagnostics.length === 0) {
      return [];
    }

    const coreDiagnostics = lint(document.getText(), CONFIG);
    const actions: vscode.CodeAction[] = [];

    for (const diagnostic of qlintDiagnostics) {
      const match = coreDiagnostics.find(
        (core) =>
          core.fix !== undefined &&
          core.ruleId === diagnostic.code &&
          toVscodeRange(core.range).isEqual(diagnostic.range),
      );

      if (match?.fix) {
        actions.push(createFixAction(document, diagnostic, match.fix));
      }
    }

    return actions;
  },
};

/**
 * Entry point invoked by the VS Code extension host once the extension is
 * activated. Wires up live linting for Qlik scripts (Core's recommended preset)
 * and exposes Core's autofixes as quick fixes. Disposables are tracked against
 * the extension {@link vscode.ExtensionContext context} so they are torn down on
 * deactivation.
 *
 * @param context - Extension context provided by the host.
 */
export function activate(context: vscode.ExtensionContext): void {
  const collection = vscode.languages.createDiagnosticCollection(DIAGNOSTIC_SOURCE);
  context.subscriptions.push(collection);

  for (const document of vscode.workspace.textDocuments) {
    refreshDiagnostics(document, collection);
  }

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((document) => refreshDiagnostics(document, collection)),
    vscode.workspace.onDidChangeTextDocument((event) => refreshDiagnostics(event.document, collection)),
    vscode.workspace.onDidCloseTextDocument((document) => collection.delete(document.uri)),
    vscode.languages.registerCodeActionsProvider(QLIK_LANGUAGE_ID, fixProvider, {
      providedCodeActionKinds: [vscode.CodeActionKind.QuickFix],
    }),
  );
}

/**
 * Invoked by the VS Code extension host when the extension is deactivated. The
 * diagnostic collection and event subscriptions are disposed automatically via
 * the extension context, so there is nothing to clean up here.
 */
export function deactivate(): void {}
