import * as vscode from 'vscode';

/**
 * Entry point invoked by the VS Code extension host once the extension is
 * activated. Wires up the extension's contributions and registers their
 * disposables against the extension {@link vscode.ExtensionContext context} so
 * they are torn down automatically on deactivation.
 *
 * @param context - Extension context provided by the host.
 */
export function activate(context: vscode.ExtensionContext): void {
  const about = vscode.commands.registerCommand('qlint.about', () => {
    void vscode.window.showInformationMessage('qlint is active.');
  });

  context.subscriptions.push(about);
}

/**
 * Invoked by the VS Code extension host when the extension is deactivated.
 * Disposables registered on the extension context are released automatically,
 * so there is nothing to clean up here yet.
 */
export function deactivate(): void {}
