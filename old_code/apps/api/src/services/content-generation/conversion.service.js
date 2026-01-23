import puppeteer from 'puppeteer';
export class ConversionService {
    monitoring;
    constructor(monitoring) {
        this.monitoring = monitoring;
    }
    /**
     * Convert HTML to PDF
     */
    async convertToPdf(html) {
        const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
        const page = await browser.newPage();
        try {
            await page.setContent(html, { waitUntil: 'networkidle0' });
            const pdf = await page.pdf({ format: 'A4', printBackground: true });
            return Buffer.from(pdf);
        }
        catch (error) {
            this.monitoring.trackException(error, { operation: 'conversion.pdf' });
            throw new Error('Failed to convert to PDF');
        }
        finally {
            await browser.close();
        }
    }
    /**
     * Convert HTML to Docx
     */
    async convertToDocx(html) {
        try {
            // Dynamic import to handle missing type definitions
            const htmlToDocxModule = await import('html-to-docx');
            const HTMLtoDOCX = (htmlToDocxModule.default || htmlToDocxModule);
            const fileBuffer = await HTMLtoDOCX(html, null, null, {
                table: { row: { cantSplit: true } },
                footer: true,
                pageNumber: true,
            });
            return fileBuffer;
        }
        catch (error) {
            this.monitoring.trackException(error, { operation: 'conversion.docx' });
            throw new Error('Failed to convert to Docx');
        }
    }
    /**
     * Convert HTML to PPTX
     * Note: This is a simplified conversion. Complex HTML structures might not map perfectly.
     * For better results, we might need to parse the HTML and map to slides manually,
     * but for now we'll try to put content into slides.
     */
    async convertToPptx(html, title) {
        try {
            // Dynamic import to handle ES module
            const pptxgenjsModule = await import('pptxgenjs');
            const PptxGenJS = (pptxgenjsModule.default || pptxgenjsModule);
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
            return buffer;
        }
        catch (error) {
            this.monitoring.trackException(error, { operation: 'conversion.pptx' });
            throw new Error('Failed to convert to PPTX');
        }
    }
}
//# sourceMappingURL=conversion.service.js.map