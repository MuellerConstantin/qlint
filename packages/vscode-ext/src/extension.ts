import * as vscode from 'vscode';
import { lint, type Diagnostic, type Fix, type LintConfig, type Severity } from '@qlint/core';
import { resolveConfig, type ResolvedConfig, type SettingsInput } from './config.js';

/**
 * Language identifier contributed for Qlik load scripts. Kept in sync with the
 * `contributes.languages` entry in package.json.
 */
const QLIK_LANGUAGE_ID = 'qlik';

/** Identifies qlint diagnostics in the editor UI and the Problems panel. */
const DIAGNOSTIC_SOURCE = 'qlint';

/** Command wired to the status bar item; reveals the active config source. */
const SHOW_CONFIG_COMMAND = 'qlint.showConfig';

/** Cache key standing in for documents that belong to no workspace folder. */
const LOOSE_FILE_KEY = '\0loose';

const SEVERITY_MAP: Record<Severity, vscode.DiagnosticSeverity> = {
  error: vscode.DiagnosticSeverity.Error,
  warning: vscode.DiagnosticSeverity.Warning,
  info: vscode.DiagnosticSeverity.Information,
};

/** A resolved config, or the message explaining why resolution failed. */
type ConfigResult =
  | { readonly ok: true; readonly resolved: ResolvedConfig }
  | { readonly ok: false; readonly message: string };

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

/** Whether a resolved config would run no rules at all. */
function isEmptyConfig(config: LintConfig): boolean {
  const noPresets = config.presets === undefined || (Array.isArray(config.presets) && config.presets.length === 0);
  const noRules = config.rules === undefined || Object.keys(config.rules).length === 0;
  return noPresets && noRules;
}

/**
 * Entry point invoked by the VS Code extension host once the extension is
 * activated. Wires up live linting for Qlik scripts, resolving the config per
 * document (a workspace `qlint.json` wins, otherwise the `qlint.*` settings),
 * exposes Core's autofixes as quick fixes, and reflects the active config source
 * in the status bar. Disposables are tracked against the extension
 * {@link vscode.ExtensionContext context} so they are torn down on deactivation.
 *
 * @param context - Extension context provided by the host.
 */
export function activate(context: vscode.ExtensionContext): void {
  const collection = vscode.languages.createDiagnosticCollection(DIAGNOSTIC_SOURCE);
  const output = vscode.window.createOutputChannel('qlint');
  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 0);
  statusBar.command = SHOW_CONFIG_COMMAND;
  context.subscriptions.push(collection, output, statusBar);

  // Resolved configs are cached per workspace folder (loose files share one
  // entry) so a `qlint.json` is not re-read on every keystroke. The cache is
  // cleared wholesale whenever settings or a `qlint.json` change.
  const cache = new Map<string, ConfigResult>();

  function getConfig(document: vscode.TextDocument): ConfigResult {
    const folderRoot = vscode.workspace.getWorkspaceFolder(document.uri)?.uri.fsPath;
    const key = folderRoot ?? LOOSE_FILE_KEY;
    const cached = cache.get(key);

    if (cached !== undefined) {
      return cached;
    }

    const settingsScope = vscode.workspace.getConfiguration('qlint', document.uri);
    const settings: SettingsInput = {
      presets: settingsScope.get('presets'),
      rules: settingsScope.get('rules'),
    };

    let result: ConfigResult;

    try {
      result = { ok: true, resolved: resolveConfig(folderRoot, settings) };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      result = { ok: false, message };
      output.appendLine(message);
      void vscode.window.showErrorMessage(`qlint: ${message}`);
    }

    cache.set(key, result);
    return result;
  }

  function refreshDiagnostics(document: vscode.TextDocument): void {
    if (document.languageId !== QLIK_LANGUAGE_ID) {
      collection.delete(document.uri);
      return;
    }

    const result = getConfig(document);

    if (!result.ok) {
      collection.delete(document.uri);
      return;
    }

    const diagnostics = lint(document.getText(), result.resolved.config).map(toVscodeDiagnostic);
    collection.set(document.uri, diagnostics);
  }

  function updateStatusBar(editor: vscode.TextEditor | undefined): void {
    const document = editor?.document;

    if (document === undefined || document.languageId !== QLIK_LANGUAGE_ID) {
      statusBar.hide();
      return;
    }

    const result = getConfig(document);

    if (!result.ok) {
      statusBar.text = '$(error) qlint: config error';
      statusBar.tooltip = result.message;
    } else if (result.resolved.source === 'qlint.json') {
      statusBar.text = '$(check) qlint: qlint.json';
      statusBar.tooltip = `Using ${result.resolved.path}`;
    } else if (isEmptyConfig(result.resolved.config)) {
      statusBar.text = '$(warning) qlint: no rules';
      statusBar.tooltip = 'No qlint.json found and no rules configured. Click to open settings.';
    } else {
      statusBar.text = '$(check) qlint: settings';
      statusBar.tooltip = 'Configured via VS Code settings. Click to open settings.';
    }

    statusBar.show();
  }

  function refreshAll(): void {
    cache.clear();

    for (const document of vscode.workspace.textDocuments) {
      refreshDiagnostics(document);
    }

    updateStatusBar(vscode.window.activeTextEditor);
  }

  const fixProvider: vscode.CodeActionProvider = {
    provideCodeActions(document, _range, actionContext): vscode.CodeAction[] {
      const qlintDiagnostics = actionContext.diagnostics.filter(
        (diagnostic) => diagnostic.source === DIAGNOSTIC_SOURCE,
      );

      if (qlintDiagnostics.length === 0) {
        return [];
      }

      const result = getConfig(document);

      if (!result.ok) {
        return [];
      }

      const coreDiagnostics = lint(document.getText(), result.resolved.config);
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

  const configWatcher = vscode.workspace.createFileSystemWatcher('**/qlint.json');

  for (const document of vscode.workspace.textDocuments) {
    refreshDiagnostics(document);
  }

  updateStatusBar(vscode.window.activeTextEditor);

  context.subscriptions.push(
    configWatcher,
    vscode.commands.registerCommand(SHOW_CONFIG_COMMAND, async () => {
      const document = vscode.window.activeTextEditor?.document;

      if (document !== undefined) {
        const result = getConfig(document);

        if (result.ok && result.resolved.source === 'qlint.json' && result.resolved.path !== undefined) {
          const opened = await vscode.workspace.openTextDocument(result.resolved.path);
          await vscode.window.showTextDocument(opened);
          return;
        }
      }

      await vscode.commands.executeCommand('workbench.action.openSettings', 'qlint');
    }),
    vscode.workspace.onDidOpenTextDocument((document) => refreshDiagnostics(document)),
    vscode.workspace.onDidChangeTextDocument((event) => refreshDiagnostics(event.document)),
    vscode.workspace.onDidCloseTextDocument((document) => collection.delete(document.uri)),
    vscode.window.onDidChangeActiveTextEditor((editor) => updateStatusBar(editor)),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('qlint')) {
        refreshAll();
      }
    }),
    configWatcher.onDidCreate(() => refreshAll()),
    configWatcher.onDidChange(() => refreshAll()),
    configWatcher.onDidDelete(() => refreshAll()),
    vscode.languages.registerCodeActionsProvider(QLIK_LANGUAGE_ID, fixProvider, {
      providedCodeActionKinds: [vscode.CodeActionKind.QuickFix],
    }),
  );
}

/**
 * Invoked by the VS Code extension host when the extension is deactivated. The
 * diagnostic collection, status bar item, output channel, and event
 * subscriptions are disposed automatically via the extension context, so there
 * is nothing to clean up here.
 */
export function deactivate(): void {}
