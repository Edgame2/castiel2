import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
export class ContentChunkingService {
    defaultChunkSize;
    defaultOverlap;
    constructor(defaultChunkSize = 512, defaultOverlap = 64) {
        this.defaultChunkSize = defaultChunkSize;
        this.defaultOverlap = defaultOverlap;
    }
    async chunk(content, options) {
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
//# sourceMappingURL=content-chunking.service.js.map