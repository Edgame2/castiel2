/**
 * Base Document Rewriter
 *
 * Abstract base class for format-specific document rewriters
 * All rewriters must implement this interface
 */
/**
 * Base rewriter interface
 */
export class BaseDocumentRewriter {
    monitoring;
    constructor(monitoring) {
        this.monitoring = monitoring;
    }
}
//# sourceMappingURL=base-rewriter.js.map