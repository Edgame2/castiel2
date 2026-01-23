# Google Docs - Placeholder System

## Overview

Complete guide for implementing placeholder-based content generation with Google Docs. This document covers API integration, authentication, placeholder extraction from paragraphs, headers, tables, and inline text, plus document rewriting.

---

## Table of Contents

1. [Google Docs API Integration](#google-docs-api-integration)
2. [Authentication](#authentication)
3. [Placeholder Extraction](#placeholder-extraction)
4. [Placeholder Configuration](#placeholder-configuration)
5. [Content Generation & Replacement](#content-generation--replacement)
6. [Document Rewriting](#document-rewriting)
7. [Output Options](#output-options)
8. [API Endpoints](#api-endpoints)
9. [Examples & Use Cases](#examples--use-cases)

---

## Google Docs API Integration

### API Overview

**Google Docs API v1**:
- REST API for reading and modifying documents
- Batch update operations for text replacement
- Support for paragraphs, headers, tables, inline formatting

**Required Scopes**:
- `https://www.googleapis.com/auth/documents` - Read/write documents
- `https://www.googleapis.com/auth/drive.readonly` - Read Drive files
- `https://www.googleapis.com/auth/drive.file` - Create files in Drive

### API Client Setup

```typescript
import { google } from 'googleapis';

// Initialize OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

oauth2Client.setCredentials({
  access_token: userToken.accessToken,
  refresh_token: userToken.refreshToken
});

// Create API clients
const docs = google.docs({ version: 'v1', auth: oauth2Client });
const drive = google.drive({ version: 'v3', auth: oauth2Client });
```

---

## Authentication

Same authentication flow as Google Slides. See [Google Slides Authentication](./GOOGLE-SLIDES.md#authentication) for details.

**OAuth2 Scopes**:
- `https://www.googleapis.com/auth/documents`
- `https://www.googleapis.com/auth/drive.readonly`
- `https://www.googleapis.com/auth/drive.file`

---

## Placeholder Extraction

### Extraction Process

#### Step 1: Get Document

```typescript
async function getDocument(documentId: string) {
  const document = await docs.documents.get({
    documentId,
    fields: 'title,body'
  });
  
  return document.data;
}
```

#### Step 2: Extract from Paragraphs

```typescript
async function extractFromParagraphs(documentId: string) {
  const document = await getDocument(documentId);
  const placeholders: PlaceholderMatch[] = [];
  
  // Iterate through body content
  for (const element of document.body?.content || []) {
    if (element.paragraph) {
      const paragraph = element.paragraph;
      const text = extractTextFromParagraph(paragraph);
      
      const matches = extractPlaceholders(text, {
        elementId: element.startIndex?.toString() || '',
        elementType: 'paragraph',
        paragraphIndex: getParagraphIndex(element)
      });
      
      placeholders.push(...matches);
    }
  }
  
  return placeholders;
}

function extractTextFromParagraph(paragraph: any): string {
  return paragraph.elements
    ?.map((el: any) => el.textRun?.content || '')
    .join('') || '';
}
```

#### Step 3: Extract from Headers

```typescript
async function extractFromHeaders(documentId: string) {
  const document = await getDocument(documentId);
  const placeholders: PlaceholderMatch[] = [];
  
  for (const element of document.body?.content || []) {
    if (element.paragraph) {
      const paragraph = element.paragraph;
      
      // Check if it's a heading
      if (paragraph.paragraphStyle?.namedStyleType?.startsWith('HEADING')) {
        const text = extractTextFromParagraph(paragraph);
        
        const matches = extractPlaceholders(text, {
          elementId: element.startIndex?.toString() || '',
          elementType: 'header',
          headerLevel: paragraph.paragraphStyle.namedStyleType
        });
        
        placeholders.push(...matches);
      }
    }
  }
  
  return placeholders;
}
```

#### Step 4: Extract from Tables

```typescript
async function extractFromTables(documentId: string) {
  const document = await getDocument(documentId);
  const placeholders: PlaceholderMatch[] = [];
  
  for (const element of document.body?.content || []) {
    if (element.table) {
      const table = element.table;
      
      for (let rowIndex = 0; rowIndex < table.tableRows.length; rowIndex++) {
        const row = table.tableRows[rowIndex];
        
        for (let cellIndex = 0; cellIndex < row.tableCells.length; cellIndex++) {
          const cell = row.tableCells[cellIndex];
          
          // Extract text from cell
          const cellText = cell.content
            ?.map(el => {
              if (el.paragraph) {
                return extractTextFromParagraph(el.paragraph);
              }
              return '';
            })
            .join('') || '';
          
          const matches = extractPlaceholders(cellText, {
            elementId: element.startIndex?.toString() || '',
            elementType: 'table',
            tablePosition: { row: rowIndex, col: cellIndex }
          });
          
          placeholders.push(...matches);
        }
      }
    }
  }
  
  return placeholders;
}
```

#### Step 5: Extract from Inline Text

```typescript
async function extractFromInlineText(documentId: string) {
  const document = await getDocument(documentId);
  const placeholders: PlaceholderMatch[] = [];
  
  // Extract from all text runs
  function extractFromElement(element: any, location: PlaceholderLocation) {
    if (element.paragraph) {
      for (const paraElement of element.paragraph.elements || []) {
        if (paraElement.textRun) {
          const text = paraElement.textRun.content || '';
          const startIndex = paraElement.startIndex || 0;
          
          const matches = extractPlaceholders(text, {
            ...location,
            position: {
              startIndex,
              endIndex: startIndex + text.length
            }
          });
          
          placeholders.push(...matches);
        }
      }
    }
  }
  
  for (const element of document.body?.content || []) {
    extractFromElement(element, {
      elementId: element.startIndex?.toString() || '',
      elementType: 'text'
    });
  }
  
  return placeholders;
}
```

#### Step 6: Placeholder Parser

Same parser as Google Slides. See [Google Slides Placeholder Parser](./GOOGLE-SLIDES.md#step-6-placeholder-parser).

---

## Placeholder Configuration

Same configuration UI and process as Google Slides. See [Google Slides Placeholder Configuration](./GOOGLE-SLIDES.md#placeholder-configuration).

**Note**: Chart placeholders are less common in documents, but still supported for embedded charts.

---

## Content Generation & Replacement

### Generation Process

Same AI generation process as Google Slides. See [Google Slides Chart Generation](./GOOGLE-SLIDES.md#chart-generation--insertion) for chart generation details.

For text placeholders:

```typescript
async function generateTextContent(
  placeholder: PlaceholderDefinition,
  context?: any
): Promise<string> {
  const prompt = buildPrompt(placeholder.configuration, context);
  const response = await generateWithAI(prompt);
  return validateAndFormat(response, placeholder.configuration);
}
```

---

## Document Rewriting

### Rewriting Process

#### Step 1: Create Duplicate

```typescript
async function duplicateDocument(
  sourceDocumentId: string,
  newName: string
): Promise<string> {
  const copy = await drive.files.copy({
    fileId: sourceDocumentId,
    requestBody: {
      name: newName
    }
  });
  
  return copy.data.id!;
}
```

#### Step 2: Replace Text Placeholders

```typescript
async function replacePlaceholders(
  documentId: string,
  template: DocumentTemplate,
  generatedValues: Record<string, any>
) {
  const requests: any[] = [];
  
  for (const placeholder of template.placeholders) {
    const value = generatedValues[placeholder.id];
    if (!value) continue;
    
    for (const location of placeholder.locations) {
      if (location.documentFormat !== 'google_docs') continue;
      
      // Find text range
      const startIndex = location.position.startIndex || 0;
      const endIndex = location.position.endIndex || startIndex;
      
      // Delete original placeholder text
      requests.push({
        deleteContentRange: {
          range: {
            startIndex,
            endIndex,
            segmentId: ''
          }
        }
      });
      
      // Insert generated text
      requests.push({
        insertText: {
          location: {
            index: startIndex,
            segmentId: ''
          },
          text: value
        }
      });
    }
  }
  
  // Execute batch update
  if (requests.length > 0) {
    await docs.documents.batchUpdate({
      documentId,
      requestBody: { requests }
    });
  }
}
```

#### Step 3: Replace in Tables

```typescript
async function replaceInTables(
  documentId: string,
  template: DocumentTemplate,
  generatedValues: Record<string, any>
) {
  const requests: any[] = [];
  
  for (const placeholder of template.placeholders) {
    const value = generatedValues[placeholder.id];
    if (!value) continue;
    
    for (const location of placeholder.locations) {
      if (location.elementType !== 'table' || !location.tablePosition) continue;
      
      const { row, col } = location.tablePosition;
      
      // Get table cell index
      const cellIndex = await getTableCellIndex(
        documentId,
        location.elementId,
        row,
        col
      );
      
      // Replace text in cell
      const startIndex = location.position.startIndex || 0;
      const endIndex = location.position.endIndex || startIndex;
      
      requests.push({
        deleteContentRange: {
          range: {
            startIndex: cellIndex + startIndex,
            endIndex: cellIndex + endIndex,
            segmentId: ''
          }
        }
      });
      
      requests.push({
        insertText: {
          location: {
            index: cellIndex + startIndex,
            segmentId: ''
          },
          text: value
        }
      });
    }
  }
  
  if (requests.length > 0) {
    await docs.documents.batchUpdate({
      documentId,
      requestBody: { requests }
    });
  }
}
```

#### Step 4: Insert Lists

```typescript
async function insertList(
  documentId: string,
  location: PlaceholderLocation,
  listItems: string[]
) {
  const requests: any[] = [];
  const startIndex = location.position.startIndex || 0;
  
  // Delete placeholder
  requests.push({
    deleteContentRange: {
      range: {
        startIndex,
        endIndex: location.position.endIndex || startIndex,
        segmentId: ''
      }
    }
  });
  
  // Insert list items with bullets
  const listText = listItems.map(item => `• ${item}`).join('\n');
  
  requests.push({
    insertText: {
      location: {
        index: startIndex,
        segmentId: ''
      },
      text: listText
    }
  });
  
  // Apply list formatting
  requests.push({
    createParagraphBullets: {
      range: {
        startIndex,
        endIndex: startIndex + listText.length,
        segmentId: ''
      },
      bulletPreset: 'BULLET_DISC_CIRCLE_SQUARE'
    }
  });
  
  await docs.documents.batchUpdate({
    documentId,
    requestBody: { requests }
  });
}
```

#### Step 5: Preserve Formatting

Google Docs API automatically preserves formatting when using `insertText`. To explicitly preserve:

```typescript
async function preserveFormatting(
  documentId: string,
  startIndex: number,
  endIndex: number
) {
  // Get existing formatting
  const document = await getDocument(documentId);
  const formatting = getTextFormatting(document, startIndex, endIndex);
  
  // Apply when inserting
  requests.push({
    updateTextStyle: {
      range: {
        startIndex,
        endIndex,
        segmentId: ''
      },
      textStyle: formatting,
      fields: 'bold,italic,underline,foregroundColor,fontSize'
    }
  });
}
```

---

## Output Options

### Save to Drive

```typescript
async function saveToDrive(
  documentId: string,
  folderId?: string
): Promise<string> {
  if (folderId) {
    await drive.files.update({
      fileId: documentId,
      addParents: folderId
    });
  }
  
  return documentId;
}
```

### Export as PDF/DOCX

```typescript
async function exportDocument(
  documentId: string,
  format: 'pdf' | 'docx'
): Promise<Buffer> {
  const mimeType = format === 'pdf' 
    ? 'application/pdf' 
    : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  
  const response = await drive.files.export({
    fileId: documentId,
    mimeType
  }, {
    responseType: 'arraybuffer'
  });
  
  return Buffer.from(response.data as ArrayBuffer);
}
```

### Set Sharing

Same as Google Slides. See [Google Slides Sharing](./GOOGLE-SLIDES.md#set-sharing-permissions).

---

## API Endpoints

### Extract from Google Docs

```http
POST /api/v1/content/templates/extract
Authorization: Bearer {token}
Content-Type: application/json

{
  "documentUrl": "https://docs.google.com/document/d/ABC123/edit",
  "documentFormat": "google_docs",
  "name": "Proposal Template"
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
    "outputFolderId": "drive-folder-id"
  }
}
```

---

## Examples & Use Cases

### Example 1: Proposal Document

**Template**: Business proposal with placeholders:
- `{{client_name}}` - Client company name
- `{{project_scope: text|min=200|max=500|tone=formal}}` - Project description
- `{{timeline: list|min=3|max=6}}` - Project timeline
- `{{budget: number}}` - Project budget

**Generation**:
1. Extract placeholders from proposal template
2. Admin configures descriptions
3. User generates with project context
4. AI fills placeholders from project Shard
5. New proposal document created

### Example 2: Contract Template

**Template**: Service contract with:
- `{{party_name}}` - Contract party
- `{{service_description: text|tone=legal|min=100}}` - Service details
- `{{term_length: number}}` - Contract term
- `{{payment_terms: text|tone=formal}}` - Payment terms

**Generation**:
- Context from `c_opportunity` Shard
- Terms from related documents
- Legal tone maintained
- Formal language generated

---

**Last Updated**: December 2025  
**Version**: 1.0.0  
**Maintainer**: Castiel Development Team
