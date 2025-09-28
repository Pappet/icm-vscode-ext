import * as vscode from 'vscode';
import { Schema, FieldSpec } from '../common/types';
import { findField, enumNameFromFieldType } from './helpers';

export function inferContext(
  textBefore: string,
  position: vscode.Position,
  schema: Schema
): {
  expectKeyword: boolean;
  expectField: boolean;
  activeKeyword?: string;
  enumForField?: FieldSpec;
} {
  // Wir betrachten nur die letzten 200 Zeichen für die Performance
  const slice = textBefore.slice(Math.max(0, textBefore.length - 200));
  const lastOpenBracket = slice.lastIndexOf('[');
  const lastCloseBracket = slice.lastIndexOf(']');

  let activeKeyword: string | undefined;
  let expectKeyword = false;
  let expectField = false;
  let enumForField: FieldSpec | undefined;

  // Befinden wir uns innerhalb eines Blocks ([...])?
  if (lastOpenBracket > lastCloseBracket) {
    const blockContent = slice.slice(lastOpenBracket + 1);
    const colonIndex = blockContent.indexOf(':');

    if (colonIndex === -1) {
      // Vor dem Doppelpunkt: Wir erwarten ein Keyword
      expectKeyword = true;
      activeKeyword = blockContent.trim();
    } else {
      // Nach dem Doppelpunkt: Wir erwarten Felder
      activeKeyword = blockContent.slice(0, colonIndex).trim();
      const afterLastSemicolon = blockContent.split(';').pop() ?? '';

      if (!afterLastSemicolon.includes('=')) {
        expectField = true;
      }
    }

    // Prüfen, ob wir direkt nach einem "Feld=" stehen, um Enum-Werte vorzuschlagen
    const m = /([A-Za-z0-9_. +\-]+)=\s*$/.exec(blockContent);
    if (m) {
      const key = m[1].trim();
      const f = findField(key, schema);
      if (f) {
        const en = enumNameFromFieldType(f.type ?? '');
        if (en && schema.enums?.[en]) {
          enumForField = f;
          expectField = false; // Wir erwarten jetzt einen Enum-Wert, kein weiteres Feld
        }
      }
    }
  }

  return { expectKeyword, expectField, activeKeyword, enumForField };
}