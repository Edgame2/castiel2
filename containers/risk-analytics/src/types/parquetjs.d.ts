declare module 'parquetjs' {
  export class ParquetReader {
    static openFile(path: string): Promise<ParquetReader>;
    getCursor(): { next(): Promise<Record<string, unknown> | null> };
    close(): Promise<void>;
  }
  export class ParquetSchema {
    constructor(schema: Record<string, { type: string; optional?: boolean }>);
  }
  export class ParquetWriter {
    static openFile(schema: ParquetSchema, path: string): Promise<ParquetWriter>;
    appendRow(row: Record<string, unknown>): Promise<void>;
    close(): Promise<void>;
  }
}
