# Universal Intermediate Format (UIF) Specification

## Overview

The Universal Intermediate Format (UIF) is a platform-independent JSON representation of generated content. It describes structure, layout, elements, themes, and animations in a way that can be rendered to multiple output formats (HTML, PowerPoint, PDF, Google Slides, Markdown).

> **Design Principle**: "Describe once, render anywhere—UIF is the bridge between AI generation and final deliverables."

---

## Table of Contents

1. [UIF Root Structure](#uif-root-structure)
2. [Document Types](#document-types)
3. [Theme Configuration](#theme-configuration)
4. [Page Structure](#page-structure)
5. [Layout System](#layout-system)
6. [Elements](#elements)
7. [Positioning & Sizing](#positioning--sizing)
8. [Animations & Transitions](#animations--transitions)
9. [Charts](#charts)
10. [Tables](#tables)
11. [Validation](#validation)
12. [Examples](#examples)

---

## UIF Root Structure

```typescript
interface UniversalIntermediateFormat {
  // === METADATA ===
  version: "1.0";                        // UIF version
  documentType: DocumentType;            // presentation, document, webpage
  title: string;                         // Document title
  description?: string;                  // Document description
  language?: string;                     // Content language (e.g., "en")
  author?: string;                       // Author name
  createdAt?: string;                    // ISO 8601 timestamp
  
  // === THEME ===
  theme: Theme;                          // Visual styling
  
  // === CONTENT ===
  pages: Page[];                         // Array of pages/slides
  
  // === METADATA ===
  metadata?: {
    sourceTemplateId?: string;           // Template used
    generationModel?: string;            // AI model used
    tokensUsed?: number;
    customData?: Record<string, any>;    // Custom metadata
  };
}

type DocumentType = "presentation" | "document" | "webpage";
```

### JSON Schema (Root)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://castiel.app/schemas/uif.json",
  "title": "Universal Intermediate Format",
  "type": "object",
  "required": ["version", "documentType", "title", "theme", "pages"],
  "properties": {
    "version": {
      "type": "string",
      "const": "1.0"
    },
    "documentType": {
      "type": "string",
      "enum": ["presentation", "document", "webpage"]
    },
    "title": {
      "type": "string",
      "minLength": 1,
      "maxLength": 500
    },
    "description": {
      "type": "string",
      "maxLength": 2000
    },
    "language": {
      "type": "string",
      "pattern": "^[a-z]{2}(-[A-Z]{2})?$"
    },
    "author": {
      "type": "string"
    },
    "createdAt": {
      "type": "string",
      "format": "date-time"
    },
    "theme": {
      "$ref": "#/definitions/Theme"
    },
    "pages": {
      "type": "array",
      "items": { "$ref": "#/definitions/Page" },
      "minItems": 1
    },
    "metadata": {
      "type": "object"
    }
  }
}
```

---

## Document Types

### Presentation

For slide decks (PowerPoint, Google Slides, HTML slides).

```json
{
  "documentType": "presentation",
  "pages": [
    { "pageNumber": 1, "layout": "title-slide", "elements": [...] },
    { "pageNumber": 2, "layout": "two-column", "elements": [...] }
  ]
}
```

**Characteristics**:
- Fixed aspect ratio (16:9 or 4:3)
- Page-by-page navigation
- Supports animations and transitions
- Optimized for visual impact

### Document

For text-heavy documents (PDF, Word-like).

```json
{
  "documentType": "document",
  "pages": [
    { "pageNumber": 1, "layout": "document-page", "elements": [...] }
  ]
}
```

**Characteristics**:
- A4/Letter page size
- Flowing text layout
- Headers, footers, page numbers
- Print-optimized

### Webpage

For web-based content (HTML landing pages).

```json
{
  "documentType": "webpage",
  "pages": [
    { "pageNumber": 1, "layout": "landing-hero", "elements": [...] },
    { "pageNumber": 2, "layout": "features-grid", "elements": [...] }
  ]
}
```

**Characteristics**:
- Responsive design
- Scrolling sections
- Interactive elements
- Web-optimized

---

## Theme Configuration

```typescript
interface Theme {
  // === COLORS ===
  primaryColor: string;                  // Main brand color
  secondaryColor: string;                // Accent color
  backgroundColor: string;               // Default background
  textColor: string;                     // Default text color
  accentColors?: string[];               // Additional colors
  
  // === TYPOGRAPHY ===
  fontFamily: string;                    // Primary font
  fontFamilyHeading?: string;            // Heading font (defaults to fontFamily)
  fontSize: FontSizeConfig;
  fontWeight?: FontWeightConfig;
  lineHeight?: number;                   // Default line height (1.5)
  
  // === SPACING ===
  spacing?: SpacingConfig;
  
  // === BORDERS & SHADOWS ===
  borderRadius?: string;                 // Default border radius
  boxShadow?: string;                    // Default box shadow
  
  // === CUSTOM CSS (for HTML renderer) ===
  customCSS?: string;
}

interface FontSizeConfig {
  title: number;                         // Title text (32-48)
  heading: number;                       // Section headings (24-32)
  subheading: number;                    // Subheadings (18-24)
  body: number;                          // Body text (14-18)
  caption: number;                       // Captions, footnotes (10-14)
}

interface FontWeightConfig {
  title: number;                         // 700 (bold)
  heading: number;                       // 600 (semi-bold)
  body: number;                          // 400 (normal)
}

interface SpacingConfig {
  pageMargin: string;                    // "5%" or "40px"
  elementGap: string;                    // Gap between elements
  sectionGap: string;                    // Gap between sections
}
```

### Theme Example

```json
{
  "theme": {
    "primaryColor": "#0066FF",
    "secondaryColor": "#00AACC",
    "backgroundColor": "#FFFFFF",
    "textColor": "#1A1A1A",
    "accentColors": ["#FF6B35", "#7B2CBF", "#2EC4B6"],
    
    "fontFamily": "Inter, sans-serif",
    "fontFamilyHeading": "Poppins, sans-serif",
    "fontSize": {
      "title": 48,
      "heading": 32,
      "subheading": 24,
      "body": 16,
      "caption": 12
    },
    "fontWeight": {
      "title": 700,
      "heading": 600,
      "body": 400
    },
    "lineHeight": 1.6,
    
    "spacing": {
      "pageMargin": "5%",
      "elementGap": "2%",
      "sectionGap": "5%"
    },
    
    "borderRadius": "8px",
    "boxShadow": "0 4px 6px rgba(0, 0, 0, 0.1)"
  }
}
```

### Preset Themes

System provides preset themes:

| Theme | Primary | Style | Use Case |
|-------|---------|-------|----------|
| `professional` | #0066FF | Clean, corporate | Business presentations |
| `modern` | #7B2CBF | Bold, contemporary | Tech startups |
| `minimal` | #1A1A1A | Monochrome | Reports |
| `vibrant` | #FF6B35 | Colorful | Marketing |
| `elegant` | #2D3436 | Sophisticated | Executive briefings |

---

## Page Structure

```typescript
interface Page {
  // === IDENTITY ===
  pageNumber: number;                    // 1-based page number
  id?: string;                           // Optional page ID for references
  title?: string;                        // Page title (for navigation)
  
  // === LAYOUT ===
  layout: LayoutType | CustomLayout;
  
  // === CONTENT ===
  elements: Element[];
  
  // === BACKGROUND ===
  background?: BackgroundConfig;
  
  // === TRANSITION (presentation only) ===
  transition?: TransitionConfig;
  
  // === NOTES ===
  notes?: string;                        // Speaker notes
}

type LayoutType = 
  // Presentation layouts
  | "title-slide"
  | "title-and-body"
  | "two-column"
  | "three-column"
  | "image-left"
  | "image-right"
  | "full-image"
  | "comparison"
  | "quote"
  | "section-header"
  | "blank"
  // Document layouts
  | "document-page"
  | "cover-page"
  // Webpage layouts
  | "landing-hero"
  | "features-grid"
  | "cta-section"
  | "custom";

interface CustomLayout {
  type: "custom";
  grid?: GridConfig;
  regions?: Region[];
}

interface GridConfig {
  columns: number;
  rows: number;
  gap: string;
}

interface Region {
  id: string;
  gridArea: string;                      // CSS grid-area
}

interface BackgroundConfig {
  type: "solid" | "gradient" | "image";
  color?: string;
  gradient?: {
    type: "linear" | "radial";
    angle?: number;
    colors: { color: string; position: string }[];
  };
  image?: {
    url: string;
    fit: "cover" | "contain" | "fill";
    opacity?: number;
  };
}
```

### Page Example

```json
{
  "pageNumber": 1,
  "id": "intro-slide",
  "title": "Introduction",
  "layout": "title-slide",
  "background": {
    "type": "gradient",
    "gradient": {
      "type": "linear",
      "angle": 135,
      "colors": [
        { "color": "#0066FF", "position": "0%" },
        { "color": "#00AACC", "position": "100%" }
      ]
    }
  },
  "transition": {
    "type": "fade",
    "duration": 500
  },
  "elements": [
    {
      "type": "text",
      "value": "Enterprise Security Solution",
      "style": { "fontSize": 48, "fontWeight": 700, "color": "#FFFFFF" },
      "position": { "x": "10%", "y": "40%" },
      "size": { "width": "80%", "height": "auto" }
    }
  ],
  "notes": "Welcome the audience and introduce the topic."
}
```

---

## Layout System

### Predefined Layouts

#### Title Slide
```
┌─────────────────────────────────────┐
│                                     │
│                                     │
│           [TITLE TEXT]              │
│           [SUBTITLE]                │
│                                     │
│                                     │
└─────────────────────────────────────┘
```

#### Title and Body
```
┌─────────────────────────────────────┐
│ [TITLE]                             │
├─────────────────────────────────────┤
│                                     │
│ • Bullet point 1                    │
│ • Bullet point 2                    │
│ • Bullet point 3                    │
│                                     │
└─────────────────────────────────────┘
```

#### Two Column
```
┌─────────────────────────────────────┐
│ [TITLE]                             │
├─────────────────┬───────────────────┤
│                 │                   │
│  [LEFT COLUMN]  │  [RIGHT COLUMN]   │
│                 │                   │
│                 │                   │
└─────────────────┴───────────────────┘
```

#### Image Left
```
┌─────────────────────────────────────┐
│ [TITLE]                             │
├─────────────────┬───────────────────┤
│                 │                   │
│    [IMAGE]      │    [TEXT/BULLETS] │
│                 │                   │
│                 │                   │
└─────────────────┴───────────────────┘
```

#### Comparison
```
┌─────────────────────────────────────┐
│ [TITLE]                             │
├─────────────────┬───────────────────┤
│   [OPTION A]    │    [OPTION B]     │
├─────────────────┼───────────────────┤
│   • Feature 1   │    • Feature 1    │
│   • Feature 2   │    • Feature 2    │
│   • Feature 3   │    • Feature 3    │
└─────────────────┴───────────────────┘
```

### Custom Layouts

For complex layouts, use custom grid:

```json
{
  "layout": {
    "type": "custom",
    "grid": {
      "columns": 3,
      "rows": 3,
      "gap": "2%"
    },
    "regions": [
      { "id": "header", "gridArea": "1 / 1 / 2 / 4" },
      { "id": "left", "gridArea": "2 / 1 / 4 / 2" },
      { "id": "right-top", "gridArea": "2 / 2 / 3 / 4" },
      { "id": "right-bottom", "gridArea": "3 / 2 / 4 / 4" }
    ]
  }
}
```

---

## Elements

### Element Base

```typescript
interface BaseElement {
  type: ElementType;
  id?: string;                           // Optional ID for references
  position: Position;
  size: Size;
  style?: ElementStyle;
  animation?: AnimationConfig;
  layer?: number;                        // Z-index (default: 0)
  visible?: boolean;                     // Default: true
  locked?: boolean;                      // Prevent editing
  regionId?: string;                     // For custom layouts
}

type ElementType = "text" | "image" | "chart" | "table" | "shape" | "video" | "embed";
```

### Text Element

```typescript
interface TextElement extends BaseElement {
  type: "text";
  value: string;                         // Text content (supports markdown)
  format?: "plain" | "markdown" | "html";
  style?: TextStyle;
}

interface TextStyle extends ElementStyle {
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: number | "normal" | "bold";
  fontStyle?: "normal" | "italic";
  color?: string;
  textAlign?: "left" | "center" | "right" | "justify";
  verticalAlign?: "top" | "middle" | "bottom";
  textDecoration?: "none" | "underline" | "line-through";
  letterSpacing?: number;
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  listStyle?: "none" | "disc" | "decimal" | "alpha";
}
```

**Example**:
```json
{
  "type": "text",
  "value": "## Key Benefits\n\n- 50% cost reduction\n- 99.9% uptime\n- Enterprise support",
  "format": "markdown",
  "position": { "x": "55%", "y": "20%" },
  "size": { "width": "40%", "height": "auto" },
  "style": {
    "fontSize": 18,
    "color": "#333333",
    "textAlign": "left",
    "listStyle": "disc"
  },
  "animation": {
    "type": "fadeIn",
    "delay": 500,
    "duration": 400
  }
}
```

### Image Element

```typescript
interface ImageElement extends BaseElement {
  type: "image";
  source: string;                        // URL or base64
  alt: string;                           // Alt text
  fit?: "cover" | "contain" | "fill" | "none";
  borderRadius?: string;
  border?: BorderConfig;
  shadow?: ShadowConfig;
  filter?: ImageFilter;
}

interface ImageFilter {
  brightness?: number;                   // 0-200 (100 = normal)
  contrast?: number;
  saturation?: number;
  blur?: number;                         // px
  grayscale?: boolean;
}
```

**Example**:
```json
{
  "type": "image",
  "source": "https://blob.azure.com/.../dashboard.png",
  "alt": "Product Dashboard",
  "position": { "x": "5%", "y": "20%" },
  "size": { "width": "45%", "height": "auto" },
  "fit": "contain",
  "borderRadius": "8px",
  "shadow": {
    "offsetX": 0,
    "offsetY": 4,
    "blur": 12,
    "color": "rgba(0,0,0,0.15)"
  },
  "animation": {
    "type": "slideInLeft",
    "delay": 200
  }
}
```

### Shape Element

```typescript
interface ShapeElement extends BaseElement {
  type: "shape";
  shapeType: ShapeType;
  fill?: FillConfig;
  stroke?: StrokeConfig;
  text?: string;                         // Text inside shape
  textStyle?: TextStyle;
}

type ShapeType = 
  | "rectangle"
  | "rounded-rectangle"
  | "circle"
  | "ellipse"
  | "triangle"
  | "arrow"
  | "line"
  | "icon";

interface FillConfig {
  type: "solid" | "gradient" | "none";
  color?: string;
  gradient?: GradientConfig;
}

interface StrokeConfig {
  color: string;
  width: number;
  style: "solid" | "dashed" | "dotted";
}
```

**Example**:
```json
{
  "type": "shape",
  "shapeType": "rounded-rectangle",
  "position": { "x": "10%", "y": "70%" },
  "size": { "width": "30%", "height": "15%" },
  "fill": {
    "type": "solid",
    "color": "#0066FF"
  },
  "stroke": {
    "color": "#004499",
    "width": 2,
    "style": "solid"
  },
  "text": "Get Started",
  "textStyle": {
    "color": "#FFFFFF",
    "fontSize": 20,
    "fontWeight": "bold",
    "textAlign": "center"
  }
}
```

---

## Positioning & Sizing

### Position (Relative - Recommended)

```typescript
interface Position {
  x: string | number;                    // "10%" or 100 (pixels)
  y: string | number;
  anchor?: AnchorPoint;                  // Reference point
}

type AnchorPoint = 
  | "top-left"      // Default
  | "top-center"
  | "top-right"
  | "center-left"
  | "center"
  | "center-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";
```

**Relative positioning is strongly recommended** for cross-format compatibility:

```json
{
  "position": { "x": "10%", "y": "20%" }
}
```

### Size

```typescript
interface Size {
  width: string | number | "auto";
  height: string | number | "auto";
  minWidth?: string | number;
  maxWidth?: string | number;
  minHeight?: string | number;
  maxHeight?: string | number;
  aspectRatio?: string;                  // "16:9", "4:3", "1:1"
}
```

**Example**:
```json
{
  "size": {
    "width": "40%",
    "height": "auto",
    "maxHeight": "60%",
    "aspectRatio": "16:9"
  }
}
```

---

## Animations & Transitions

### Element Animations

```typescript
interface AnimationConfig {
  type: AnimationType;
  delay?: number;                        // ms before animation starts
  duration?: number;                     // ms animation length (default: 400)
  easing?: EasingFunction;               // Default: "ease-out"
  trigger?: "onLoad" | "onClick" | "onHover";
}

type AnimationType = 
  // Fade
  | "fadeIn"
  | "fadeOut"
  // Slide
  | "slideInLeft"
  | "slideInRight"
  | "slideInTop"
  | "slideInBottom"
  // Zoom
  | "zoomIn"
  | "zoomOut"
  // Bounce
  | "bounceIn"
  // Special
  | "typewriter"                         // For text
  | "draw"                               // For shapes/lines
  | "countUp"                            // For numbers
  | "none";

type EasingFunction = 
  | "linear"
  | "ease"
  | "ease-in"
  | "ease-out"
  | "ease-in-out"
  | "spring";
```

**Example**:
```json
{
  "animation": {
    "type": "slideInLeft",
    "delay": 200,
    "duration": 500,
    "easing": "ease-out"
  }
}
```

### Page Transitions

```typescript
interface TransitionConfig {
  type: TransitionType;
  duration?: number;                     // ms (default: 500)
  direction?: "left" | "right" | "up" | "down";
}

type TransitionType = 
  | "none"
  | "fade"
  | "slide"
  | "push"
  | "reveal"
  | "zoom"
  | "flip";
```

**Example**:
```json
{
  "transition": {
    "type": "slide",
    "direction": "left",
    "duration": 400
  }
}
```

---

## Charts

```typescript
interface ChartElement extends BaseElement {
  type: "chart";
  chartType: ChartType;
  data: ChartData;
  options?: ChartOptions;
}

type ChartType = 
  | "bar"
  | "horizontalBar"
  | "line"
  | "area"
  | "pie"
  | "doughnut"
  | "radar"
  | "scatter"
  | "bubble";

interface ChartData {
  labels: string[];
  datasets: Dataset[];
}

interface Dataset {
  label: string;
  values: number[];
  color?: string;                        // Series color
  borderColor?: string;
  backgroundColor?: string;
}

interface ChartOptions {
  title?: string;
  showLegend?: boolean;
  legendPosition?: "top" | "bottom" | "left" | "right";
  showGridLines?: boolean;
  showValues?: boolean;                  // Show values on chart
  valueFormat?: string;                  // e.g., "$#,###" or "#%"
  animation?: boolean;
  stacked?: boolean;                     // For bar/area charts
  tension?: number;                      // Line smoothing (0-1)
}
```

### Chart Example

```json
{
  "type": "chart",
  "chartType": "bar",
  "position": { "x": "5%", "y": "25%" },
  "size": { "width": "90%", "height": "60%" },
  "data": {
    "labels": ["Q1", "Q2", "Q3", "Q4"],
    "datasets": [
      {
        "label": "Revenue",
        "values": [150000, 200000, 180000, 250000],
        "color": "#0066FF"
      },
      {
        "label": "Costs",
        "values": [80000, 90000, 85000, 95000],
        "color": "#FF6B35"
      }
    ]
  },
  "options": {
    "title": "Quarterly Performance",
    "showLegend": true,
    "legendPosition": "bottom",
    "showValues": true,
    "valueFormat": "$#,###",
    "animation": true
  }
}
```

---

## Tables

```typescript
interface TableElement extends BaseElement {
  type: "table";
  headers?: TableCell[];
  rows: TableRow[];
  options?: TableOptions;
}

interface TableRow {
  cells: TableCell[];
  style?: RowStyle;
}

interface TableCell {
  value: string;
  colspan?: number;
  rowspan?: number;
  style?: CellStyle;
}

interface TableOptions {
  headerStyle?: CellStyle;
  alternateRowColors?: boolean;
  alternateRowColor?: string;
  borderColor?: string;
  borderWidth?: number;
  cellPadding?: string;
}

interface CellStyle {
  backgroundColor?: string;
  color?: string;
  fontSize?: number;
  fontWeight?: number;
  textAlign?: "left" | "center" | "right";
  verticalAlign?: "top" | "middle" | "bottom";
}
```

### Table Example

```json
{
  "type": "table",
  "position": { "x": "10%", "y": "30%" },
  "size": { "width": "80%", "height": "auto" },
  "headers": [
    { "value": "Feature", "style": { "fontWeight": 700 } },
    { "value": "Basic", "style": { "fontWeight": 700 } },
    { "value": "Pro", "style": { "fontWeight": 700 } },
    { "value": "Enterprise", "style": { "fontWeight": 700 } }
  ],
  "rows": [
    {
      "cells": [
        { "value": "Users" },
        { "value": "5" },
        { "value": "50" },
        { "value": "Unlimited" }
      ]
    },
    {
      "cells": [
        { "value": "Storage" },
        { "value": "10 GB" },
        { "value": "100 GB" },
        { "value": "1 TB" }
      ]
    },
    {
      "cells": [
        { "value": "Support" },
        { "value": "Email" },
        { "value": "Priority" },
        { "value": "Dedicated" }
      ]
    }
  ],
  "options": {
    "alternateRowColors": true,
    "alternateRowColor": "#F5F5F5",
    "borderColor": "#E0E0E0",
    "cellPadding": "12px"
  }
}
```

---

## Validation

### UIF Validator

```typescript
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  path: string;                          // JSON path to error
  code: string;                          // Error code
  message: string;                       // Human-readable message
}

interface ValidationWarning {
  path: string;
  code: string;
  message: string;
  suggestion?: string;
}

// Validation rules
const VALIDATION_RULES = {
  // Structure
  MAX_PAGES: 50,
  MAX_ELEMENTS_PER_PAGE: 100,
  
  // Content
  MAX_TEXT_LENGTH: 10000,
  MAX_IMAGE_SIZE_MB: 10,
  
  // Positioning
  POSITION_MIN: "0%",
  POSITION_MAX: "100%",
  
  // Animation
  MAX_ANIMATION_DURATION: 5000,
  MAX_TRANSITION_DURATION: 2000
};
```

---

## Examples

### Complete Presentation UIF

```json
{
  "version": "1.0",
  "documentType": "presentation",
  "title": "Acme Corp Security Solution",
  "description": "Sales presentation for enterprise security",
  "language": "en",
  "author": "Sales Team",
  "createdAt": "2025-11-30T10:00:00Z",
  
  "theme": {
    "primaryColor": "#0066FF",
    "secondaryColor": "#00AACC",
    "backgroundColor": "#FFFFFF",
    "textColor": "#1A1A1A",
    "fontFamily": "Inter, sans-serif",
    "fontFamilyHeading": "Poppins, sans-serif",
    "fontSize": {
      "title": 48,
      "heading": 32,
      "subheading": 24,
      "body": 16,
      "caption": 12
    },
    "spacing": {
      "pageMargin": "5%",
      "elementGap": "2%"
    },
    "borderRadius": "8px"
  },
  
  "pages": [
    {
      "pageNumber": 1,
      "title": "Title",
      "layout": "title-slide",
      "background": {
        "type": "gradient",
        "gradient": {
          "type": "linear",
          "angle": 135,
          "colors": [
            { "color": "#0066FF", "position": "0%" },
            { "color": "#00AACC", "position": "100%" }
          ]
        }
      },
      "transition": { "type": "fade", "duration": 500 },
      "elements": [
        {
          "type": "text",
          "value": "Enterprise Security Solution",
          "position": { "x": "10%", "y": "35%" },
          "size": { "width": "80%", "height": "auto" },
          "style": {
            "fontSize": 56,
            "fontWeight": 700,
            "color": "#FFFFFF",
            "textAlign": "center"
          },
          "animation": { "type": "fadeIn", "delay": 200 }
        },
        {
          "type": "text",
          "value": "Protecting Your Digital Assets",
          "position": { "x": "10%", "y": "55%" },
          "size": { "width": "80%", "height": "auto" },
          "style": {
            "fontSize": 24,
            "color": "rgba(255,255,255,0.9)",
            "textAlign": "center"
          },
          "animation": { "type": "fadeIn", "delay": 600 }
        }
      ],
      "notes": "Welcome everyone. Today we'll discuss our enterprise security solution."
    },
    {
      "pageNumber": 2,
      "title": "The Problem",
      "layout": "image-left",
      "transition": { "type": "slide", "direction": "left" },
      "elements": [
        {
          "type": "text",
          "value": "The Growing Threat Landscape",
          "position": { "x": "5%", "y": "5%" },
          "size": { "width": "90%", "height": "auto" },
          "style": { "fontSize": 36, "fontWeight": 700 }
        },
        {
          "type": "image",
          "source": "https://blob.azure.com/.../threat-map.png",
          "alt": "Cyber threat map",
          "position": { "x": "5%", "y": "20%" },
          "size": { "width": "45%", "height": "auto" },
          "fit": "contain",
          "animation": { "type": "slideInLeft", "delay": 200 }
        },
        {
          "type": "text",
          "value": "## Key Statistics\n\n- **43%** of attacks target small businesses\n- **$4.24M** average cost of a data breach\n- **287 days** average time to identify a breach\n- **60%** of companies go out of business within 6 months",
          "format": "markdown",
          "position": { "x": "55%", "y": "20%" },
          "size": { "width": "40%", "height": "auto" },
          "style": { "fontSize": 18, "lineHeight": 1.8 },
          "animation": { "type": "fadeIn", "delay": 500 }
        }
      ]
    },
    {
      "pageNumber": 3,
      "title": "Revenue Growth",
      "layout": "title-and-body",
      "elements": [
        {
          "type": "text",
          "value": "Projected Revenue Growth",
          "position": { "x": "5%", "y": "5%" },
          "size": { "width": "90%", "height": "auto" },
          "style": { "fontSize": 36, "fontWeight": 700 }
        },
        {
          "type": "chart",
          "chartType": "bar",
          "position": { "x": "5%", "y": "18%" },
          "size": { "width": "90%", "height": "70%" },
          "data": {
            "labels": ["Q1 2025", "Q2 2025", "Q3 2025", "Q4 2025"],
            "datasets": [
              {
                "label": "Revenue ($K)",
                "values": [150, 200, 250, 320],
                "color": "#0066FF"
              }
            ]
          },
          "options": {
            "showLegend": false,
            "showValues": true,
            "valueFormat": "$#K",
            "animation": true
          }
        }
      ]
    }
  ],
  
  "metadata": {
    "sourceTemplateId": "template-sales-pitch",
    "generationModel": "gpt-4",
    "tokensUsed": 4500
  }
}
```

---

## Related Documentation

- [Content Generation README](./README.md)
- [Renderers](./RENDERERS.md)
- [c_contentTemplate](../shards/core-types/c_contentTemplate.md)

---

**Last Updated**: November 2025  
**Version**: 1.0.0  
**Maintainer**: Castiel Development Team

