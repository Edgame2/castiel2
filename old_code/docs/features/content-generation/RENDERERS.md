# Output Renderers

## Overview

Output Renderers convert Universal Intermediate Format (UIF) to specific file formats. Each renderer is independent, allowing new formats to be added without affecting others.

> **Design Principle**: "One UIF, many outputs—renderers are interchangeable adapters."

---

## Table of Contents

1. [Renderer Architecture](#renderer-architecture)
2. [Renderer Priority](#renderer-priority)
3. [HTML Renderer](#html-renderer)
4. [PowerPoint Renderer](#powerpoint-renderer)
5. [PDF Renderer](#pdf-renderer)
6. [Markdown Renderer](#markdown-renderer)
7. [Google Slides Renderer](#google-slides-renderer)
8. [Rendering Modes](#rendering-modes)
9. [Error Handling](#error-handling)
10. [Performance Optimization](#performance-optimization)

---

## Renderer Architecture

### Renderer Interface

```typescript
interface Renderer {
  // Renderer identity
  readonly format: OutputFormat;
  readonly displayName: string;
  readonly mimeType: string;
  readonly fileExtension: string;
  
  // Capabilities
  readonly supportsAnimations: boolean;
  readonly supportsTransitions: boolean;
  readonly supportsInteractivity: boolean;
  
  // Render UIF to output
  render(uif: UniversalIntermediateFormat, options?: RenderOptions): Promise<RenderResult>;
  
  // Validate UIF compatibility
  validate(uif: UniversalIntermediateFormat): ValidationResult;
  
  // Estimate render time
  estimateRenderTime(uif: UniversalIntermediateFormat): number;
}

interface RenderOptions {
  quality?: 'draft' | 'standard' | 'high';
  outputPath?: string;                   // Override storage path
  includeNotes?: boolean;                // Include speaker notes
  embedAssets?: boolean;                 // Embed images vs. reference
  watermark?: WatermarkConfig;           // Add watermark
  password?: string;                     // Password protect (if supported)
}

interface RenderResult {
  success: boolean;
  format: OutputFormat;
  outputUrl: string;                     // Signed URL to download
  outputPath: string;                    // Storage path
  fileSize: number;                      // Bytes
  pageCount: number;
  renderTimeMs: number;
  expiresAt: Date;                       // URL expiration
  warnings?: string[];
  error?: string;
}
```

### Renderer Registry

```typescript
class RendererRegistry {
  private renderers: Map<OutputFormat, Renderer> = new Map();
  
  // Register a renderer
  register(renderer: Renderer): void {
    this.renderers.set(renderer.format, renderer);
  }
  
  // Get renderer by format
  get(format: OutputFormat): Renderer | undefined {
    return this.renderers.get(format);
  }
  
  // List available formats
  listFormats(): OutputFormat[] {
    return Array.from(this.renderers.keys());
  }
  
  // Render to multiple formats
  async renderMultiple(
    uif: UniversalIntermediateFormat,
    formats: OutputFormat[],
    options?: RenderOptions
  ): Promise<Map<OutputFormat, RenderResult>> {
    const results = new Map();
    await Promise.all(
      formats.map(async format => {
        const renderer = this.get(format);
        if (renderer) {
          results.set(format, await renderer.render(uif, options));
        }
      })
    );
    return results;
  }
}
```

---

## Renderer Priority

Implementation order based on complexity and dependencies:

| Priority | Format | Complexity | Dependencies | Status |
|----------|--------|------------|--------------|--------|
| 1 | **HTML** | Low | None | Phase 1 |
| 2 | **PPTX** | Medium | pptxgenjs | Phase 2 |
| 3 | **PDF** | Low | Playwright (from HTML) | Phase 3 |
| 4 | **Markdown** | Low | None | Phase 4 |
| 5 | **Google Slides** | High | Google APIs, OAuth | Phase 5 |

---

## HTML Renderer

### Overview

Converts UIF to a responsive HTML presentation with CSS animations.

| Property | Value |
|----------|-------|
| Format | `html` |
| MIME Type | `text/html` |
| Extension | `.html` |
| Animations | ✅ Full support |
| Transitions | ✅ Full support |
| Interactivity | ✅ Full support |

### Implementation

```typescript
class HTMLRenderer implements Renderer {
  readonly format = 'html';
  readonly displayName = 'HTML Presentation';
  readonly mimeType = 'text/html';
  readonly fileExtension = '.html';
  readonly supportsAnimations = true;
  readonly supportsTransitions = true;
  readonly supportsInteractivity = true;
  
  async render(uif: UIF, options?: RenderOptions): Promise<RenderResult> {
    const startTime = Date.now();
    
    // 1. Generate HTML structure
    const html = this.generateHTML(uif, options);
    
    // 2. Generate CSS
    const css = this.generateCSS(uif.theme);
    
    // 3. Generate JavaScript (animations, navigation)
    const js = this.generateJS(uif);
    
    // 4. Combine into single file
    const fullHTML = this.combineAssets(html, css, js, uif.title);
    
    // 5. Upload to blob storage
    const path = `generatedContent/${tenantId}/${shardId}/output.html`;
    const url = await this.uploadToBlob(fullHTML, path);
    
    return {
      success: true,
      format: 'html',
      outputUrl: url,
      outputPath: path,
      fileSize: Buffer.byteLength(fullHTML),
      pageCount: uif.pages.length,
      renderTimeMs: Date.now() - startTime,
      expiresAt: addHours(new Date(), 24)
    };
  }
  
  private generateHTML(uif: UIF, options?: RenderOptions): string {
    return `
      <div class="uif-presentation" data-document-type="${uif.documentType}">
        ${uif.pages.map((page, index) => this.renderPage(page, index, uif)).join('\n')}
      </div>
    `;
  }
  
  private renderPage(page: Page, index: number, uif: UIF): string {
    const background = this.renderBackground(page.background);
    const elements = page.elements.map(el => this.renderElement(el, uif.theme)).join('\n');
    
    return `
      <section class="uif-page" 
               data-page="${page.pageNumber}"
               data-layout="${page.layout}"
               style="${background}">
        ${elements}
      </section>
    `;
  }
  
  private renderElement(element: Element, theme: Theme): string {
    switch (element.type) {
      case 'text':
        return this.renderTextElement(element as TextElement, theme);
      case 'image':
        return this.renderImageElement(element as ImageElement);
      case 'chart':
        return this.renderChartElement(element as ChartElement);
      case 'table':
        return this.renderTableElement(element as TableElement);
      case 'shape':
        return this.renderShapeElement(element as ShapeElement);
      default:
        return '';
    }
  }
  
  private generateCSS(theme: Theme): string {
    return `
      :root {
        --primary-color: ${theme.primaryColor};
        --secondary-color: ${theme.secondaryColor};
        --background-color: ${theme.backgroundColor};
        --text-color: ${theme.textColor};
        --font-family: ${theme.fontFamily};
        --font-family-heading: ${theme.fontFamilyHeading || theme.fontFamily};
      }
      
      .uif-presentation {
        font-family: var(--font-family);
        color: var(--text-color);
      }
      
      .uif-page {
        width: 100vw;
        height: 100vh;
        position: relative;
        overflow: hidden;
      }
      
      /* Animation classes */
      .anim-fadeIn { animation: fadeIn var(--anim-duration, 400ms) ease-out forwards; }
      .anim-slideInLeft { animation: slideInLeft var(--anim-duration, 400ms) ease-out forwards; }
      
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      @keyframes slideInLeft {
        from { transform: translateX(-100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
  }
}
```

### HTML Output Features

- **Responsive**: Scales to viewport
- **Navigation**: Arrow keys, click, swipe
- **Animations**: CSS animations with configurable timing
- **Transitions**: Slide/fade between pages
- **Print mode**: Optimized for printing
- **Accessibility**: ARIA labels, keyboard navigation

---

## PowerPoint Renderer

### Overview

Converts UIF to PPTX format using pptxgenjs library.

| Property | Value |
|----------|-------|
| Format | `pptx` |
| MIME Type | `application/vnd.openxmlformats-officedocument.presentationml.presentation` |
| Extension | `.pptx` |
| Animations | ✅ Supported |
| Transitions | ✅ Supported |
| Interactivity | ❌ Limited |

### Implementation

```typescript
import PptxGenJS from 'pptxgenjs';

class PowerPointRenderer implements Renderer {
  readonly format = 'pptx';
  readonly displayName = 'PowerPoint';
  readonly mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
  readonly fileExtension = '.pptx';
  readonly supportsAnimations = true;
  readonly supportsTransitions = true;
  readonly supportsInteractivity = false;
  
  async render(uif: UIF, options?: RenderOptions): Promise<RenderResult> {
    const startTime = Date.now();
    const pptx = new PptxGenJS();
    
    // 1. Set presentation properties
    pptx.title = uif.title;
    pptx.author = uif.author || 'Castiel';
    pptx.layout = 'LAYOUT_16x9';
    
    // 2. Apply theme
    this.applyTheme(pptx, uif.theme);
    
    // 3. Render each page
    for (const page of uif.pages) {
      const slide = pptx.addSlide();
      await this.renderPage(slide, page, uif);
    }
    
    // 4. Generate file
    const buffer = await pptx.write({ outputType: 'nodebuffer' });
    
    // 5. Upload to blob storage
    const path = `generatedContent/${tenantId}/${shardId}/output.pptx`;
    const url = await this.uploadToBlob(buffer, path);
    
    return {
      success: true,
      format: 'pptx',
      outputUrl: url,
      outputPath: path,
      fileSize: buffer.length,
      pageCount: uif.pages.length,
      renderTimeMs: Date.now() - startTime,
      expiresAt: addHours(new Date(), 24)
    };
  }
  
  private applyTheme(pptx: PptxGenJS, theme: Theme): void {
    pptx.defineSlideMaster({
      title: 'CASTIEL_MASTER',
      background: { color: theme.backgroundColor.replace('#', '') },
      objects: [
        // Define master objects
      ]
    });
  }
  
  private async renderPage(slide: any, page: Page, uif: UIF): Promise<void> {
    // Apply background
    if (page.background) {
      this.applyBackground(slide, page.background);
    }
    
    // Apply transition
    if (page.transition) {
      this.applyTransition(slide, page.transition);
    }
    
    // Render elements
    for (const element of page.elements) {
      await this.renderElement(slide, element, uif.theme);
    }
    
    // Add speaker notes
    if (page.notes) {
      slide.addNotes(page.notes);
    }
  }
  
  private async renderElement(slide: any, element: Element, theme: Theme): Promise<void> {
    // Convert relative position to inches (for 10"x7.5" slide)
    const pos = this.convertPosition(element.position, element.size);
    
    switch (element.type) {
      case 'text':
        await this.renderText(slide, element as TextElement, pos, theme);
        break;
      case 'image':
        await this.renderImage(slide, element as ImageElement, pos);
        break;
      case 'chart':
        await this.renderChart(slide, element as ChartElement, pos);
        break;
      case 'table':
        await this.renderTable(slide, element as TableElement, pos);
        break;
      case 'shape':
        await this.renderShape(slide, element as ShapeElement, pos);
        break;
    }
  }
  
  private convertPosition(position: Position, size: Size): PPTXPosition {
    // Convert percentage to inches (10" x 7.5" slide)
    const slideWidth = 10;
    const slideHeight = 7.5;
    
    return {
      x: this.percentToInches(position.x, slideWidth),
      y: this.percentToInches(position.y, slideHeight),
      w: this.percentToInches(size.width, slideWidth),
      h: size.height === 'auto' ? undefined : this.percentToInches(size.height, slideHeight)
    };
  }
  
  private percentToInches(value: string | number, total: number): number {
    if (typeof value === 'number') return value / 96; // px to inches
    if (value.endsWith('%')) {
      return (parseFloat(value) / 100) * total;
    }
    return parseFloat(value);
  }
}
```

### PPTX Animation Mapping

| UIF Animation | PPTX Effect |
|---------------|-------------|
| `fadeIn` | `fade` |
| `slideInLeft` | `fly` (from left) |
| `slideInRight` | `fly` (from right) |
| `slideInTop` | `fly` (from top) |
| `slideInBottom` | `fly` (from bottom) |
| `zoomIn` | `zoom` |
| `bounceIn` | `bounce` |

### PPTX Transition Mapping

| UIF Transition | PPTX Transition |
|----------------|-----------------|
| `fade` | `fade` |
| `slide` | `push` |
| `push` | `push` |
| `zoom` | `zoom` |
| `flip` | `flip` |

---

## PDF Renderer

### Overview

Generates PDF by first rendering HTML and then converting using Playwright.

| Property | Value |
|----------|-------|
| Format | `pdf` |
| MIME Type | `application/pdf` |
| Extension | `.pdf` |
| Animations | ❌ Static |
| Transitions | ❌ Static |
| Interactivity | ✅ Links only |

### Implementation

```typescript
import { chromium } from 'playwright';

class PDFRenderer implements Renderer {
  readonly format = 'pdf';
  readonly displayName = 'PDF Document';
  readonly mimeType = 'application/pdf';
  readonly fileExtension = '.pdf';
  readonly supportsAnimations = false;
  readonly supportsTransitions = false;
  readonly supportsInteractivity = true; // Links work
  
  private htmlRenderer: HTMLRenderer;
  
  constructor() {
    this.htmlRenderer = new HTMLRenderer();
  }
  
  async render(uif: UIF, options?: RenderOptions): Promise<RenderResult> {
    const startTime = Date.now();
    
    // 1. First render to HTML (print mode)
    const htmlResult = await this.htmlRenderer.render(uif, {
      ...options,
      printMode: true
    });
    
    // 2. Launch browser
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    try {
      // 3. Load HTML
      const htmlContent = await this.fetchHTML(htmlResult.outputUrl);
      await page.setContent(htmlContent, { waitUntil: 'networkidle' });
      
      // 4. Configure PDF options
      const pdfOptions = this.getPDFOptions(uif, options);
      
      // 5. Generate PDF
      const pdfBuffer = await page.pdf(pdfOptions);
      
      // 6. Upload to blob storage
      const path = `generatedContent/${tenantId}/${shardId}/output.pdf`;
      const url = await this.uploadToBlob(pdfBuffer, path);
      
      return {
        success: true,
        format: 'pdf',
        outputUrl: url,
        outputPath: path,
        fileSize: pdfBuffer.length,
        pageCount: uif.pages.length,
        renderTimeMs: Date.now() - startTime,
        expiresAt: addHours(new Date(), 24)
      };
    } finally {
      await browser.close();
    }
  }
  
  private getPDFOptions(uif: UIF, options?: RenderOptions): PDFOptions {
    const isPresentation = uif.documentType === 'presentation';
    
    return {
      format: isPresentation ? undefined : 'A4',
      width: isPresentation ? '1920px' : undefined,
      height: isPresentation ? '1080px' : undefined,
      landscape: isPresentation,
      printBackground: true,
      margin: isPresentation ? { top: 0, right: 0, bottom: 0, left: 0 } : {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      },
      displayHeaderFooter: !isPresentation && options?.includeNotes,
      headerTemplate: '<div></div>',
      footerTemplate: `
        <div style="font-size: 10px; text-align: center; width: 100%;">
          <span class="pageNumber"></span> / <span class="totalPages"></span>
        </div>
      `
    };
  }
}
```

### PDF Quality Settings

| Quality | Resolution | Use Case |
|---------|------------|----------|
| `draft` | 72 DPI | Quick preview |
| `standard` | 150 DPI | Screen viewing |
| `high` | 300 DPI | Print quality |

---

## Markdown Renderer

### Overview

Converts UIF to Markdown format (text-only, no visuals).

| Property | Value |
|----------|-------|
| Format | `markdown` |
| MIME Type | `text/markdown` |
| Extension | `.md` |
| Animations | ❌ N/A |
| Transitions | ❌ N/A |
| Interactivity | ✅ Links |

### Implementation

```typescript
class MarkdownRenderer implements Renderer {
  readonly format = 'markdown';
  readonly displayName = 'Markdown';
  readonly mimeType = 'text/markdown';
  readonly fileExtension = '.md';
  readonly supportsAnimations = false;
  readonly supportsTransitions = false;
  readonly supportsInteractivity = true;
  
  async render(uif: UIF, options?: RenderOptions): Promise<RenderResult> {
    const startTime = Date.now();
    
    // Generate markdown content
    let md = `# ${uif.title}\n\n`;
    
    if (uif.description) {
      md += `> ${uif.description}\n\n`;
    }
    
    md += `---\n\n`;
    
    for (const page of uif.pages) {
      md += this.renderPage(page);
    }
    
    // Add metadata
    md += `\n---\n\n`;
    md += `*Generated by Castiel*\n`;
    
    // Upload
    const path = `generatedContent/${tenantId}/${shardId}/output.md`;
    const url = await this.uploadToBlob(md, path);
    
    return {
      success: true,
      format: 'markdown',
      outputUrl: url,
      outputPath: path,
      fileSize: Buffer.byteLength(md),
      pageCount: uif.pages.length,
      renderTimeMs: Date.now() - startTime,
      expiresAt: addHours(new Date(), 24)
    };
  }
  
  private renderPage(page: Page): string {
    let md = '';
    
    // Page header
    if (page.title) {
      md += `## ${page.title}\n\n`;
    }
    
    // Render text elements
    for (const element of page.elements) {
      md += this.renderElement(element);
    }
    
    md += '\n---\n\n';
    
    // Speaker notes
    if (page.notes) {
      md += `> **Notes:** ${page.notes}\n\n`;
    }
    
    return md;
  }
  
  private renderElement(element: Element): string {
    switch (element.type) {
      case 'text':
        return this.renderText(element as TextElement);
      case 'image':
        return this.renderImage(element as ImageElement);
      case 'table':
        return this.renderTable(element as TableElement);
      case 'chart':
        return this.renderChart(element as ChartElement);
      default:
        return '';
    }
  }
  
  private renderText(el: TextElement): string {
    // If already markdown, return as-is
    if (el.format === 'markdown') {
      return el.value + '\n\n';
    }
    return el.value + '\n\n';
  }
  
  private renderImage(el: ImageElement): string {
    return `![${el.alt}](${el.source})\n\n`;
  }
  
  private renderTable(el: TableElement): string {
    let md = '';
    
    // Headers
    if (el.headers) {
      md += '| ' + el.headers.map(h => h.value).join(' | ') + ' |\n';
      md += '| ' + el.headers.map(() => '---').join(' | ') + ' |\n';
    }
    
    // Rows
    for (const row of el.rows) {
      md += '| ' + row.cells.map(c => c.value).join(' | ') + ' |\n';
    }
    
    return md + '\n';
  }
  
  private renderChart(el: ChartElement): string {
    // Render chart data as table
    let md = `**${el.options?.title || 'Chart'}**\n\n`;
    
    md += '| Category | ' + el.data.datasets.map(d => d.label).join(' | ') + ' |\n';
    md += '| --- | ' + el.data.datasets.map(() => '---').join(' | ') + ' |\n';
    
    for (let i = 0; i < el.data.labels.length; i++) {
      md += `| ${el.data.labels[i]} | `;
      md += el.data.datasets.map(d => d.values[i]).join(' | ');
      md += ' |\n';
    }
    
    return md + '\n';
  }
}
```

---

## Google Slides Renderer

### Overview

Converts UIF to Google Slides presentation using Google Slides API.

| Property | Value |
|----------|-------|
| Format | `google_slides` |
| MIME Type | `application/vnd.google-apps.presentation` |
| Extension | N/A (cloud) |
| Animations | ✅ Limited |
| Transitions | ✅ Supported |
| Interactivity | ✅ Full |

### Authentication Modes

| Mode | Use Case | Setup |
|------|----------|-------|
| **Service Account** | Server-to-server | Create in GCP, share folder |
| **OAuth per User** | User's own Drive | OAuth flow, token storage |

### Implementation

```typescript
import { google } from 'googleapis';

class GoogleSlidesRenderer implements Renderer {
  readonly format = 'google_slides';
  readonly displayName = 'Google Slides';
  readonly mimeType = 'application/vnd.google-apps.presentation';
  readonly fileExtension = '';
  readonly supportsAnimations = true;
  readonly supportsTransitions = true;
  readonly supportsInteractivity = true;
  
  async render(uif: UIF, options?: RenderOptions): Promise<RenderResult> {
    const startTime = Date.now();
    
    // 1. Get auth client (Service Account or OAuth)
    const auth = await this.getAuthClient(options);
    const slides = google.slides({ version: 'v1', auth });
    const drive = google.drive({ version: 'v3', auth });
    
    // 2. Create presentation
    const presentation = await slides.presentations.create({
      requestBody: {
        title: uif.title
      }
    });
    const presentationId = presentation.data.presentationId!;
    
    // 3. Build batch update requests
    const requests: any[] = [];
    
    // Delete default slide
    const defaultSlideId = presentation.data.slides?.[0]?.objectId;
    if (defaultSlideId) {
      requests.push({ deleteObject: { objectId: defaultSlideId } });
    }
    
    // Add slides and elements
    for (let i = 0; i < uif.pages.length; i++) {
      const page = uif.pages[i];
      const slideId = `slide_${i}`;
      
      // Create slide
      requests.push({
        createSlide: {
          objectId: slideId,
          insertionIndex: i,
          slideLayoutReference: { predefinedLayout: this.mapLayout(page.layout) }
        }
      });
      
      // Add elements
      const elementRequests = await this.createElementRequests(page, slideId, uif.theme);
      requests.push(...elementRequests);
    }
    
    // 4. Execute batch update
    await slides.presentations.batchUpdate({
      presentationId,
      requestBody: { requests }
    });
    
    // 5. Upload images (separate API calls)
    await this.uploadImages(presentationId, uif, slides);
    
    // 6. Get shareable link
    await drive.permissions.create({
      fileId: presentationId,
      requestBody: {
        type: 'anyone',
        role: 'reader'
      }
    });
    
    const file = await drive.files.get({
      fileId: presentationId,
      fields: 'webViewLink'
    });
    
    return {
      success: true,
      format: 'google_slides',
      outputUrl: file.data.webViewLink!,
      outputPath: presentationId,
      fileSize: 0, // Not applicable
      pageCount: uif.pages.length,
      renderTimeMs: Date.now() - startTime,
      expiresAt: new Date('2099-12-31') // Cloud storage
    };
  }
  
  private async getAuthClient(options?: RenderOptions): Promise<any> {
    // Service Account (default)
    if (!options?.useUserOAuth) {
      return new google.auth.GoogleAuth({
        keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
        scopes: [
          'https://www.googleapis.com/auth/presentations',
          'https://www.googleapis.com/auth/drive'
        ]
      });
    }
    
    // User OAuth
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    oauth2Client.setCredentials(options.userTokens);
    return oauth2Client;
  }
  
  private mapLayout(layout: string): string {
    const layoutMap: Record<string, string> = {
      'title-slide': 'TITLE',
      'title-and-body': 'TITLE_AND_BODY',
      'two-column': 'TITLE_AND_TWO_COLUMNS',
      'section-header': 'SECTION_HEADER',
      'blank': 'BLANK',
      'image-left': 'CAPTION_ONLY',
      'image-right': 'CAPTION_ONLY'
    };
    return layoutMap[layout] || 'BLANK';
  }
  
  private async createElementRequests(
    page: Page, 
    slideId: string, 
    theme: Theme
  ): Promise<any[]> {
    const requests: any[] = [];
    
    for (let i = 0; i < page.elements.length; i++) {
      const element = page.elements[i];
      const elementId = `${slideId}_element_${i}`;
      
      switch (element.type) {
        case 'text':
          requests.push(...this.createTextRequests(element, slideId, elementId, theme));
          break;
        case 'shape':
          requests.push(...this.createShapeRequests(element, slideId, elementId));
          break;
        case 'table':
          requests.push(...this.createTableRequests(element, slideId, elementId));
          break;
        // Images handled separately via Drive API
      }
    }
    
    return requests;
  }
  
  private createTextRequests(
    element: TextElement, 
    slideId: string, 
    elementId: string,
    theme: Theme
  ): any[] {
    const pos = this.convertToEMU(element.position, element.size);
    
    return [
      {
        createShape: {
          objectId: elementId,
          shapeType: 'TEXT_BOX',
          elementProperties: {
            pageObjectId: slideId,
            size: {
              width: { magnitude: pos.w, unit: 'EMU' },
              height: { magnitude: pos.h || 1000000, unit: 'EMU' }
            },
            transform: {
              scaleX: 1,
              scaleY: 1,
              translateX: pos.x,
              translateY: pos.y,
              unit: 'EMU'
            }
          }
        }
      },
      {
        insertText: {
          objectId: elementId,
          text: element.value
        }
      },
      {
        updateTextStyle: {
          objectId: elementId,
          style: {
            fontSize: { magnitude: element.style?.fontSize || 16, unit: 'PT' },
            foregroundColor: {
              opaqueColor: { 
                rgbColor: this.hexToRgb(element.style?.color || theme.textColor) 
              }
            }
          },
          fields: 'fontSize,foregroundColor'
        }
      }
    ];
  }
  
  private convertToEMU(position: Position, size: Size): any {
    // EMU = English Metric Units (914400 EMU = 1 inch)
    // Slide is 10" x 7.5" (9144000 x 6858000 EMU)
    const slideWidthEMU = 9144000;
    const slideHeightEMU = 6858000;
    
    return {
      x: this.percentToEMU(position.x, slideWidthEMU),
      y: this.percentToEMU(position.y, slideHeightEMU),
      w: this.percentToEMU(size.width, slideWidthEMU),
      h: size.height === 'auto' ? undefined : this.percentToEMU(size.height, slideHeightEMU)
    };
  }
  
  private percentToEMU(value: string | number, total: number): number {
    if (typeof value === 'number') return value * 9525; // px to EMU
    if (value.endsWith('%')) {
      return (parseFloat(value) / 100) * total;
    }
    return parseFloat(value) * 9525;
  }
  
  private hexToRgb(hex: string): { red: number; green: number; blue: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      red: parseInt(result[1], 16) / 255,
      green: parseInt(result[2], 16) / 255,
      blue: parseInt(result[3], 16) / 255
    } : { red: 0, green: 0, blue: 0 };
  }
}
```

---

## Rendering Modes

### Synchronous vs Asynchronous

| Mode | Use Case | Configuration |
|------|----------|---------------|
| **Synchronous** | Small content (<10 pages, <5 seconds) | User waits |
| **Asynchronous** | Large content (>10 pages, >5 seconds) | Job queue |

### Configuration

```typescript
interface RenderModeConfig {
  // Thresholds for async mode
  syncMaxPages: number;              // Default: 10
  syncMaxElements: number;           // Default: 100
  syncMaxTimeoutMs: number;          // Default: 30000
  
  // Per-format overrides
  formatOverrides?: {
    [format: string]: {
      forceAsync?: boolean;
      forceSync?: boolean;
    };
  };
}

// Tenant settings (Super Admin configurable)
interface TenantRenderSettings {
  tenantId: string;
  renderModeConfig: RenderModeConfig;
}
```

### Mode Selection Logic

```typescript
function selectRenderMode(
  uif: UIF,
  format: OutputFormat,
  config: RenderModeConfig
): 'sync' | 'async' {
  // Check format overrides
  const formatOverride = config.formatOverrides?.[format];
  if (formatOverride?.forceAsync) return 'async';
  if (formatOverride?.forceSync) return 'sync';
  
  // Check thresholds
  if (uif.pages.length > config.syncMaxPages) return 'async';
  
  const totalElements = uif.pages.reduce((sum, p) => sum + p.elements.length, 0);
  if (totalElements > config.syncMaxElements) return 'async';
  
  // Google Slides always async (external API)
  if (format === 'google_slides') return 'async';
  
  return 'sync';
}
```

---

## Error Handling

### Error Types

```typescript
enum RenderErrorCode {
  // Validation errors
  INVALID_UIF = 'INVALID_UIF',
  UNSUPPORTED_ELEMENT = 'UNSUPPORTED_ELEMENT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // Resource errors
  IMAGE_LOAD_FAILED = 'IMAGE_LOAD_FAILED',
  FONT_NOT_AVAILABLE = 'FONT_NOT_AVAILABLE',
  
  // External service errors
  GOOGLE_API_ERROR = 'GOOGLE_API_ERROR',
  STORAGE_UPLOAD_FAILED = 'STORAGE_UPLOAD_FAILED',
  
  // Processing errors
  RENDER_TIMEOUT = 'RENDER_TIMEOUT',
  OUT_OF_MEMORY = 'OUT_OF_MEMORY',
  
  // Quota errors
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED'
}

interface RenderError {
  code: RenderErrorCode;
  message: string;
  details?: Record<string, any>;
  retryable: boolean;
}
```

### Graceful Degradation

```typescript
// If an element fails, continue with warning
async function renderWithFallback(
  element: Element,
  renderer: Renderer
): Promise<{ success: boolean; warning?: string }> {
  try {
    await renderer.renderElement(element);
    return { success: true };
  } catch (error) {
    // Log error
    logger.warn('Element render failed, using fallback', { element, error });
    
    // Use placeholder
    await renderer.renderPlaceholder(element, error.message);
    
    return {
      success: true,
      warning: `Element ${element.id || element.type} could not be rendered: ${error.message}`
    };
  }
}
```

---

## Performance Optimization

### Caching

```typescript
// Cache rendered outputs
const RENDER_CACHE_TTL = 3600; // 1 hour

interface RenderCache {
  // Cache key: hash of UIF + format + options
  get(key: string): Promise<RenderResult | null>;
  set(key: string, result: RenderResult, ttl: number): Promise<void>;
}

function getCacheKey(uif: UIF, format: OutputFormat, options?: RenderOptions): string {
  return hash({
    uifHash: hash(JSON.stringify(uif)),
    format,
    quality: options?.quality,
    includeNotes: options?.includeNotes
  });
}
```

### Parallel Processing

```typescript
// Render multiple formats in parallel
async function renderAll(
  uif: UIF,
  formats: OutputFormat[],
  options?: RenderOptions
): Promise<Map<OutputFormat, RenderResult>> {
  const results = new Map();
  
  await Promise.all(
    formats.map(async format => {
      const renderer = registry.get(format);
      if (renderer) {
        const result = await renderer.render(uif, options);
        results.set(format, result);
      }
    })
  );
  
  return results;
}
```

### Resource Optimization

| Resource | Optimization |
|----------|--------------|
| **Images** | Compress, resize to max dimensions |
| **Fonts** | Use web-safe fonts, subset custom fonts |
| **Charts** | Render as SVG (vector), cache data |
| **Browser** | Reuse browser instance for PDF |

---

## Related Documentation

- [Content Generation README](./README.md)
- [UIF Specification](./UIF-SPECIFICATION.md)
- [Implementation TODO](./IMPLEMENTATION_TODO.md)

---

**Last Updated**: November 2025  
**Version**: 1.0.0  
**Maintainer**: Castiel Development Team

