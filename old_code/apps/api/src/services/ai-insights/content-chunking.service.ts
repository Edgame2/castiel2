import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';

export interface ChunkingOptions {
    chunkSize?: number; // approximate tokens
    chunkOverlap?: number;
}

export class ContentChunkingService {
    constructor(private defaultChunkSize = 512, private defaultOverlap = 64) { }

    async chunk(content: string, options?: ChunkingOptions): Promise<string[]> {
        const chunkSize = options?.chunkSize ?? this.defaultChunkSize;
        const chunkOverlap = options?.chunkOverlap ?? this.defaultOverlap;

        // Use LangChain splitter to respect sentence boundaries where possible
        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize,
            chunkOverlap,
        });

        return splitter.splitText(content);
    }
}
