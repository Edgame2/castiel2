export interface ChunkingOptions {
    chunkSize?: number;
    chunkOverlap?: number;
}
export declare class ContentChunkingService {
    private defaultChunkSize;
    private defaultOverlap;
    constructor(defaultChunkSize?: number, defaultOverlap?: number);
    chunk(content: string, options?: ChunkingOptions): Promise<string[]>;
}
//# sourceMappingURL=content-chunking.service.d.ts.map