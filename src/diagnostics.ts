import * as vscode from 'vscode';
import { Schema } from './common/types';
import { findKeyword, findField, stripValue, makeDiag, isValidRangeValue, enumNameFromFieldType } from './util/helpers';

// Eindeutige Codes für unsere Diagnosen
export const DIAGNOSTIC_CODES = {
  MISSING_FORMAT: 'ICM001',
  UNKNOWN_KEYWORD: 'ICM002',
  UNKNOWN_FIELD: 'ICM003',
  INVALID_BRACKETS: 'ICM004',
  DUPLICATE_FIELD: 'ICM005' // NEU: Code für doppelte Felder
};

export function validateText(text: string, doc: vscode.TextDocument, schema: Schema): vscode.Diagnostic[] {
  const diags: vscode.Diagnostic[] = [];
  const stack: number[] = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '[') stack.push(i);
    if (ch === ']') {
      if (stack.pop() === undefined) {
        const diag = makeDiag(doc, i, i + 1, "Unerwartete schließende Klammer ']'.");
        diag.code = DIAGNOSTIC_CODES.INVALID_BRACKETS;
        diags.push(diag);
      }
    }
  }
  for (const idx of stack) {
    const diag = makeDiag(doc, idx, idx + 1, "Fehlende schließende Klammer ']'.");
    diag.code = DIAGNOSTIC_CODES.INVALID_BRACKETS;
    diags.push(diag);
  }

  const blockRegex = /\[([\s\S]*?)\]/g;
  let m: RegExpExecArray | null;

  while ((m = blockRegex.exec(text)) !== null) {
    const blockContent = m[1];
    const blockStart = m.index + 1;
    const colonIdx = blockContent.indexOf(':');
    const headerSegment = colonIdx < 0 ? blockContent : blockContent.slice(0, colonIdx);
    const header = headerSegment.trim();
    const headerOffset = headerSegment.search(/\S/);
    const kwStart = headerOffset >= 0 ? blockStart + headerOffset : blockStart;
    const kwEnd = kwStart + header.length;

    if (!header) continue;

    const kwSpec = findKeyword(header, schema);
    if (!kwSpec) {
      const diag = makeDiag(doc, kwStart, kwEnd, `Unbekanntes Keyword '${header}'.`);
      diag.code = DIAGNOSTIC_CODES.UNKNOWN_KEYWORD;
      diags.push(diag);
      continue;
    }
    
    // GEÄNDERT: Prüfung auf fehlenden "Format"-Parameter für mehrere Keywords
    const keywordsNeedingFormat = ['records', 'codes', 'orders'];
    if (keywordsNeedingFormat.includes(header.toLowerCase()) && !/format\s*=/i.test(blockContent)) {
        const range = new vscode.Range(doc.positionAt(kwStart), doc.positionAt(kwEnd));
        const diag = new vscode.Diagnostic(
            range,
            `Der empfohlene Parameter 'Format' fehlt für das Keyword '${header}'.`,
            vscode.DiagnosticSeverity.Warning
        );
        diag.code = DIAGNOSTIC_CODES.MISSING_FORMAT;
        diags.push(diag);
    }

    if (colonIdx < 0) continue;

    const body = blockContent.slice(colonIdx + 1);
    // GEÄNDERT: Verwendet einen robusteren Regex, um nicht innerhalb von Anführungszeichen zu splitten
    const parts = body.split(/;(?=(?:(?:[^"]*"){2})*[^"]*$)/g);
    
    // NEU: Logik zur Erkennung doppelter Felder
    const seenKeys = new Set<string>();

    for (const part of parts) {
      if (!part.trim()) continue;
      const partOffset = blockContent.indexOf(part, colonIdx + 1);
      const eqIdx = part.indexOf('=');
      if (eqIdx < 0) continue;

      const keySegment = part.slice(0, eqIdx);
      const key = keySegment.trim();
      const keyOffset = keySegment.search(/\S/);
      const absKeyStart = blockStart + partOffset + (keyOffset >= 0 ? keyOffset : 0);
      const absKeyEnd = absKeyStart + key.length;

      // NEU: Prüfung auf Duplikate
      if (seenKeys.has(key.toLowerCase())) {
        const diag = makeDiag(doc, absKeyStart, absKeyEnd, `Doppeltes Feld '${key}' im selben Block.`);
        diag.code = DIAGNOSTIC_CODES.DUPLICATE_FIELD;
        diags.push(diag);
      } else {
        seenKeys.add(key.toLowerCase());
      }

      const fieldSpec = findField(key, schema);
      if (!fieldSpec) {
        const diag = makeDiag(doc, absKeyStart, absKeyEnd, `Unbekanntes Feld '${key}'.`);
        diag.code = DIAGNOSTIC_CODES.UNKNOWN_FIELD;
        diags.push(diag);
        continue;
      }

      if (kwSpec.fields && !kwSpec.fields.includes(fieldSpec.name)) {
        diags.push(makeDiag(doc, absKeyStart, absKeyEnd, `Feld '${key}' ist für Keyword '${header}' nicht gültig.`));
        continue;
      }

      const valueSegment = part.slice(eqIdx + 1);
      const value = valueSegment.trim();
      const valueSegmentOffset = valueSegment.search(/\S/);
      const valueStartOffset =
        valueSegmentOffset >= 0 ? partOffset + eqIdx + 1 + valueSegmentOffset : partOffset + eqIdx + 1;
      const absValStart = blockStart + valueStartOffset;
      const absValEnd = absValStart + value.length;
      const rawValue = stripValue(value);

      if (rawValue) {
        if (fieldSpec.name === 'Range') {
          if (!isValidRangeValue(rawValue, schema)) {
            diags.push(makeDiag(doc, absValStart, absValEnd, `Ungültiger Wert '${rawValue}' für Feld 'Range'.`));
          }
        }
        else if (fieldSpec.type === 'number' && isNaN(Number(rawValue))) {
          diags.push(makeDiag(doc, absValStart, absValEnd, `Feld '${key}' erwartet eine Zahl, aber '${rawValue}' wurde angegeben.`));
        } else {
          const enName = enumNameFromFieldType(fieldSpec.type ?? '');
          if (enName && schema.enums?.[enName] && !schema.enums[enName].includes(rawValue)) {
            diags.push(
              makeDiag(
                doc,
                absValStart,
                absValEnd,
                `Ungültiger Wert '${rawValue}' für Feld '${key}'. Erlaubt: ${schema.enums[enName].join(', ')}`
              )
            );
          }
        }
      }
    }
  }

  return diags;
}