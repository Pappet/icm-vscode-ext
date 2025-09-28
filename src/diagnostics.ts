import * as vscode from 'vscode';
import { Schema } from './common/types';
import { findKeyword, findField, stripValue, makeDiag, isValidRangeValue, enumNameFromFieldType } from './util/helpers';

export function validateText(text: string, doc: vscode.TextDocument, schema: Schema): vscode.Diagnostic[] {
  const diags: vscode.Diagnostic[] = [];
  const stack: number[] = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '[') stack.push(i);
    if (ch === ']') {
      if (stack.pop() === undefined) {
        diags.push(makeDiag(doc, i, i + 1, "Unerwartete schließende Klammer ']'."));
      }
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
    const headerSegment = colonIdx < 0 ? blockContent : blockContent.slice(0, colonIdx);
    const header = headerSegment.trim();
    const headerOffset = headerSegment.search(/\S/);
    const kwStart = headerOffset >= 0 ? blockStart + headerOffset : blockStart;
    const kwEnd = kwStart + header.length;
    const keywordSpec = findKeyword(header, schema);

    if (!keywordSpec) {
      diags.push(makeDiag(doc, kwStart, kwEnd, `Unbekanntes Keyword '${header}'.`));
      continue;
    }
    if (colonIdx < 0) continue;

    const bodyRaw = blockContent.slice(colonIdx + 1);
    for (const req of keywordSpec.required_params ?? []) {
      const requiredParamRegex = new RegExp(`\\b${req}\\s*=`);
      if (!requiredParamRegex.test(bodyRaw)) {
        diags.push(
          makeDiag(
            doc,
            kwStart,
            kwEnd,
            `Für das Keyword '${header}' wird der Parameter '${req}' dringend empfohlen.`,
            vscode.DiagnosticSeverity.Warning
          )
        );
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
      const keyStartOffset = keySegmentOffset >= 0 ? partOffset + keySegmentOffset : partOffset;
      const absKeyStart = blockStart + keyStartOffset;
      const absKeyEnd = absKeyStart + key.length;

      if (seenFields.has(key)) {
        diags.push(makeDiag(doc, absKeyStart, absKeyEnd, `Feld '${key}' ist in diesem Block doppelt vorhanden.`));
        continue;
      }
      seenFields.add(key);

      const fieldSpec = findField(key, schema);
      if (!fieldSpec) {
        diags.push(makeDiag(doc, absKeyStart, absKeyEnd, `Unbekanntes Feld '${key}'.`));
        continue;
      }

      if (keywordSpec.fields && !keywordSpec.fields.includes(key)) {
        diags.push(makeDiag(doc, absKeyStart, absKeyEnd, `Feld '${key}' ist für Keyword '${header}' nicht gültig.`));
        continue;
      }

      const valueSegment = partText.slice(eqIdx + 1);
      const value = valueSegment.trim();
      const valueSegmentOffset = valueSegment.search(/\S/);
      const valueStartOffset =
        valueSegmentOffset >= 0 ? partOffset + eqIdx + 1 + valueSegmentOffset : partOffset + eqIdx + 1;
      const absValStart = blockStart + valueStartOffset;
      const absValEnd = absValStart + value.length;
      const rawValue = stripValue(value);

      if (rawValue) {
        if (fieldSpec.type === 'number' && isNaN(Number(rawValue))) {
          diags.push(makeDiag(doc, absValStart, absValEnd, `Feld '${key}' erwartet eine Zahl, aber '${rawValue}' wurde angegeben.`));
        } else if (fieldSpec.name === 'Range' && !isValidRangeValue(rawValue, schema)) {
          diags.push(makeDiag(doc, absValStart, absValEnd, `Ungültiger Wert '${rawValue}' für Feld 'Range'.`));
        } else {
          const enName = enumNameFromFieldType(fieldSpec.type ?? '');
          if (enName && schema.enums?.[enName] && !schema.enums[enName].includes(rawValue)) {
            diags.push(
              makeDiag(
                doc,
                absValStart,
                absValEnd,
                `Ungültiger Wert '${rawValue}' für Feld '${key}'. Erlaubt: ${schema.enums[enName].join(', ')}.`
              )
            );
          }
        }
      }
    }
  }
  return diags;
}