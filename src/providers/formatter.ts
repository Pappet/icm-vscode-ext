import * as vscode from 'vscode';

export class IcmFormattingProvider implements vscode.DocumentFormattingEditProvider {
  provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.ProviderResult<vscode.TextEdit[]> {
    const edits: vscode.TextEdit[] = [];
    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i);
      if (line.isEmptyOrWhitespace) {
        continue;
      }

      let originalText = line.text;
      let newText = originalText;

      newText = newText.trimEnd();

      const blockMatch = newText.match(/(\[)(.*?)(\])/);
      if (blockMatch && blockMatch.index !== undefined) {
        const prefix = newText.substring(0, blockMatch.index + 1);
        let content = blockMatch[2];
        const suffix = newText.substring(blockMatch.index + 1 + content.length);

        content = content.replace(/:\s*/, ': ');
        content = content.replace(/\s*=\s*/g, ' = ');
        content = content.replace(/;\s*/g, '; ');
        content = content.replace(/,\s*/g, ', ');

        newText = prefix + content.trim() + suffix;
      }

      if (newText !== originalText) {
        edits.push(vscode.TextEdit.replace(line.range, newText));
      }
    }
    return edits;
  }
}