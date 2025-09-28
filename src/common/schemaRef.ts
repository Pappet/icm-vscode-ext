import { Schema } from './types';

export class SchemaRef {
  private _schema: Schema;

  constructor(initial: Schema) {
    this._schema = initial;
  }

  get current(): Schema {
    return this._schema;
  }

  set current(next: Schema) {
    this._schema = next;
  }
}

