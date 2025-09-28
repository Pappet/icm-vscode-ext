import * as vscode from 'vscode';
import { SchemaRef } from '../common/schemaRef';
import { DIAGNOSTIC_CODES } from '../diagnostics';
import { findBestMatch } from '../util/levenshtein';

export class IcmCodeActionProvider implements vscode.CodeActionProvider {
  constructor(private schemaRef: SchemaRef) {}

  public static readonly providedCodeActionKinds = [
    vscode.CodeActionKind.QuickFix
  ];

  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    token: vscode.CancellationToken
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    for (const diagnostic of context.diagnostics) {
      switch (diagnostic.code) {
        case DIAGNOSTIC_CODES.MISSING_FORMAT:
          actions.push(this.createAddFormatAction(document, diagnostic));
          break;
        case DIAGNOSTIC_CODES.UNKNOWN_KEYWORD:
          const keywordSuggestion = this.createDidYouMeanAction(document, diagnostic, 'keyword');
          if (keywordSuggestion) {
            actions.push(keywordSuggestion);
          }
          break;
        case DIAGNOSTIC_CODES.UNKNOWN_FIELD:
            const fieldSuggestion = this.createDidYouMeanAction(document, diagnostic, 'field');
            if (fieldSuggestion) {
              actions.push(fieldSuggestion);
            }
            break;
      }
    }

    return actions;
  }

  private createAddFormatAction(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction {
    const action = new vscode.CodeAction('Standard "Format"-Parameter einfügen', vscode.CodeActionKind.QuickFix);
    action.diagnostics = [diagnostic];
    action.isPreferred = true;
    action.edit = new vscode.WorkspaceEdit();

    const blockRange = diagnostic.range;
    const fullBlockTextRange = document.getWordRangeAtPosition(blockRange.start, /\[[\s\S]*?\]/);
    if (fullBlockTextRange) {
        const insertPosition = fullBlockTextRange.end.translate(0, -1);
        const snippet = ` Format=!({})\CR; `;
        action.edit.insert(document.uri, insertPosition, snippet);
    }
    
    return action;
  }

  private createDidYouMeanAction(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
    type: 'keyword' | 'field'
  ): vscode.CodeAction | null {
    const misspelled = document.getText(diagnostic.range);
    const schema = this.schemaRef.current;

    // KORRIGIERT: Prüft auf 'undefined' bevor auf '.map' zugegriffen wird.
    const candidates = type === 'keyword' 
      ? (schema.keywords ?? []).map(k => k.name) 
      : (schema.fields ?? []).map(f => f.name);
      
    const bestMatch = findBestMatch(misspelled, candidates);

    if (!bestMatch) {
      return null;
    }

    const action = new vscode.CodeAction(`Meinten Sie '${bestMatch}'?`, vscode.CodeActionKind.QuickFix);
    action.diagnostics = [diagnostic];
    action.isPreferred = true;
    action.edit = new vscode.WorkspaceEdit();
    action.edit.replace(document.uri, diagnostic.range, bestMatch);
    return action;
  }
}