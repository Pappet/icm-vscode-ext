import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Schema } from '../common/types';

export function loadSchema(extensionRoot: string, showErrors = false): Schema {
  try {
    const p = resolveSchemaPath(extensionRoot);
    if (!p || !fs.existsSync(p)) {
      if (showErrors) {
        vscode.window.showWarningMessage('ICM: icm.schemaPath ist leer oder Datei existiert nicht.');
      }
      return { keywords: [], functions: [], fields: [], enums: {}, examples: [] };
    }
    const raw = fs.readFileSync(p, 'utf8');
    const json = JSON.parse(raw) as Schema;
    return {
      keywords: json.keywords ?? [],
      functions: json.functions ?? [],
      fields: json.fields ?? [],
      enums: json.enums ?? {},
      examples: json.examples ?? [],
    };
  } catch (e) {
    vscode.window.showErrorMessage('ICM: Schema konnte nicht geladen werden (JSON-Fehler?).');
    return { keywords: [], functions: [], fields: [], enums: {}, examples: [] };
  }
}

function resolveSchemaPath(extensionRoot: string): string | null {
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