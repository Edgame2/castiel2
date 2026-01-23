// @ts-nocheck
import puppeteer from 'puppeteer';
// html-to-docx may not have TypeScript definitions - using dynamic import with proper typing
// pptxgenjs is an ES module, so we need to use dynamic import

// Type for HTMLtoDOCX (may not have type definitions)
type HTMLtoDOCXType = (htmlContent: string, headerHTML?: string, footerHTML?: string, options?: any) => Promise<Buffer>;
import { IMonitoringProvider } from '@castiel/monitoring';

export class ConversionService {
    constructor(private monitoring: IMonitoringProvider) { }

    /**
     * Convert HTML to PDF
     */
    async convertToPdf(html: string): Promise<Buffer> {
        const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
        const page = await browser.newPage();

        try {
            await page.setContent(html, { waitUntil: 'networkidle0' });
            const pdf = await page.pdf({ format: 'A4', printBackground: true });
            return Buffer.from(pdf);
        } catch (error) {
            this.monitoring.trackException(error as Error, { operation: 'conversion.pdf' });
            throw new Error('Failed to convert to PDF');
        } finally {
            await browser.close();
        }
    }

    /**
     * Convert HTML to Docx
     */
    async convertToDocx(html: string): Promise<Buffer> {
        try {
            // Dynamic import to handle missing type definitions
            const htmlToDocxModule = await import('html-to-docx');
            const HTMLtoDOCX = (htmlToDocxModule.default || htmlToDocxModule) as HTMLtoDOCXType;
            const fileBuffer = await HTMLtoDOCX(html, null, null, {
                table: { row: { cantSplit: true } },
                footer: true,
                pageNumber: true,
            });
            return fileBuffer;
        } catch (error) {
            this.monitoring.trackException(error as Error, { operation: 'conversion.docx' });
            throw new Error('Failed to convert to Docx');
        }
    }

    /**
     * Convert HTML to PPTX
     * Note: This is a simplified conversion. Complex HTML structures might not map perfectly.
     * For better results, we might need to parse the HTML and map to slides manually,
     * but for now we'll try to put content into slides.
     */
    async convertToPptx(html: string, title: string): Promise<Buffer> {
        try {
            // Dynamic import to handle ES module
            const pptxgenjsModule = await import('pptxgenjs');
            const PptxGenJS = (pptxgenjsModule.default || pptxgenjsModule) as any;
            const pres = new PptxGenJS();

            // Add a title slide
            const slide = pres.addSlide();
            slide.addText(title, { x: 1, y: 1, w: '80%', h: 1, fontSize: 24, align: 'center' });

            // For now, we'll just add the raw text content of the HTML to a slide
            // A proper HTML -> PPTX conversion is complex and might require a dedicated library or parsing logic
            // Since there isn't a direct "html-to-pptx" library that is robust, we will strip tags for now
            // or use a placeholder.

            // TODO: Implement robust HTML to PPTX parsing
            const textContent = html.replace(/<[^>]*>?/gm, ''); // Simple strip tags

            const contentSlide = pres.addSlide();
            contentSlide.addText(textContent, { x: 0.5, y: 0.5, w: '90%', h: '90%', fontSize: 14, bodyProp: { autoFit: true } });

            const buffer = await pres.write({ outputType: 'nodebuffer' });
            return buffer as Buffer;
        } catch (error) {
            this.monitoring.trackException(error as Error, { operation: 'conversion.pptx' });
            throw new Error('Failed to convert to PPTX');
        }
    }
}
