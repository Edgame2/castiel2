import { IMonitoringProvider } from '@castiel/monitoring';
export declare class ConversionService {
    private monitoring;
    constructor(monitoring: IMonitoringProvider);
    /**
     * Convert HTML to PDF
     */
    convertToPdf(html: string): Promise<Buffer>;
    /**
     * Convert HTML to Docx
     */
    convertToDocx(html: string): Promise<Buffer>;
    /**
     * Convert HTML to PPTX
     * Note: This is a simplified conversion. Complex HTML structures might not map perfectly.
     * For better results, we might need to parse the HTML and map to slides manually,
     * but for now we'll try to put content into slides.
     */
    convertToPptx(html: string, title: string): Promise<Buffer>;
}
//# sourceMappingURL=conversion.service.d.ts.map