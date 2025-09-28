import * as vscode from 'vscode';
import { Schema } from '../common/types';
import { SchemaRef } from '../common/schemaRef';
import { findKeyword, enumNameFromFieldType } from '../util/helpers';
import { inferContext } from '../util/context';

export class IcmCompletionProvider implements vscode.CompletionItemProvider {
  constructor(private schemaRef: SchemaRef) {}

  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.ProviderResult<vscode.CompletionItem[]> {
    const items: vscode.CompletionItem[] = [];
    const line = document.lineAt(position.line).text;
    const textBefore = document.getText(new vscode.Range(new vscode.Position(0, 0), position));
    const schema = this.schemaRef.current;
    const ctx = inferContext(textBefore, position, schema);

    // 1) Keywords nach '[' oder am Blockanfang vor ':'
    if (ctx.expectKeyword) {
      for (const k of schema.keywords ?? []) {
        const ci = new vscode.CompletionItem(k.name, vscode.CompletionItemKind.Keyword);
        ci.detail = 'Keyword';
        ci.documentation = new vscode.MarkdownString(k.doc ?? '');
        items.push(ci);
      }
    }

    // 2) Fields nach 'Keyword:' oder nach '; '
    if (ctx.expectField && ctx.activeKeyword) {
      const keywordSpec = findKeyword(ctx.activeKeyword, schema);
      // Fallback auf alle Felder, falls ein Keyword keine spezifische Liste hat
      const allowedFieldsSource = keywordSpec?.fields
        ? (schema.fields ?? []).filter(f => keywordSpec.fields!.includes(f.name))
        : schema.fields ?? [];

      for (const f of allowedFieldsSource) {
        const ci = new vscode.CompletionItem(f.name, vscode.CompletionItemKind.Field);
        ci.detail = f.type ?? 'field';
        ci.documentation = f.doc ?? '';
        ci.insertText = new vscode.SnippetString(`${f.name}=\${1}`);
        items.push(ci);
      }
    }

    // 3) Enum-Werte direkt nach 'Field='
    if (ctx.enumForField) {
      const enumName = enumNameFromFieldType(ctx.enumForField.type ?? '');
      if (enumName) {
        const values = schema.enums?.[enumName] ?? [];
        for (const v of values) {
          const ci = new vscode.CompletionItem(v, vscode.CompletionItemKind.EnumMember);
          ci.detail = `${ctx.enumForField.name} ∈ ${enumName}`;
          items.push(ci);
        }
      }
    }

    // 4) Functions überall (mit Snippet-Args)
    for (const f of schema.functions ?? []) {
      const ci = new vscode.CompletionItem(f.name, vscode.CompletionItemKind.Function);
      ci.detail = f.signature ?? f.name;
      ci.documentation = f.doc ?? '';
      const args = f.args ?? [];
      ci.insertText = new vscode.SnippetString(`${f.name}(${args.map((a, i) => `\${${i + 1}:${a}}`).join(', ')})`);
      items.push(ci);
    }

    // 5) Examples bei leerer Zeile/Zeilenanfang
    if (/^\s*$/.test(line) && (schema.examples?.length ?? 0) > 0) {
      (schema.examples ?? []).forEach((ex, idx) => {
        const ci = new vscode.CompletionItem(`Example ${idx + 1}`, vscode.CompletionItemKind.Snippet);
        ci.detail = 'Beispiel aus dsl_icm.json';
        ci.insertText = ex;
        items.push(ci);
      });
    }

    return items;
  }
}
