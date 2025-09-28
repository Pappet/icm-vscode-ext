import * as vscode from 'vscode';
import { KeywordSpec, FieldSpec, Schema } from '../common/types';

export function findKeyword(name: string, schema: Schema): KeywordSpec | undefined {
  return (schema.keywords ?? []).find(k => k.name === name);
}

export function findField(name: string, schema: Schema): FieldSpec | undefined {
  return (schema.fields ?? []).find(f => f.name === name);
}

export function enumNameFromFieldType(t: string): string | null {
  const m = /Enum\s*:\s*([A-Za-z0-9_+]+)/.exec(t);
  return m ? m[1] : null;
}

export function stripValue(v: string): string | null {
  let s = v.trim();
  if (/[{}\\]/.test(s)) return null;
  if (/[*?]/.test(s)) return null;
  if (s.startsWith('"') && s.endsWith('"')) s = s.slice(1, -1);
  if (s.startsWith("'") && s.endsWith("'")) s = s.slice(1, -1);
  if (/[, ]/.test(s)) return null;
  return s;
}

export function makeDiag(
  doc: vscode.TextDocument,
  start: number,
  end: number,
  message: string,
  severity: vscode.DiagnosticSeverity = vscode.DiagnosticSeverity.Error
): vscode.Diagnostic {
  const startPos = doc.positionAt(start);
  const endPos = doc.positionAt(end);
  const d = new vscode.Diagnostic(new vscode.Range(startPos, endPos), message, severity);
  d.source = 'icm';
  return d;
}

export function isValidRangeValue(value: string, schema: Schema): boolean {
  if ((schema.enums?.RangeOptions ?? []).includes(value)) {
    return true;
  }
  const zeitpunktToken = '(CTX|NOW|ADM|DIS|PAS|FUT|FOS|LOE|PK0|PKN|BDT|SOT|DSF|DSU)';
  const interval = '([+-]?\\d+[snmhdwqy])?';
  const time = '(@\\d{2}:\\d{2})?';
  const zeitpunktRegex = new RegExp(`^${zeitpunktToken}${interval}${time}$`, 'i');
  const parts = value.split('...');
  if (parts.length > 2) return false;
  for (const part of parts) {
    if (part.trim() !== '' && !zeitpunktRegex.test(part.trim())) {
      return false;
    }
  }
  return true;
}