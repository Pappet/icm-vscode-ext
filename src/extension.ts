import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// Angepasste Typdefinitionen, um die neue Schema-Struktur zu unterstützen
type KeywordSpec = { 
  name: string; 
  doc?: string; 
  required_params?: string[];
  fields?: string[]; // Hinzugefügt: Liste der erlaubten Felder
};
type FunctionSpec = { name: string; signature?: string; doc?: string; args?: string[] };
type FieldSpec = { name: string; type?: string; doc?: string };
type Schema = {
  keywords?: KeywordSpec[];
  functions?: FunctionSpec[];
  fields?: FieldSpec[];
  enums?: Record<string, string[]>;
  examples?: string[];
};

let schema: Schema = { keywords: [], functions: [], fields: [], enums: {}, examples: [] };
let extensionRoot = '';

export function activate(context: vscode.ExtensionContext) {
  extensionRoot = context.extensionUri.fsPath;
  console.log('Herzlichen Glückwunsch, Ihre Extension "icm-dsl-support" ist jetzt aktiv!');
  vscode.window.showInformationMessage('ICM-DSL Extension wurde aktiviert!');
  loadSchema();

  context.subscriptions.push(
    vscode.commands.registerCommand('icm.reloadSchema', () => {
      loadSchema(true);
      vscode.window.showInformationMessage('ICM: Schema neu geladen.');
    })
  );

  // Completion: Keywords, Fields, Enum-Werte, Functions
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      { language: 'icm-query' },
      new IcmCompletionProvider(),
      '[', ':', ';', ' ', '=', '(', '"'
    )
  );

  // Hover: Keywords, Funktionen + Felder
  context.subscriptions.push(
    vscode.languages.registerHoverProvider({ language: 'icm-query' }, new IcmHoverProvider())
  );

  // Diagnostics: Keyword/Feld/Enum prüfen + Warnings
  const diags = vscode.languages.createDiagnosticCollection('icm');
  context.subscriptions.push(diags);

  const validateDoc = (doc: vscode.TextDocument) => {
    if (doc.languageId !== 'icm-query') return;
    diags.set(doc.uri, validateText(doc.getText(), doc));
  };

  vscode.workspace.onDidOpenTextDocument(validateDoc, null, context.subscriptions);
  vscode.workspace.onDidChangeTextDocument(e => validateDoc(e.document), null, context.subscriptions);
  vscode.workspace.textDocuments.forEach(validateDoc);
}

class IcmCompletionProvider implements vscode.CompletionItemProvider {
  provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
    const items: vscode.CompletionItem[] = [];
    const line = document.lineAt(position.line).text;
    const textBefore = document.getText(new vscode.Range(new vscode.Position(0, 0), position));
    const ctx = inferContext(textBefore, position);

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
        const keywordSpec = findKeyword(ctx.activeKeyword);
        const allowedFields = keywordSpec?.fields ?? (schema.fields ?? []).map(f => f.name);

        for (const fieldName of allowedFields) {
            const f = findField(fieldName);
            if (f) {
                const ci = new vscode.CompletionItem(f.name, vscode.CompletionItemKind.Field);
                ci.detail = f.type ?? 'field';
                ci.documentation = f.doc ?? '';
                ci.insertText = new vscode.SnippetString(`${f.name}=\${1}`);
                items.push(ci);
            }
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
      ci.insertText = new vscode.SnippetString(
        `${f.name}(${args.map((a, i) => `\${${i + 1}:${a}}`).join(', ')})`
      );
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

class IcmHoverProvider implements vscode.HoverProvider {
  provideHover(document: vscode.TextDocument, position: vscode.Position) {
    const range = document.getWordRangeAtPosition(position, /[A-Za-z_][A-Za-z0-9_]*/);
    if (!range) return;

    const word = document.getText(range);

    // Hover für Keywords
    const kw = findKeyword(word);
    if (kw) {
      const md = new vscode.MarkdownString();
      md.appendCodeblock(kw.name, 'icm-query');
      if (kw.doc) md.appendMarkdown('\n\n' + kw.doc);
      if (kw.required_params?.length) {
        md.appendMarkdown('\n\n**Wichtige Parameter:** ' + kw.required_params.map(s => `\`${s}\``).join(', '));
      }
      return new vscode.Hover(md);
    }

    const f = schema.functions?.find(x => x.name === word);
    if (f) {
      const md = new vscode.MarkdownString();
      md.appendCodeblock(f.signature ?? f.name, 'plaintext');
      if (f.doc) md.appendMarkdown('\n\n' + f.doc);
      return new vscode.Hover(md);
    }

    const fld = schema.fields?.find(x => x.name === word);
    if (fld) {
      const md = new vscode.MarkdownString();
      md.appendCodeblock(`${fld.name}: ${fld.type ?? 'field'}`, 'plaintext');
      if (fld.doc) md.appendMarkdown('\n\n' + fld.doc);
      const en = enumNameFromFieldType(fld.type ?? '');
      if (en && schema.enums?.[en]) {
        md.appendMarkdown('\n\n**Werte:** ' + schema.enums[en].map(s => `\`${s}\``).join(', '));
      }
      return new vscode.Hover(md);
    }
    return;
  }
}

function validateText(text: string, doc: vscode.TextDocument): vscode.Diagnostic[] {
  const diags: vscode.Diagnostic[] = [];

  const stack: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '[') stack.push(i);
    if (ch === ']') {
      const open = stack.pop();
      if (open === undefined) diags.push(makeDiag(doc, i, i + 1, "Unerwartete schließende Klammer ']'."));
    }
  }
  for (const idx of stack) {
    diags.push(makeDiag(doc, idx, idx + 1, "Fehlende schließende Klammer ']'."));
  }

  const blockRegex = /\[([\s\S]*?)\]/g;
  let m: RegExpExecArray | null;
  while ((m = blockRegex.exec(text)) !== null) {
    const blockContent = m[1];
    const blockStart = m.index + 1;
    const colonIdx = blockContent.indexOf(':');
    
    // Fall ohne Parameter handhaben
    const headerSegment = colonIdx < 0 ? blockContent : blockContent.slice(0, colonIdx);
    const header = headerSegment.trim();
    const headerOffset = headerSegment.search(/\S/);
    const kwStart = headerOffset >= 0 ? blockStart + headerOffset : blockStart;
    const kwEnd = kwStart + header.length;
    
    const keywordSpec = findKeyword(header);
    if (!keywordSpec) {
        diags.push(makeDiag(doc, kwStart, kwEnd, `Unbekanntes Keyword '${header}'.`));
        continue; // Nächsten Block prüfen
    }

    // Nur Parameter prüfen, wenn ein Doppelpunkt vorhanden ist
    if (colonIdx < 0) {
        continue;
    }

    const bodyRaw = blockContent.slice(colonIdx + 1);
    const body = bodyRaw.trim();
    
    // Warnung für fehlende Pflicht-Parameter
    for (const req of keywordSpec.required_params ?? []) {
        if (!body.includes(`${req}=`)) {
            diags.push(makeDiag(
                doc,
                kwStart,
                kwEnd,
                `Für das Keyword '${header}' wird der Parameter '${req}' dringend empfohlen.`,
                vscode.DiagnosticSeverity.Warning
            ));
        }
    }

    const partsRegex = /([^;]+)(?:;|$)/g;
    const seenFields = new Set<string>();
    let partMatch: RegExpExecArray | null;
    while ((partMatch = partsRegex.exec(bodyRaw)) !== null) {
        const partText = partMatch[1];
        const trimmedPart = partText.trim();
        if (!trimmedPart) continue;

        const eqIdx = partText.indexOf('=');
        if (eqIdx < 0) continue;

        const keySegment = partText.slice(0, eqIdx);
        const key = keySegment.trim();
        if (!key) continue;

        const keySegmentOffset = keySegment.search(/\S/);
        const partOffset = colonIdx + 1 + partMatch.index;
        const keyStartOffset =
            keySegmentOffset >= 0 ? partOffset + keySegmentOffset : partOffset;
        const absKeyStart = blockStart + keyStartOffset;
        const absKeyEnd = absKeyStart + key.length;

        if (seenFields.has(key)) {
            diags.push(
                makeDiag(doc, absKeyStart, absKeyEnd, `Feld '${key}' ist in diesem Block doppelt vorhanden.`)
            );
            continue;
        }
        seenFields.add(key);
        
        // **NEUE LOGIK**: Prüfen, ob das Feld für das Keyword erlaubt ist
        const allowedFields = keywordSpec.fields;
        if (allowedFields && !allowedFields.includes(key)) {
            diags.push(makeDiag(doc, absKeyStart, absKeyEnd, `Feld '${key}' ist für Keyword '${header}' nicht gültig.`));
            continue; // Mit dem nächsten Feld fortfahren
        }

        const field = findField(key);
        if (!field) {
            diags.push(makeDiag(doc, absKeyStart, absKeyEnd, `Unbekanntes Feld '${key}'.`));
            continue;
        }

        const valueSegment = partText.slice(eqIdx + 1);
        const value = valueSegment.trim();
        const valueSegmentOffset = valueSegment.search(/\S/);
        const valueStartOffset =
            valueSegmentOffset >= 0 ? partOffset + eqIdx + 1 + valueSegmentOffset : partOffset + eqIdx + 1;
        const absValStart = blockStart + valueStartOffset;

        const enName = enumNameFromFieldType(field.type ?? '');
        if (enName && schema.enums?.[enName]) {
            const raw = stripValue(value);
            if (raw && !schema.enums[enName].includes(raw)) {
                diags.push(
                    makeDiag(
                        doc,
                        absValStart,
                        absValStart + value.length,
                        `Ungültiger Wert '${raw}' für Feld '${key}'. Erlaubt: ${schema.enums[enName].join(', ')}.`
                    )
                );
            }
        }
    }
}
  return diags;
}

// ---- Helpers ----
function findKeyword(name: string): KeywordSpec | undefined {
  return (schema.keywords ?? []).find(k => k.name === name);
}

function findField(name: string): FieldSpec | undefined {
  return (schema.fields ?? []).find(f => f.name === name);
}
function enumNameFromFieldType(t: string): string | null {
  const m = /Enum\s*:\s*([A-Za-z0-9_+]+)/.exec(t);
  return m ? m[1] : null;
}
function stripValue(v: string): string | null {
  let s = v.trim();
  if (/[{}\\]/.test(s)) return null;
  if (/[*?]/.test(s)) return null;
  if (s.startsWith('"') && s.endsWith('"')) s = s.slice(1, -1);
  if (s.startsWith("'") && s.endsWith("'")) s = s.slice(1, -1);
  if (/[, ]/.test(s)) return null;
  return s;
}
function makeDiag(doc: vscode.TextDocument, start: number, end: number, message: string, severity: vscode.DiagnosticSeverity = vscode.DiagnosticSeverity.Error): vscode.Diagnostic {
  const startPos = doc.positionAt(start);
  const endPos = doc.positionAt(end);
  const d = new vscode.Diagnostic(new vscode.Range(startPos, endPos), message, severity);
  d.source = 'icm';
  return d;
}

function inferContext(textBefore: string, position: vscode.Position): {
  expectKeyword: boolean;
  expectField: boolean;
  activeKeyword?: string;
  enumForField?: FieldSpec;
} {
  const slice = textBefore.slice(Math.max(0, textBefore.length - 200));
  const lastOpenBracket = slice.lastIndexOf('[');
  const lastCloseBracket = slice.lastIndexOf(']');
  
  let activeKeyword: string | undefined;
  let expectKeyword = false;
  let expectField = false;
  let enumForField: FieldSpec | undefined;

  if (lastOpenBracket > lastCloseBracket) { // Wir sind in einem Block
      const blockContent = slice.slice(lastOpenBracket + 1);
      const colonIndex = blockContent.indexOf(':');

      if (colonIndex === -1) {
          expectKeyword = true;
      } else {
          activeKeyword = blockContent.slice(0, colonIndex).trim();
          const afterColon = /:[^;]*$/.test(blockContent);
          const afterSemicolon = /;[ \t]*$/.test(blockContent);
          expectField = afterColon || afterSemicolon;
      }

      const m = /([A-Za-z0-9_. +\-]+)=\s*$/.exec(blockContent);
      if (m) {
          const key = m[1].trim();
          const f = findField(key);
          if (f) {
              const en = enumNameFromFieldType(f.type ?? '');
              if (en && schema.enums?.[en]) {
                  enumForField = f;
                  expectField = false;
              }
          }
      }
  }

  return { expectKeyword, expectField, activeKeyword, enumForField };
}


function resolveSchemaPath(): string | null {
  const cfg = vscode.workspace.getConfiguration();
  const p = cfg.get<string>('icm.schemaPath')?.trim() || '';
  const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

  let configuredPath: string | null = null;
  if (p) {
    configuredPath = path.isAbsolute(p) ? p : ws ? path.join(ws, p) : null;
    if (configuredPath && fs.existsSync(configuredPath)) {
      return configuredPath;
    }
  }

  if (extensionRoot) {
    const fallback = path.join(extensionRoot, 'schemas', 'dsl_icm.json');
    if (fs.existsSync(fallback)) {
      return fallback;
    }
  }

  return configuredPath;
}

function loadSchema(showErrors = false) {
  try {
    const p = resolveSchemaPath();
    if (!p || !fs.existsSync(p)) {
      if (showErrors) vscode.window.showWarningMessage('ICM: icm.schemaPath ist leer oder Datei existiert nicht.');
      schema = { keywords: [], functions: [], fields: [], enums: {}, examples: [] };
      return;
    }
    const raw = fs.readFileSync(p, 'utf8');
    const json = JSON.parse(raw) as Schema;
    schema = {
      keywords: json.keywords ?? [],
      functions: json.functions ?? [],
      fields: json.fields ?? [],
      enums: json.enums ?? {},
      examples: json.examples ?? []
    };
  } catch (e) {
    schema = { keywords: [], functions: [], fields: [], enums: {}, examples: [] };
    vscode.window.showErrorMessage('ICM: Schema konnte nicht geladen werden (JSON-Fehler?).');
  }
}

export function deactivate() { }