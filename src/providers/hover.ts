import * as vscode from 'vscode';
import { Schema } from '../common/types';
import { findKeyword, enumNameFromFieldType } from '../util/helpers';

export class IcmHoverProvider implements vscode.HoverProvider {
  constructor(private schema: Schema) {}

  provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.Hover> {
    const range = document.getWordRangeAtPosition(position, /[A-Za-z_][A-Za-z0-9_]*/);
    if (!range) return;

    const word = document.getText(range);
    const kw = findKeyword(word, this.schema);
    if (kw) {
      const md = new vscode.MarkdownString();
      md.appendCodeblock(kw.name, 'icm-query');
      if (kw.doc) md.appendMarkdown('\n\n' + kw.doc);
      if (kw.required_params?.length) {
        md.appendMarkdown('\n\n**Wichtige Parameter:** ' + kw.required_params.map(s => `\`${s}\``).join(', '));
      }
      return new vscode.Hover(md);
    }

    const f = this.schema.functions?.find(x => x.name === word);
    if (f) {
      const md = new vscode.MarkdownString();
      md.appendCodeblock(f.signature ?? f.name, 'plaintext');
      if (f.doc) md.appendMarkdown('\n\n' + f.doc);
      return new vscode.Hover(md);
    }

    const fld = this.schema.fields?.find(x => x.name === word);
    if (fld) {
      const md = new vscode.MarkdownString();
      md.appendCodeblock(`${fld.name}: ${fld.type ?? 'field'}`, 'plaintext');
      if (fld.doc) md.appendMarkdown('\n\n' + fld.doc);
      const en = enumNameFromFieldType(fld.type ?? '');
      if (en && this.schema.enums?.[en]) {
        md.appendMarkdown('\n\n**Werte:** ' + this.schema.enums[en].map(s => `\`${s}\``).join(', '));
      }
      return new vscode.Hover(md);
    }
  }
}