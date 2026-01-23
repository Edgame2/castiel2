# Microsoft Word (OneDrive) - Placeholder System

## Overview

Complete guide for implementing placeholder-based content generation with Microsoft Word documents stored in OneDrive. This document covers Microsoft Graph API integration, authentication, placeholder extraction from paragraphs, headers/footers, tables, and content controls, plus document rewriting.

---

## Table of Contents

1. [Microsoft Graph API Integration](#microsoft-graph-api-integration)
2. [Authentication](#authentication)
3. [Placeholder Extraction](#placeholder-extraction)
4. [Placeholder Configuration](#placeholder-configuration)
5. [Content Generation & Replacement](#content-generation--replacement)
6. [Document Rewriting](#document-rewriting)
7. [Output Options](#output-options)
8. [API Endpoints](#api-endpoints)
9. [Examples & Use Cases](#examples--use-cases)

---

## Microsoft Graph API Integration

### API Overview

**Microsoft Graph API**:
- REST API for accessing OneDrive files and Office documents
- Support for Word documents via `/me/drive/items/{id}/workbook` or direct file access
- Batch operations for efficiency

**Required Scopes**:
- `Files.ReadWrite` - Read and write user files
- `Files.ReadWrite.All` - Read and write all files (admin)
- `offline_access` - Refresh token access

### API Client Setup

```typescript
import { Client } from '@microsoft/microsoft-graph-client';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials';
import { ClientSecretCredential } from '@azure/identity';

// Initialize Azure AD client
const credential = new ClientSecretCredential(
  process.env.AZURE_TENANT_ID!,
  process.env.AZURE_CLIENT_ID!,
  process.env.AZURE_CLIENT_SECRET!
);

const authProvider = new TokenCredentialAuthenticationProvider(credential, {
  scopes: ['https://graph.microsoft.com/.default']
});

const client = Client.initWithMiddleware({ authProvider });
```

### OAuth2 Client Setup (User Authentication)

```typescript
import { PublicClientApplication } from '@azure/msal-browser';

const msalConfig = {
  auth: {
    clientId: process.env.MICROSOFT_CLIENT_ID!,
    authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
    redirectUri: process.env.MICROSOFT_REDIRECT_URI!
  }
};

const pca = new PublicClientApplication(msalConfig);
```

---

## Authentication

### OAuth2 Flow (User Authentication)

**Step 1: Initiate OAuth**

```http
GET /api/v1/auth/microsoft/oauth?redirect_uri={redirect_uri}
```

Redirects to Microsoft login.

**Step 2: User Authorizes**

User redirected to Microsoft consent screen, then callback:

```http
GET /api/v1/auth/microsoft/callback?code={auth_code}
```

**Step 3: Exchange Code for Tokens**

```typescript
import { ConfidentialClientApplication } from '@azure/msal-node';

const msalClient = new ConfidentialClientApplication({
  auth: {
    clientId: process.env.MICROSOFT_CLIENT_ID!,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
    authority: `https://login.microsoftonline.com/${tenantId}`
  }
});

const { accessToken, refreshToken, expiresOn } = await msalClient.acquireTokenByCode({
  code: authCode,
  redirectUri: redirectUri,
  scopes: ['Files.ReadWrite', 'offline_access']
});

// Store tokens (encrypted)
await storeUserTokens(userId, {
  accessToken,
  refreshToken,
  expiryDate: expiresOn
});
```

**Step 4: Token Refresh**

```typescript
async function refreshTokenIfNeeded(userId: string) {
  const tokens = await getUserTokens(userId);
  
  if (tokens.expiryDate < Date.now()) {
    const result = await msalClient.acquireTokenByRefreshToken({
      refreshToken: tokens.refreshToken,
      scopes: ['Files.ReadWrite', 'offline_access']
    });
    
    await updateUserTokens(userId, {
      accessToken: result.accessToken,
      expiryDate: result.expiresOn
    });
  }
}
```

### Service Principal (Tenant-Level)

For tenant-level service principals:

1. Create App Registration in Azure AD
2. Grant API permissions (Files.ReadWrite.All)
3. Create client secret
4. Store encrypted in tenant settings

```typescript
interface TenantMicrosoftConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;  // Encrypted
  driveSiteId?: string;  // SharePoint site ID (optional)
}
```

---

## Placeholder Extraction

### Extraction Process

#### Step 1: Download Document

```typescript
async function downloadDocument(itemId: string): Promise<Buffer> {
  const driveItem = await client
    .api(`/me/drive/items/${itemId}`)
    .get();
  
  const content = await client
    .api(`/me/drive/items/${itemId}/content`)
    .getStream();
  
  return Buffer.from(await content.arrayBuffer());
}
```

#### Step 2: Parse Word Document

```typescript
import { Document, Packer, Paragraph, TextRun } from 'docx';

async function parseWordDocument(buffer: Buffer) {
  // Use docx library to parse document
  const doc = await Document.load(buffer);
  const placeholders: PlaceholderMatch[] = [];
  
  // Extract from paragraphs
  for (let i = 0; i < doc.sections.length; i++) {
    const section = doc.sections[i];
    
    for (const paragraph of section.children) {
      if (paragraph instanceof Paragraph) {
        const text = extractTextFromParagraph(paragraph);
        const matches = extractPlaceholders(text, {
          elementId: `para-${i}-${paragraph.id}`,
          elementType: 'paragraph',
          paragraphIndex: i
        });
        
        placeholders.push(...matches);
      }
    }
  }
  
  return placeholders;
}

function extractTextFromParagraph(paragraph: Paragraph): string {
  return paragraph.children
    .filter(child => child instanceof TextRun)
    .map(child => (child as TextRun).text)
    .join('');
}
```

#### Step 3: Extract from Headers

```typescript
async function extractFromHeaders(doc: Document) {
  const placeholders: PlaceholderMatch[] = [];
  
  for (const section of doc.sections) {
    // Header
    if (section.headers) {
      for (const header of section.headers.default) {
        const text = extractTextFromParagraph(header);
        const matches = extractPlaceholders(text, {
          elementId: `header-${section.id}`,
          elementType: 'header'
        });
        
        placeholders.push(...matches);
      }
    }
    
    // Footer
    if (section.footers) {
      for (const footer of section.footers.default) {
        const text = extractTextFromParagraph(footer);
        const matches = extractPlaceholders(text, {
          elementId: `footer-${section.id}`,
          elementType: 'footer'
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
import { Table, TableRow, TableCell } from 'docx';

async function extractFromTables(doc: Document) {
  const placeholders: PlaceholderMatch[] = [];
  
  for (const section of doc.sections) {
    for (const child of section.children) {
      if (child instanceof Table) {
        const table = child as Table;
        
        for (let rowIndex = 0; rowIndex < table.rows.length; rowIndex++) {
          const row = table.rows[rowIndex] as TableRow;
          
          for (let cellIndex = 0; cellIndex < row.children.length; cellIndex++) {
            const cell = row.children[cellIndex] as TableCell;
            
            // Extract text from cell
            const cellText = cell.children
              .filter(child => child instanceof Paragraph)
              .map(para => extractTextFromParagraph(para as Paragraph))
              .join('');
            
            const matches = extractPlaceholders(cellText, {
              elementId: `table-${table.id}`,
              elementType: 'table',
              tablePosition: { row: rowIndex, col: cellIndex }
            });
            
            placeholders.push(...matches);
          }
        }
      }
    }
  }
  
  return placeholders;
}
```

#### Step 5: Extract from Content Controls

```typescript
async function extractFromContentControls(doc: Document) {
  const placeholders: PlaceholderMatch[] = [];
  
  // Content controls are stored in document properties
  // Parse XML to find content controls
  const xml = await doc.getDocumentXml();
  const contentControls = parseContentControls(xml);
  
  for (const control of contentControls) {
    const text = control.text || '';
    const matches = extractPlaceholders(text, {
      elementId: `control-${control.id}`,
      elementType: 'content_control',
      controlTag: control.tag
    });
    
    placeholders.push(...matches);
  }
  
  return placeholders;
}
```

#### Step 6: Placeholder Parser

Same parser as Google Docs. See [Google Docs Placeholder Parser](./GOOGLE-DOCS.md#step-6-placeholder-parser).

---

## Placeholder Configuration

Same configuration UI and process as Google Slides/Docs. See [Google Slides Placeholder Configuration](./GOOGLE-SLIDES.md#placeholder-configuration).

**Note**: Chart placeholders are supported but require image insertion (Word doesn't support native charts via API).

---

## Content Generation & Replacement

### Generation Process

Same AI generation process as Google Docs. See [Google Docs Content Generation](./GOOGLE-DOCS.md#content-generation--replacement).

For charts, generate image and insert:

```typescript
async function generateChartImage(
  chartConfig: ChartConfig,
  data: ChartData,
  templateColors: string[]
): Promise<Buffer> {
  // Use Google Charts API (same as Google Slides)
  return renderChart(chartConfig, data, templateColors);
}
```

---

## Document Rewriting

### Rewriting Process

#### Step 1: Download Original

```typescript
async function downloadOriginal(itemId: string): Promise<Buffer> {
  return downloadDocument(itemId);
}
```

#### Step 2: Replace Text Placeholders

```typescript
import { Document, Packer, Paragraph, TextRun, replaceText } from 'docx';

async function replacePlaceholders(
  buffer: Buffer,
  template: DocumentTemplate,
  generatedValues: Record<string, any>
): Promise<Buffer> {
  const doc = await Document.load(buffer);
  
  for (const placeholder of template.placeholders) {
    const value = generatedValues[placeholder.id];
    if (!value) continue;
    
    // Replace in all locations
    for (const location of placeholder.locations) {
      if (location.documentFormat !== 'word') continue;
      
      // Find and replace text
      replaceTextInDocument(doc, placeholder.rawPlaceholder, value);
    }
  }
  
  // Generate new document
  return await Packer.toBuffer(doc);
}

function replaceTextInDocument(
  doc: Document,
  searchText: string,
  replaceText: string
) {
  for (const section of doc.sections) {
    // Replace in paragraphs
    for (const child of section.children) {
      if (child instanceof Paragraph) {
        replaceTextInParagraph(child, searchText, replaceText);
      }
    }
    
    // Replace in headers
    if (section.headers) {
      for (const header of section.headers.default) {
        replaceTextInParagraph(header, searchText, replaceText);
      }
    }
    
    // Replace in footers
    if (section.footers) {
      for (const footer of section.footers.default) {
        replaceTextInParagraph(footer, searchText, replaceText);
      }
    }
  }
}

function replaceTextInParagraph(
  paragraph: Paragraph,
  searchText: string,
  replaceText: string
) {
  const newChildren: any[] = [];
  
  for (const child of paragraph.children) {
    if (child instanceof TextRun) {
      const text = child.text;
      if (text.includes(searchText)) {
        const parts = text.split(searchText);
        
        for (let i = 0; i < parts.length; i++) {
          if (parts[i]) {
            newChildren.push(new TextRun(parts[i]));
          }
          if (i < parts.length - 1) {
            newChildren.push(new TextRun(replaceText));
          }
        }
      } else {
        newChildren.push(child);
      }
    } else {
      newChildren.push(child);
    }
  }
  
  paragraph.children = newChildren;
}
```

#### Step 3: Insert Charts

```typescript
import { ImageRun, Paragraph } from 'docx';

async function insertCharts(
  doc: Document,
  template: DocumentTemplate,
  generatedCharts: Record<string, Buffer>
) {
  for (const placeholder of template.placeholders) {
    if (placeholder.type !== 'chart') continue;
    
    const chartImage = generatedCharts[placeholder.id];
    if (!chartImage) continue;
    
    for (const location of placeholder.locations) {
      // Find paragraph containing placeholder
      const paragraph = findParagraphByLocation(doc, location);
      
      if (paragraph) {
        // Replace placeholder with image
        const imageRun = new ImageRun({
          data: chartImage,
          transformation: {
            width: 400,
            height: 300
          }
        });
        
        // Remove placeholder text, insert image
        replaceTextInParagraph(paragraph, placeholder.rawPlaceholder, '');
        paragraph.addImage(imageRun);
      }
    }
  }
}
```

#### Step 4: Insert Lists

```typescript
import { Bullet } from 'docx';

async function insertList(
  doc: Document,
  location: PlaceholderLocation,
  listItems: string[]
) {
  const paragraph = findParagraphByLocation(doc, location);
  
  if (paragraph) {
    // Replace placeholder
    replaceTextInParagraph(paragraph, placeholder.rawPlaceholder, '');
    
    // Add list items
    for (const item of listItems) {
      const listPara = new Paragraph({
        text: item,
        bullet: { level: 0 }
      });
      
      // Insert after current paragraph
      insertParagraphAfter(doc, paragraph, listPara);
    }
  }
}
```

#### Step 5: Upload New Document

```typescript
async function uploadDocument(
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

```typescript
async function saveToOneDrive(
  itemId: string,
  folderId?: string
): Promise<string> {
  if (folderId) {
    await client
      .api(`/me/drive/items/${itemId}`)
      .patch({
        parentReference: {
          id: folderId
        }
      });
  }
  
  return itemId;
}
```

### Set Sharing Permissions

```typescript
async function setSharing(
  itemId: string,
  permissions: 'private' | 'view' | 'edit'
) {
  const roleMap = {
    'private': 'read',
    'view': 'read',
    'edit': 'write'
  };
  
  await client
    .api(`/me/drive/items/${itemId}/permissions`)
    .post({
      recipients: [{
        '@odata.type': 'microsoft.graph.driveRecipient',
        email: 'anyone'
      }],
      roles: [roleMap[permissions]]
    });
}
```

### Export as PDF

```typescript
async function exportAsPDF(itemId: string): Promise<Buffer> {
  const content = await client
    .api(`/me/drive/items/${itemId}/content`)
    .getStream();
  
  // Convert DOCX to PDF (server-side)
  const pdfBuffer = await convertDocxToPdf(await content.arrayBuffer());
  
  return Buffer.from(pdfBuffer);
}
```

---

## API Endpoints

### Extract from Word

```http
POST /api/v1/content/templates/extract
Authorization: Bearer {token}
Content-Type: application/json

{
  "documentUrl": "https://onedrive.live.com/edit.aspx?id=ABC123",
  "documentFormat": "word",
  "name": "Contract Template"
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

### Example 1: Service Agreement

**Template**: Service agreement with placeholders:
- `{{client_name}}` - Client company name
- `{{service_description: text|tone=legal|min=200}}` - Service details
- `{{term_months: number}}` - Contract term
- `{{payment_amount: number}}` - Payment amount

**Generation**:
1. Extract placeholders from agreement template
2. Admin configures descriptions
3. User generates with opportunity context
4. AI fills placeholders from opportunity Shard
5. New agreement document created in OneDrive

### Example 2: Statement of Work

**Template**: SOW document with:
- `{{project_name}}` - Project name
- `{{deliverables: list|min=3|max=8}}` - Project deliverables
- `{{timeline: text|tone=formal}}` - Project timeline
- `{{budget: number}}` - Project budget

**Generation**:
- Context from `c_project` Shard
- Deliverables from project tasks
- Timeline from project milestones
- Budget from opportunity value

---

**Last Updated**: December 2025  
**Version**: 1.0.0  
**Maintainer**: Castiel Development Team
