import * as vscode from 'vscode';

export type KeywordSpec = {
  name: string;
  doc?: string;
  required_params?: string[];
  fields?: string[];
};

export type FunctionSpec = {
  name: string;
  signature?: string;
  doc?: string;
  args?: string[];
};

export type FieldSpec = {
  name: string;
  type?: string;
  doc?: string;
};

export type Schema = {
  keywords?: KeywordSpec[];
  functions?: FunctionSpec[];
  fields?: FieldSpec[];
  enums?: Record<string, string[]>;
  examples?: string[];
};

export interface IcmDiagnostic extends vscode.Diagnostic {
  source: 'icm';
}