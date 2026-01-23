# Google Slides - Placeholder System

## Overview

Complete guide for implementing placeholder-based content generation with Google Slides. This document covers API integration, authentication, placeholder extraction, configuration, chart generation, and document rewriting.

---

## Table of Contents

1. [Google Slides API Integration](#google-slides-api-integration)
2. [Authentication](#authentication)
3. [Placeholder Extraction](#placeholder-extraction)
4. [Placeholder Configuration](#placeholder-configuration)
5. [Chart Generation & Insertion](#chart-generation--insertion)
6. [Document Rewriting](#document-rewriting)
7. [Output Options](#output-options)
8. [API Endpoints](#api-endpoints)
9. [Examples & Use Cases](#examples--use-cases)

---

## Google Slides API Integration

### API Overview

**Google Slides API v1**:
- REST API for reading and modifying presentations
- Batch update operations for efficiency
- Support for text, shapes, images, tables, charts

**Required Scopes**:
- `https://www.googleapis.com/auth/presentations` - Read/write presentations
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

// Set credentials (from stored token)
oauth2Client.setCredentials({
  access_token: userToken.accessToken,
  refresh_token: userToken.refreshToken
});

// Create API clients
const slides = google.slides({ version: 'v1', auth: oauth2Client });
const drive = google.drive({ version: 'v3', auth: oauth2Client });
```

### Service Account Setup (Optional)

For server-to-server operations:

```typescript
import { GoogleAuth } from 'google-auth-library';

const auth = new GoogleAuth({
  keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
  scopes: [
    'https://www.googleapis.com/auth/presentations',
    'https://www.googleapis.com/auth/drive'
  ]
});

const slides = google.slides({ version: 'v1', auth });
const drive = google.drive({ version: 'v3', auth });
```

---

## Authentication

### OAuth2 Flow (User Authentication)

**Step 1: Initiate OAuth**

```http
GET /api/v1/auth/google/oauth?redirect_uri={redirect_uri}
```

**Step 2: User Authorizes**

User redirected to Google consent screen, then callback:

```http
GET /api/v1/auth/google/callback?code={auth_code}
```

**Step 3: Exchange Code for Tokens**

```typescript
const { tokens } = await oauth2Client.getToken(code);

// Store tokens (encrypted)
await storeUserTokens(userId, {
  accessToken: tokens.access_token,
  refreshToken: tokens.refresh_token,
  expiryDate: tokens.expiry_date
});
```

**Step 4: Token Refresh**

```typescript
async function refreshTokenIfNeeded(userId: string) {
  const tokens = await getUserTokens(userId);
  
  if (tokens.expiryDate < Date.now()) {
    oauth2Client.setCredentials({
      refresh_token: tokens.refreshToken
    });
    
    const { credentials } = await oauth2Client.refreshAccessToken();
    
    await updateUserTokens(userId, {
      accessToken: credentials.access_token,
      expiryDate: credentials.expiry_date
    });
  }
}
```

### Service Account (Tenant-Level)

For tenant-level service accounts:

1. Create service account in Google Cloud Console
2. Download JSON key file
3. Store encrypted in tenant settings
4. Share Drive folder with service account email

```typescript
interface TenantGoogleConfig {
  tenantId: string;
  serviceAccountKey: string;  // Encrypted JSON
  driveFolderId?: string;     // Shared folder for generated docs
}
```

---

## Placeholder Extraction

### Extraction Process

#### Step 1: Get Presentation

```typescript
async function getPresentation(presentationId: string) {
  const presentation = await slides.presentations.get({
    presentationId,
    fields: 'slides,title'
  });
  
  return presentation.data;
}
```

#### Step 2: Extract Text from Slides

```typescript
async function extractTextFromSlides(presentationId: string) {
  const presentation = await getPresentation(presentationId);
  const placeholders: PlaceholderMatch[] = [];
  
  for (const slide of presentation.slides || []) {
    const slideId = slide.objectId!;
    const pageNumber = slide.pageNumber || 0;
    
    // Get slide elements
    const slideData = await slides.presentations.pages.get({
      presentationId,
      pageObjectId: slideId
    });
    
    // Extract from text elements
    for (const element of slideData.data.pageElements || []) {
      if (element.shape?.text) {
        const text = element.shape.text.textElements
          ?.map(el => el.textRun?.content || '')
          .join('');
        
        const matches = extractPlaceholders(text, {
          elementId: element.objectId!,
          pageNumber,
          elementType: 'text'
        });
        
        placeholders.push(...matches);
      }
    }
  }
  
  return placeholders;
}
```

#### Step 3: Extract from Shapes

```typescript
async function extractFromShapes(slide: any, presentationId: string) {
  const placeholders: PlaceholderMatch[] = [];
  
  for (const element of slide.pageElements || []) {
    if (element.shape && !element.shape.text) {
      // Shape with placeholder in description or alt text
      const shapeText = element.shape.shapeProperties?.contentAlignment || '';
      
      // Check if shape contains placeholder
      const matches = extractPlaceholders(shapeText, {
        elementId: element.objectId!,
        pageNumber: slide.pageNumber,
        elementType: 'shape'
      });
      
      placeholders.push(...matches);
    }
  }
  
  return placeholders;
}
```

#### Step 4: Extract from Tables

```typescript
async function extractFromTables(slide: any, presentationId: string) {
  const placeholders: PlaceholderMatch[] = [];
  
  for (const element of slide.pageElements || []) {
    if (element.table) {
      const table = element.table;
      
      for (let row = 0; row < table.rows.length; row++) {
        for (let col = 0; col < table.rows[row].tableCells.length; col++) {
          const cell = table.rows[row].tableCells[col];
          const cellText = cell.text?.textElements
            ?.map(el => el.textRun?.content || '')
            .join('');
          
          const matches = extractPlaceholders(cellText, {
            elementId: element.objectId!,
            pageNumber: slide.pageNumber,
            elementType: 'table',
            cellPosition: { row, col }
          });
          
          placeholders.push(...matches);
        }
      }
    }
  }
  
  return placeholders;
}
```

#### Step 5: Extract from Speaker Notes

```typescript
async function extractFromNotes(slide: any, presentationId: string) {
  const placeholders: PlaceholderMatch[] = [];
  
  if (slide.slideProperties?.notesPage?.notesProperties?.speakerNotesObjectId) {
    const notesId = slide.slideProperties.notesPage.notesProperties.speakerNotesObjectId;
    
    // Get notes page
    const notesPage = await slides.presentations.pages.get({
      presentationId,
      pageObjectId: notesId
    });
    
    // Extract text from notes
    for (const element of notesPage.data.pageElements || []) {
      if (element.shape?.text) {
        const text = element.shape.text.textElements
          ?.map(el => el.textRun?.content || '')
          .join('');
        
        const matches = extractPlaceholders(text, {
          elementId: element.objectId!,
          pageNumber: slide.pageNumber,
          elementType: 'note'
        });
        
        placeholders.push(...matches);
      }
    }
  }
  
  return placeholders;
}
```

#### Step 6: Placeholder Parser

```typescript
function extractPlaceholders(
  text: string,
  location: PlaceholderLocation
): PlaceholderMatch[] {
  const regex = /\{\{([^}]+)\}\}/g;
  const matches: PlaceholderMatch[] = [];
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    const fullMatch = match[0];  // "{{company_name:text|min=10}}"
    const content = match[1];    // "company_name:text|min=10"
    
    // Parse placeholder
    const parsed = parsePlaceholderSyntax(content);
    
    matches.push({
      rawPlaceholder: fullMatch,
      name: parsed.name,
      type: parsed.type,
      metadata: parsed.metadata,
      location: {
        ...location,
        position: {
          startIndex: match.index,
          endIndex: match.index + fullMatch.length
        },
        context: getContext(text, match.index, 50)  // 50 chars before/after
      }
    });
  }
  
  return matches;
}

function parsePlaceholderSyntax(content: string) {
  // Format: "name:type|key=value|key=value"
  const parts = content.split('|');
  const firstPart = parts[0];
  
  let name: string;
  let type: PlaceholderType = 'text';
  const metadata: Record<string, any> = {};
  
  if (firstPart.includes(':')) {
    [name, type] = firstPart.split(':') as [string, PlaceholderType];
  } else {
    name = firstPart;
  }
  
  // Parse metadata
  for (let i = 1; i < parts.length; i++) {
    const [key, value] = parts[i].split('=');
    metadata[key] = parseMetadataValue(value);
  }
  
  return { name, type, metadata };
}

function parseMetadataValue(value: string): any {
  // Try to parse as number
  if (!isNaN(Number(value))) {
    return Number(value);
  }
  
  // Try to parse as boolean
  if (value === 'true') return true;
  if (value === 'false') return false;
  
  // Return as string
  return value;
}
```

---

## Placeholder Configuration

### Configuration UI

Tenant admin configures placeholders extracted from Google Slides:

**Configuration Fields**:
- **Placeholder Name**: `company_name` (read-only)
- **Type**: Dropdown (text, number, email, domain, list, chart, image)
- **Description**: "Target company name for this sales pitch" (required)
- **Tone**: formal, casual, marketing, analytical, executive, neutral
- **Min/Max Length**: Character or word limits
- **Required**: Checkbox
- **Chart Config** (if chart):
  - Chart Type: bar, line, pie, area, scatter, funnel, histogram
  - X/Y Axis: Field names
  - Data Source: shards, manual, API, AI
  - Filters: Key-value pairs

**Template Colors**:
- Up to 6 dominant colors (hex)
- Used for chart colors
- UI: shadcn color picker

### Save Configuration

```typescript
async function savePlaceholderConfig(
  templateId: string,
  placeholderId: string,
  config: PlaceholderConfiguration
) {
  // Update template in Cosmos DB
  const template = await getTemplate(templateId);
  
  const placeholder = template.placeholders.find(p => p.id === placeholderId);
  if (!placeholder) throw new Error('Placeholder not found');
  
  placeholder.configuration = config;
  
  await updateTemplate(templateId, {
    placeholders: template.placeholders,
    updatedAt: new Date(),
    updatedBy: userId
  });
}
```

---

## Chart Generation & Insertion

### Chart Data Sources

#### From Shards

```typescript
async function getChartDataFromShards(
  config: ChartConfig,
  contextShardId?: string
) {
  if (config.dataSource.type !== 'shards') return null;
  
  // Load context template
  const contextTemplate = await getContextTemplate(config.contextTemplateId);
  
  // Get source Shard
  const sourceShard = await getShard(contextShardId);
  
  // Traverse relationships
  const relatedShards = await traverseRelationships(
    sourceShard,
    contextTemplate.relationships
  );
  
  // Extract data
  const data = extractDataFromShards(
    relatedShards,
    config.dataSource.shardType,
    config.dataSource.shardField
  );
  
  return data;
}
```

#### From Manual Input

```typescript
async function getChartDataFromManual(config: ChartConfig) {
  if (config.dataSource.type !== 'manual') return null;
  
  return config.dataSource.manualData;
}
```

#### From API

```typescript
async function getChartDataFromAPI(config: ChartConfig) {
  if (config.dataSource.type !== 'api') return null;
  
  const response = await fetch(config.dataSource.apiEndpoint, {
    headers: {
      'Authorization': `Bearer ${apiToken}`
    }
  });
  
  return response.json();
}
```

#### From AI

```typescript
async function getChartDataFromAI(config: ChartConfig) {
  if (config.dataSource.type !== 'ai') return null;
  
  const prompt = `Generate sample data for a ${config.chartType} chart:
X-axis: ${config.xAxis}
Y-axis: ${config.yAxis}
Description: ${config.description}

Return JSON array with labels and values.`;
  
  const response = await generateWithAI(prompt);
  return JSON.parse(response);
}
```

### Google Charts Rendering

```typescript
import { GoogleCharts } from 'google-charts';

async function renderChart(
  chartConfig: ChartConfig,
  data: ChartData,
  templateColors: string[]
): Promise<Buffer> {
  // Prepare data for Google Charts
  const chartData = prepareChartData(data, chartConfig);
  
  // Create chart URL
  const chartUrl = `https://chart.googleapis.com/chart?cht=${getChartType(chartConfig.chartType)}&chs=800x600&chd=t:${chartData.values}&chl=${chartData.labels}&chco=${templateColors.join('|')}`;
  
  // Download chart image
  const response = await fetch(chartUrl);
  const imageBuffer = await response.arrayBuffer();
  
  return Buffer.from(imageBuffer);
}
```

### Insert Chart into Slide

```typescript
async function insertChartIntoSlide(
  presentationId: string,
  slideId: string,
  elementId: string,
  chartImage: Buffer,
  originalShape: any
) {
  // Upload image to Drive
  const imageFile = await drive.files.create({
    requestBody: {
      name: `chart-${Date.now()}.png`,
      parents: [driveFolderId]
    },
    media: {
      mimeType: 'image/png',
      body: chartImage
    }
  });
  
  // Get image URL
  await drive.permissions.create({
    fileId: imageFile.data.id!,
    requestBody: {
      role: 'reader',
      type: 'anyone'
    }
  });
  
  const imageUrl = `https://drive.google.com/uc?export=view&id=${imageFile.data.id}`;
  
  // Replace placeholder with image
  const requests = [
    {
      deleteObject: {
        objectId: elementId
      }
    },
    {
      createImage: {
        objectId: `chart_${elementId}`,
        url: imageUrl,
        elementProperties: {
          pageObjectId: slideId,
          size: originalShape.size,  // Preserve original size
          transform: originalShape.transform  // Preserve position
        }
      }
    }
  ];
  
  await slides.presentations.batchUpdate({
    presentationId,
    requestBody: { requests }
  });
}
```

---

## Document Rewriting

### Rewriting Process

#### Step 1: Create Duplicate in User's Folder

```typescript
async function duplicatePresentation(
  sourcePresentationId: string,
  newName: string,
  destinationFolderId: string,
  userToken: string
): Promise<{ presentationId: string; url: string }> {
  // Use user's OAuth token (not service account)
  const auth = await getAuthFromUserToken(userToken);
  const drive = google.drive({ version: 'v3', auth });
  
  const copy = await drive.files.copy({
    fileId: sourcePresentationId,
    requestBody: {
      name: newName,
      parents: [destinationFolderId]  // Save to user's selected folder
    }
  });
  
  const presentationId = copy.data.id!;
  
  // Get document URL
  const file = await drive.files.get({
    fileId: presentationId,
    fields: 'webViewLink'
  });
  
  return {
    presentationId,
    url: file.data.webViewLink!
  };
}
```

#### Step 2: Replace Text Placeholders

```typescript
async function replacePlaceholders(
  presentationId: string,
  template: DocumentTemplate,
  generatedValues: Record<string, any>
) {
  const requests: any[] = [];
  
  for (const placeholder of template.placeholders) {
    const value = generatedValues[placeholder.id];
    if (!value) continue;
    
    for (const location of placeholder.locations) {
      if (location.documentFormat !== 'google_slides') continue;
      
      // Get element
      const slide = await getSlide(presentationId, location.pageNumber);
      const element = findElement(slide, location.elementId);
      
      if (element.shape?.text) {
        // Replace text
        const originalText = getElementText(element);
        const newText = originalText.replace(
          placeholder.rawPlaceholder,
          value
        );
        
        requests.push({
          deleteText: {
            objectId: location.elementId,
            textRange: {
              startIndex: location.position.startIndex,
              endIndex: location.position.endIndex
            }
          }
        });
        
        requests.push({
          insertText: {
            objectId: location.elementId,
            text: value,
            insertionIndex: location.position.startIndex
          }
        });
      }
    }
  }
  
  // Execute batch update
  if (requests.length > 0) {
    await slides.presentations.batchUpdate({
      presentationId,
      requestBody: { requests }
    });
  }
}
```

#### Step 3: Insert Charts

```typescript
async function insertCharts(
  presentationId: string,
  template: DocumentTemplate,
  generatedCharts: Record<string, Buffer>
) {
  for (const placeholder of template.placeholders) {
    if (placeholder.type !== 'chart') continue;
    
    const chartImage = generatedCharts[placeholder.id];
    if (!chartImage) continue;
    
    for (const location of placeholder.locations) {
      await insertChartIntoSlide(
        presentationId,
        location.pageNumber,
        location.elementId,
        chartImage,
        await getElement(presentationId, location.elementId)
      );
    }
  }
}
```

#### Step 4: Preserve Styles

Styles are automatically preserved when:
- Using `insertText` (preserves formatting)
- Using `createImage` with original size/transform
- Not modifying element properties

---

## Output Options

### Get Folder Path

```typescript
async function getFolderPath(
  folderId: string,
  userToken: string
): Promise<string> {
  const auth = await getAuthFromUserToken(userToken);
  const drive = google.drive({ version: 'v3', auth });
  
  // Get folder name and build path
  const folder = await drive.files.get({
    fileId: folderId,
    fields: 'name, parents'
  });
  
  // Recursively build path
  const path = await buildFolderPath(folderId, drive);
  return path;
}
```

### Set Sharing Permissions

```typescript
async function setSharing(
  presentationId: string,
  permissions: 'private' | 'view' | 'comment' | 'edit'
) {
  const roleMap = {
    'private': 'owner',
    'view': 'reader',
    'comment': 'commenter',
    'edit': 'writer'
  };
  
  await drive.permissions.create({
    fileId: presentationId,
    requestBody: {
      role: roleMap[permissions],
      type: 'anyone'
    }
  });
}
```

### Export as PDF/PPTX

```typescript
async function exportPresentation(
  presentationId: string,
  format: 'pdf' | 'pptx'
): Promise<Buffer> {
  const mimeType = format === 'pdf' 
    ? 'application/pdf' 
    : 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
  
  const response = await drive.files.export({
    fileId: presentationId,
    mimeType
  }, {
    responseType: 'arraybuffer'
  });
  
  return Buffer.from(response.data as ArrayBuffer);
}
```

---

## API Endpoints

### Extract from Google Slides

```http
POST /api/v1/content/templates/extract
Authorization: Bearer {token}
Content-Type: application/json

{
  "documentUrl": "https://docs.google.com/presentation/d/ABC123/edit",
  "documentFormat": "google_slides",
  "name": "Sales Pitch Template"
}
```

### Generate Document

```http
POST /api/v1/content/templates/{templateId}/generate
Authorization: Bearer {token}
Content-Type: application/json

{
  "destinationFolder": {
    "provider": "google_drive",
    "folderId": "drive-folder-id"
  },
  "contextShardId": "project-uuid",
  "options": {
    "skipPlaceholders": ["placeholder-uuid-1"],
    "overrideValues": {
      "company_name": "Manual Override"
    }
  }
}
```

**Response**:
```json
{
  "jobId": "job-uuid",
  "status": "completed",
  "generatedDocumentId": "document-uuid",
  "documentUrl": "https://docs.google.com/presentation/d/...",
  "folderPath": "/My Documents/Generated",
  "generatedAt": "2025-12-01T10:00:00Z"
}
```

**Note**: The generated document is saved to the user's selected Google Drive folder. The app does NOT store the file - only creates a c_document Shard record with metadata.

---

## Examples & Use Cases

### Example 1: Sales Pitch Deck

**Template**: Sales presentation with placeholders:
- `{{company_name}}` - Target company
- `{{product_name}}` - Product being sold
- `{{problem_statement: text|tone=marketing|min=50|max=200}}` - Problem description
- `{{revenue_chart: chart|type=bar|x=quarter|y=revenue}}` - Revenue chart

**Admin Workflow**:
1. Admin extracts placeholders from source document
2. Admin configures placeholder descriptions
3. Admin activates template

**User Workflow**:
1. User browses templates, selects "Sales Pitch Deck"
2. User selects destination folder: "/My Documents/Sales Pitches"
3. User links project context (optional)
4. User requests generation
5. System generates document, saves to user's folder
6. User receives notification with document link
7. User accesses document in Google Drive
8. c_document Shard record created (metadata only, file not stored)

### Example 2: Quarterly Business Review

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
