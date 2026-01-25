declare module 'parquetjs' {
  export class ParquetReader {
    static openFile(path: string): Promise<ParquetReader>;
    getCursor(): { next(): Promise<Record<string, unknown> | null> };
    close(): Promise<void>;
  }
}
