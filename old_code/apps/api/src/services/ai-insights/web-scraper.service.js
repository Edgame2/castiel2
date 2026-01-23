import puppeteer from 'puppeteer';
export class WebScraperService {
    monitoring;
    browser = null;
    constructor(monitoring) {
        this.monitoring = monitoring;
    }
    async getBrowser() {
        if (!this.browser) {
            this.browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            });
        }
        return this.browser;
    }
    async scrape(url) {
        const start = Date.now();
        let page;
        try {
            const browser = await this.getBrowser();
            page = await browser.newPage();
            // Set user agent to avoid being blocked
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
            // Navigate to the URL with timeout
            await page.goto(url, {
                waitUntil: 'networkidle2',
                timeout: 30000
            });
            // Extract content
            const title = await page.title();
            const content = await page.evaluate(() => {
                // Remove script and style elements
                const scripts = document.querySelectorAll('script, style, noscript');
                scripts.forEach(el => el.remove());
                // Get text content
                return document.body?.innerText || '';
            });
            return {
                url,
                title: title || url,
                content: content.replace(/\s+/g, ' ').trim(),
                durationMs: Date.now() - start,
            };
        }
        catch (error) {
            this.monitoring.trackException(error, { operation: 'webscraper.scrape', url });
            throw error;
        }
        finally {
            if (page) {
                await page.close();
            }
        }
    }
    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }
}
//# sourceMappingURL=web-scraper.service.js.map