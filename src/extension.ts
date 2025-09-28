import * as vscode from 'vscode';
import { IcmCompletionProvider } from './providers/completion';
import { IcmHoverProvider } from './providers/hover';
import { IcmFormattingProvider } from './providers/formatter';
import { validateText } from './diagnostics';
import { loadSchema } from './util/schema';
import { SchemaRef } from './common/schemaRef';
import { IcmCodeActionProvider } from './providers/codeActions'; // HINZUGEFÜGT: Import für Code Actions

let schemaRef: SchemaRef;
let extensionRoot: string;

export function activate(context: vscode.ExtensionContext) {
  extensionRoot = context.extensionUri.fsPath;
  vscode.window.showInformationMessage('ICM-DSL Extension wurde aktiviert!');
  schemaRef = new SchemaRef(loadSchema(extensionRoot));

  const diags = vscode.languages.createDiagnosticCollection('icm');
  context.subscriptions.push(diags);

  const validateDoc = (doc: vscode.TextDocument) => {
    if (doc.languageId !== 'icm-query') return;
    diags.set(doc.uri, validateText(doc.getText(), doc, schemaRef.current));
  };

  context.subscriptions.push(
    vscode.commands.registerCommand('icm.reloadSchema', () => {
      schemaRef.current = loadSchema(extensionRoot, true);
      vscode.window.showInformationMessage('ICM: Schema neu geladen.');
      vscode.workspace.textDocuments.forEach(validateDoc);
    })
  );

  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      { language: 'icm-query' },
      new IcmCompletionProvider(schemaRef),
      '[', ':', ';', ' ', '=', '(', '"'
    )
  );

  context.subscriptions.push(
    vscode.languages.registerHoverProvider({ language: 'icm-query' }, new IcmHoverProvider(schemaRef))
  );

  // HINZUGEFÜGT: Registrierung des CodeActionProviders
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      { language: 'icm-query' },
      new IcmCodeActionProvider(schemaRef),
      {
        providedCodeActionKinds: IcmCodeActionProvider.providedCodeActionKinds
      }
    )
  );

  vscode.workspace.onDidOpenTextDocument(validateDoc, null, context.subscriptions);
  vscode.workspace.onDidChangeTextDocument(e => validateDoc(e.document), null, context.subscriptions);
  vscode.workspace.textDocuments.forEach(validateDoc);

  context.subscriptions.push(
    vscode.languages.registerDocumentFormattingEditProvider({ language: 'icm-query' }, new IcmFormattingProvider())
  );
}

export function deactivate() {}