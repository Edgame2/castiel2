# Microsoft PowerPoint (OneDrive) - Placeholder System

## Overview

Complete guide for implementing placeholder-based content generation with Microsoft PowerPoint presentations stored in OneDrive. This document covers Microsoft Graph API integration, authentication, placeholder extraction from text boxes, shapes, tables, and notes, plus document rewriting.

---

## Table of Contents

1. [Microsoft Graph API Integration](#microsoft-graph-api-integration)
2. [Authentication](#authentication)
3. [Placeholder Extraction](#placeholder-extraction)
4. [Placeholder Configuration](#placeholder-configuration)
5. [Chart Generation & Insertion](#chart-generation--insertion)
6. [Document Rewriting](#document-rewriting)
7. [Output Options](#output-options)
8. [API Endpoints](#api-endpoints)
9. [Examples & Use Cases](#examples--use-cases)

---

## Microsoft Graph API Integration

### API Overview

**Microsoft Graph API**:
- REST API for accessing OneDrive files and Office documents
- PowerPoint files accessed via `/me/drive/items/{id}/workbook` or direct file access
- Note: PowerPoint API support is limited; may require Office.js or server-side processing

**Required Scopes**:
- `Files.ReadWrite` - Read and write user files
- `Files.ReadWrite.All` - Read and write all files (admin)
- `offline_access` - Refresh token access

### API Client Setup

Same as Word. See [OneDrive Word API Setup](./ONEDRIVE-WORD.md#api-client-setup).

**Note**: PowerPoint manipulation may require:
- Office.js (client-side)
- Server-side PPTX manipulation libraries (e.g., `pptxgenjs`, `officegen`)
- Or conversion to/from other formats

---

## Authentication

Same authentication flow as Word. See [OneDrive Word Authentication](./ONEDRIVE-WORD.md#authentication) for details.

**OAuth2 Scopes**:
- `Files.ReadWrite`
- `Files.ReadWrite.All`
- `offline_access`

---

## Placeholder Extraction

### Extraction Process

#### Step 1: Download Presentation

```typescript
async function downloadPresentation(itemId: string): Promise<Buffer> {
  const content = await client
    .api(`/me/drive/items/${itemId}/content`)
    .getStream();
  
  return Buffer.from(await content.arrayBuffer());
}
```

#### Step 2: Parse PowerPoint

```typescript
import { Presentation, Slide, Shape } from 'pptxgenjs';
import JSZip from 'jszip';

async function parsePowerPoint(buffer: Buffer) {
  // PowerPoint files are ZIP archives containing XML
  const zip = await JSZip.loadAsync(buffer);
  const placeholders: PlaceholderMatch[] = [];
  
  // Parse presentation.xml
  const presentationXml = await zip.file('ppt/presentation.xml')?.async('string');
  const slides = parsePresentationXml(presentationXml);
  
  // Extract from each slide
  for (let slideIndex = 0; slideIndex < slides.length; slideIndex++) {
    const slideId = slides[slideIndex].id;
    const slideXml = await zip.file(`ppt/slides/slide${slideIndex + 1}.xml`)?.async('string');
    
    const slidePlaceholders = extractFromSlideXml(slideXml, slideIndex);
    placeholders.push(...slidePlaceholders);
  }
  
  return placeholders;
}
```

#### Step 3: Extract from Text Boxes

```typescript
function extractFromSlideXml(slideXml: string, slideNumber: number) {
  const placeholders: PlaceholderMatch[] = [];
  
  // Parse XML to find text boxes
  const parser = new DOMParser();
  const doc = parser.parseFromString(slideXml, 'text/xml');
  
  // Find all text elements
  const textElements = doc.querySelectorAll('a\\:t, t');
  
  for (const textElement of textElements) {
    const text = textElement.textContent || '';
    const shapeId = textElement.closest('p\\:sp, sp')?.getAttribute('id') || '';
    
    const matches = extractPlaceholders(text, {
      elementId: shapeId,
      pageNumber: slideNumber,
      elementType: 'text'
    });
    
    placeholders.push(...matches);
  }
  
  return placeholders;
}
```

#### Step 4: Extract from Shapes

```typescript
function extractFromShapes(slideXml: string, slideNumber: number) {
  const placeholders: PlaceholderMatch[] = [];
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(slideXml, 'text/xml');
  
  // Find shapes (non-text)
  const shapes = doc.querySelectorAll('p\\:sp, sp');
  
  for (const shape of shapes) {
    const shapeId = shape.getAttribute('id') || '';
    
    // Check shape properties for placeholder text
    const shapeText = shape.querySelector('p\\:nvSpPr > p\\:cNvPr, nvSpPr > cNvPr')?.getAttribute('name') || '';
    
    const matches = extractPlaceholders(shapeText, {
      elementId: shapeId,
      pageNumber: slideNumber,
      elementType: 'shape'
    });
    
    placeholders.push(...matches);
  }
  
  return placeholders;
}
```

#### Step 5: Extract from Tables

```typescript
function extractFromTables(slideXml: string, slideNumber: number) {
  const placeholders: PlaceholderMatch[] = [];
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(slideXml, 'text/xml');
  
  // Find tables
  const tables = doc.querySelectorAll('a\\:tbl, tbl');
  
  for (const table of tables) {
    const tableId = table.getAttribute('id') || '';
    const rows = table.querySelectorAll('a\\:tr, tr');
    
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
      const cells = row.querySelectorAll('a\\:tc, tc');
      
      for (let cellIndex = 0; cellIndex < cells.length; cellIndex++) {
        const cell = cells[cellIndex];
        const cellText = cell.textContent || '';
        
        const matches = extractPlaceholders(cellText, {
          elementId: tableId,
          pageNumber: slideNumber,
          elementType: 'table',
          tablePosition: { row: rowIndex, col: cellIndex }
        });
        
        placeholders.push(...matches);
      }
    }
  }
  
  return placeholders;
}
```

#### Step 6: Extract from Notes

```typescript
async function extractFromNotes(
  zip: JSZip,
  slideNumber: number
): Promise<PlaceholderMatch[]> {
  const placeholders: PlaceholderMatch[] = [];
  
  // Notes are in separate files
  const notesXml = await zip.file(`ppt/notesSlides/notesSlide${slideNumber + 1}.xml`)?.async('string');
  
  if (!notesXml) return placeholders;
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(notesXml, 'text/xml');
  
  // Extract text from notes
  const textElements = doc.querySelectorAll('a\\:t, t');
  
  for (const textElement of textElements) {
    const text = textElement.textContent || '';
    const notesId = `notes-${slideNumber}`;
    
    const matches = extractPlaceholders(text, {
      elementId: notesId,
      pageNumber: slideNumber,
      elementType: 'note'
    });
    
    placeholders.push(...matches);
  }
  
  return placeholders;
}
```

#### Step 7: Placeholder Parser

Same parser as Google Slides. See [Google Slides Placeholder Parser](./GOOGLE-SLIDES.md#step-6-placeholder-parser).

---

## Placeholder Configuration

Same configuration UI and process as Google Slides. See [Google Slides Placeholder Configuration](./GOOGLE-SLIDES.md#placeholder-configuration).

**Chart Configuration**: Same as Google Slides, using Google Charts API for rendering.

---

## Chart Generation & Insertion

### Chart Generation

Same as Google Slides. See [Google Slides Chart Generation](./GOOGLE-SLIDES.md#chart-generation--insertion).

**Note**: PowerPoint doesn't support native charts via Graph API, so charts are inserted as images.

### Insert Chart into Slide

```typescript
import JSZip from 'jszip';
import { Image } from 'sharp';

async function insertChartIntoSlide(
  buffer: Buffer,
  slideNumber: number,
  elementId: string,
  chartImage: Buffer,
  originalShape: any
): Promise<Buffer> {
  const zip = await JSZip.loadAsync(buffer);
  
  // Upload chart image to OneDrive first
  const imageItemId = await uploadImageToOneDrive(chartImage, `chart-${Date.now()}.png`);
  const imageUrl = await getImageUrl(imageItemId);
  
  // Modify slide XML
  const slideXml = await zip.file(`ppt/slides/slide${slideNumber + 1}.xml`)?.async('string');
  const modifiedXml = insertImageIntoSlideXml(
    slideXml,
    elementId,
    imageUrl,
    originalShape
  );
  
  // Update ZIP
  zip.file(`ppt/slides/slide${slideNumber + 1}.xml`, modifiedXml);
  
  // Add image to ZIP
  zip.file(`ppt/media/chart-${elementId}.png`, chartImage);
  
  // Update relationships
  const relsXml = await zip.file(`ppt/slides/_rels/slide${slideNumber + 1}.xml.rels`)?.async('string');
  const modifiedRels = addImageRelationship(relsXml, `chart-${elementId}.png`);
  zip.file(`ppt/slides/_rels/slide${slideNumber + 1}.xml.rels`, modifiedRels);
  
  // Generate new buffer
  return await zip.generateAsync({ type: 'nodebuffer' });
}

function insertImageIntoSlideXml(
  slideXml: string,
  elementId: string,
  imageUrl: string,
  originalShape: any
): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(slideXml, 'text/xml');
  
  // Find original shape
  const shape = doc.querySelector(`p\\:sp[@id="${elementId}"], sp[@id="${elementId}"]`);
  
  if (shape) {
    // Replace with image
    const pic = doc.createElementNS('http://schemas.openxmlformats.org/presentationml/2006/main', 'p:pic');
    
    // Set image properties
    const nvPicPr = doc.createElementNS('http://schemas.openxmlformats.org/presentationml/2006/main', 'p:nvPicPr');
    const cNvPr = doc.createElementNS('http://schemas.openxmlformats.org/drawingml/2006/main', 'a:cNvPr');
    cNvPr.setAttribute('id', elementId);
    cNvPr.setAttribute('name', 'Chart');
    nvPicPr.appendChild(cNvPr);
    pic.appendChild(nvPicPr);
    
    // Add image reference
    const blip = doc.createElementNS('http://schemas.openxmlformats.org/drawingml/2006/main', 'a:blip');
    blip.setAttribute('r:embed', `rId${elementId}`);
    pic.appendChild(blip);
    
    // Replace shape
    shape.parentNode?.replaceChild(pic, shape);
  }
  
  return new XMLSerializer().serializeToString(doc);
}
```

---

## Document Rewriting

### Rewriting Process

#### Step 1: Download Original

```typescript
async function downloadOriginal(itemId: string): Promise<Buffer> {
  return downloadPresentation(itemId);
}
```

#### Step 2: Replace Text Placeholders

```typescript
async function replacePlaceholders(
  buffer: Buffer,
  template: DocumentTemplate,
  generatedValues: Record<string, any>
): Promise<Buffer> {
  const zip = await JSZip.loadAsync(buffer);
  
  // Get all slides
  const presentationXml = await zip.file('ppt/presentation.xml')?.async('string');
  const slides = parsePresentationXml(presentationXml);
  
  for (const placeholder of template.placeholders) {
    const value = generatedValues[placeholder.id];
    if (!value) continue;
    
    for (const location of placeholder.locations) {
      if (location.documentFormat !== 'powerpoint') continue;
      
      const slideXml = await zip.file(`ppt/slides/slide${location.pageNumber + 1}.xml`)?.async('string');
      const modifiedXml = replaceTextInSlideXml(
        slideXml,
        placeholder.rawPlaceholder,
        value,
        location.elementId
      );
      
      zip.file(`ppt/slides/slide${location.pageNumber + 1}.xml`, modifiedXml);
    }
  }
  
  return await zip.generateAsync({ type: 'nodebuffer' });
}

function replaceTextInSlideXml(
  slideXml: string,
  searchText: string,
  replaceText: string,
  elementId: string
): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(slideXml, 'text/xml');
  
  // Find element
  const element = doc.querySelector(`p\\:sp[@id="${elementId}"], sp[@id="${elementId}"]`);
  
  if (element) {
    // Find text nodes
    const textNodes = element.querySelectorAll('a\\:t, t');
    
    for (const textNode of textNodes) {
      const text = textNode.textContent || '';
      if (text.includes(searchText)) {
        textNode.textContent = text.replace(searchText, replaceText);
      }
    }
  }
  
  return new XMLSerializer().serializeToString(doc);
}
```

#### Step 3: Insert Charts

```typescript
async function insertCharts(
  buffer: Buffer,
  template: DocumentTemplate,
  generatedCharts: Record<string, Buffer>
): Promise<Buffer> {
  let modifiedBuffer = buffer;
  
  for (const placeholder of template.placeholders) {
    if (placeholder.type !== 'chart') continue;
    
    const chartImage = generatedCharts[placeholder.id];
    if (!chartImage) continue;
    
    for (const location of placeholder.locations) {
      // Get original shape
      const originalShape = await getShapeFromSlide(
        modifiedBuffer,
        location.pageNumber,
        location.elementId
      );
      
      modifiedBuffer = await insertChartIntoSlide(
        modifiedBuffer,
        location.pageNumber,
        location.elementId,
        chartImage,
        originalShape
      );
    }
  }
  
  return modifiedBuffer;
}
```

#### Step 4: Upload New Presentation

```typescript
async function uploadPresentation(
  buffer: Buffer,
  fileName: string,
  folderId?: string
): Promise<string> {
  const uploadPath = folderId 
    ? `/me/drive/items/${folderId}/children`
    : '/me/drive/root/children';
  
  const upload = await client
    .api(uploadPath)
    .post({
      name: fileName,
      file: {
        data: buffer
      }
    });
  
  return upload.id;
}
```

---

## Output Options

### Save to OneDrive

Same as Word. See [OneDrive Word Save](./ONEDRIVE-WORD.md#save-to-onedrive).

### Set Sharing Permissions

Same as Word. See [OneDrive Word Sharing](./ONEDRIVE-WORD.md#set-sharing-permissions).

### Export as PDF

```typescript
async function exportAsPDF(itemId: string): Promise<Buffer> {
  // PowerPoint to PDF conversion
  // Option 1: Use Microsoft Graph export (if available)
  const content = await client
    .api(`/me/drive/items/${itemId}/content?format=pdf`)
    .getStream();
  
  // Option 2: Server-side conversion
  const pptxBuffer = await downloadPresentation(itemId);
  const pdfBuffer = await convertPptxToPdf(pptxBuffer);
  
  return Buffer.from(pdfBuffer);
}
```

---

## API Endpoints

### Extract from PowerPoint

```http
POST /api/v1/content/templates/extract
Authorization: Bearer {token}
Content-Type: application/json

{
  "documentUrl": "https://onedrive.live.com/edit.aspx?id=ABC123",
  "documentFormat": "powerpoint",
  "name": "Sales Deck Template"
}
```

### Generate Document

```http
POST /api/v1/content/templates/{templateId}/generate
Authorization: Bearer {token}
Content-Type: application/json

{
  "contextShardId": "project-uuid",
  "options": {
    "outputFolderId": "onedrive-folder-id"
  }
}
```

---

## Examples & Use Cases

### Example 1: Sales Presentation

**Template**: Sales deck with placeholders:
- `{{company_name}}` - Target company
- `{{product_name}}` - Product being sold
- `{{problem_statement: text|tone=marketing|min=50|max=200}}` - Problem description
- `{{revenue_chart: chart|type=bar|x=quarter|y=revenue}}` - Revenue chart

**Generation**:
1. Extract placeholders from template
2. Admin configures descriptions
3. User generates with project context
4. AI fills placeholders
5. Chart generated from opportunity data
6. New presentation created in OneDrive

### Example 2: Quarterly Review

**Template**: QBR deck with:
- `{{quarter}}` - Quarter name
- `{{revenue: number}}` - Revenue number
- `{{growth_chart: chart|type=line}}` - Growth trend
- `{{key_metrics: list|min=3|max=5}}` - Key metrics list

**Generation**:
- Context from `c_project` Shard
- Revenue from `c_opportunity` Shards
- Chart from historical data
- Metrics list generated by AI

---

**Last Updated**: December 2025  
**Version**: 1.0.0  
**Maintainer**: Castiel Development Team
