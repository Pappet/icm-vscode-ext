import * as vscode from 'vscode';
import { IcmCompletionProvider } from './providers/completion';
import { IcmHoverProvider } from './providers/hover';
import { IcmFormattingProvider } from './providers/formatter';
import { validateText } from './diagnostics';
import { loadSchema } from './util/schema';
import { Schema } from './common/types';

let schema: Schema;
let extensionRoot: string;

export function activate(context: vscode.ExtensionContext) {
  extensionRoot = context.extensionUri.fsPath;
  console.log('Herzlichen Glückwunsch, Ihre Extension "icm-dsl-support" ist jetzt aktiv!');
  vscode.window.showInformationMessage('ICM-DSL Extension wurde aktiviert!');
  schema = loadSchema(extensionRoot);

  context.subscriptions.push(
    vscode.commands.registerCommand('icm.reloadSchema', () => {
      schema = loadSchema(extensionRoot, true);
      vscode.window.showInformationMessage('ICM: Schema neu geladen.');
    })
  );

  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      { language: 'icm-query' },
      new IcmCompletionProvider(schema),
      '[', ':', ';', ' ', '=', '(', '"'
    )
  );

  context.subscriptions.push(
    vscode.languages.registerHoverProvider({ language: 'icm-query' }, new IcmHoverProvider(schema))
  );

  const diags = vscode.languages.createDiagnosticCollection('icm');
  context.subscriptions.push(diags);

  const validateDoc = (doc: vscode.TextDocument) => {
    if (doc.languageId !== 'icm-query') return;
    diags.set(doc.uri, validateText(doc.getText(), doc, schema));
  };

  vscode.workspace.onDidOpenTextDocument(validateDoc, null, context.subscriptions);
  vscode.workspace.onDidChangeTextDocument(e => validateDoc(e.document), null, context.subscriptions);
  vscode.workspace.textDocuments.forEach(validateDoc);

  context.subscriptions.push(
    vscode.languages.registerDocumentFormattingEditProvider({ language: 'icm-query' }, new IcmFormattingProvider())
  );
}

export function deactivate() {}