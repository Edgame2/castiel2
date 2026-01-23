# TipTap WYSIWYG Editor

## Overview

The TipTap WYSIWYG Editor is a shared rich text editing component based on [TipTap](https://tiptap.dev/), used across the Castiel application for email templates, notifications, documents, and other rich text input fields. It provides advanced editing capabilities with optional email-safe HTML generation mode.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Core Features](#core-features)
3. [Email Mode](#email-mode)
4. [Placeholder Support](#placeholder-support)
5. [Editor Configuration](#editor-configuration)
6. [Usage Examples](#usage-examples)
7. [Custom Extensions](#custom-extensions)
8. [Component API](#component-api)

---

## Architecture

### Component Structure

```
apps/web/src/components/editor/
├── tiptap-editor.tsx          # Main editor component
├── tiptap-toolbar.tsx         # Toolbar component
├── tiptap-extensions.ts       # Extension configurations
├── placeholder-autocomplete.tsx # Placeholder autocomplete
└── email-preview.tsx          # Email preview component
```

### Shared Configuration

The editor uses shared configuration and extensions that can be customized per use case:

```typescript
// tiptap-extensions.ts
export function getDefaultExtensions(mode: 'default' | 'email' | 'plain') {
  const baseExtensions = [
    StarterKit,
    Placeholder,
    Link,
    Image
  ];

  if (mode === 'email') {
    return [
      ...baseExtensions,
      EmailModeExtension,
      PlaceholderExtension
    ];
  }

  return baseExtensions;
}
```

---

## Core Features

### Basic Formatting

- **Bold** (`**text**` or Ctrl+B)
- **Italic** (`*text*` or Ctrl+I)
- **Underline** (Ctrl+U)
- **Strikethrough** (`~~text~~`)

### Headings

Support for H1-H6 headings:

```html
# Heading 1
## Heading 2
### Heading 3
```

### Lists

- Ordered lists (numbered)
- Unordered lists (bullets)
- Nested lists
- Task lists (checkboxes)

### Links

Insert and edit links with URL validation:

```typescript
// Insert link
editor.chain().focus().setLink({ href: 'https://example.com' }).run();

// Edit link
editor.chain().focus().extendMarkRange('link').setLink({ href: newUrl }).run();
```

### Rich Formatting

#### Tables

Insert, edit, and delete table rows and columns:

```typescript
// Insert table
editor.chain().focus().insertTable({ rows: 3, cols: 3 }).run();

// Add row
editor.chain().focus().addRowAfter().run();

// Delete column
editor.chain().focus().deleteColumn().run();
```

#### Images

Upload, resize, and add alt text to images:

```typescript
// Insert image
editor.chain().focus().setImage({ src: imageUrl, alt: 'Description' }).run();
```

#### Code Blocks

Syntax-highlighted code blocks:

```typescript
// Insert code block
editor.chain().focus().toggleCodeBlock().run();
```

#### Blockquotes

Quote blocks for emphasis:

```typescript
editor.chain().focus().toggleBlockquote().run();
```

#### Horizontal Rules

Divider lines:

```typescript
editor.chain().focus().setHorizontalRule().run();
```

### Advanced Features (Future)

- **Collaboration**: Real-time collaborative editing
- **Comments**: Add comments to content
- **Mentions**: @mention users or entities
- **Custom Extensions**: Extend with custom functionality

---

## Email Mode

### Overview

Email mode generates email-safe HTML with inline styles and table-based layouts for maximum email client compatibility.

### When Enabled

When `mode="email"` is set:

- Generates email-safe HTML (inline styles, table-based layouts)
- Responsive preview for mobile/desktop
- Email client compatibility warnings
- Inline style support (required for email)
- Limited to email-safe HTML elements

### Email-Safe HTML Generation

```typescript
// Email mode extension
const EmailModeExtension = Extension.create({
  name: 'emailMode',
  
  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading'],
        attributes: {
          style: {
            default: null,
            parseHTML: element => element.getAttribute('style'),
            renderHTML: attributes => {
              if (!attributes.style) return {};
              return { style: attributes.style };
            }
          }
        }
      }
    ];
  }
});
```

### Responsive Preview

Email preview shows how the email will appear in different email clients:

```typescript
<EmailPreview
  html={renderedHtml}
  mode="desktop" // or "mobile"
/>
```

### Email Client Compatibility

Warnings for unsupported features:

```typescript
// Check for unsupported features
const warnings = checkEmailCompatibility(html);
// Returns: ["CSS Grid not supported in Outlook", ...]
```

---

## Placeholder Support

### Autocomplete

Placeholder autocomplete triggers when typing `{{`:

```typescript
// Placeholder autocomplete extension
const PlaceholderAutocomplete = Extension.create({
  name: 'placeholderAutocomplete',
  
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('placeholderAutocomplete'),
        props: {
          handleTextInput: (view, from, to, text) => {
            if (text === '{{') {
              // Show autocomplete dropdown
              showPlaceholderAutocomplete(view, from);
            }
          }
        }
      })
    ];
  }
});
```

### Insert Button

Toolbar button to insert placeholders:

```typescript
<ToolbarButton
  icon="placeholder"
  onClick={() => {
    const placeholder = selectedPlaceholder;
    editor.chain().focus().insertContent(`{{${placeholder}}}`).run();
  }}
/>
```

### Placeholder Helper

Sidebar or dropdown showing available placeholders:

```typescript
<PlaceholderHelper
  placeholders={template.placeholders}
  onInsert={(placeholder) => {
    editor.chain().focus().insertContent(`{{${placeholder}}}`).run();
  }}
/>
```

### Visual Indicators

Placeholders shown as badges/tags in editor:

```typescript
// Placeholder extension renders placeholders as badges
const PlaceholderExtension = Node.create({
  name: 'placeholder',
  
  renderHTML({ node }) {
    return [
      'span',
      {
        class: 'placeholder-badge',
        'data-placeholder': node.attrs.name
      },
      `{{${node.attrs.name}}}`
    ];
  }
});
```

### Validation

Warns if placeholder is not defined in template:

```typescript
// Validate placeholders in content
const placeholders = extractPlaceholders(editor.getHTML());
const undefined = placeholders.filter(p => !definedPlaceholders.includes(p));

if (undefined.length > 0) {
  showWarning(`Undefined placeholders: ${undefined.join(', ')}`);
}
```

---

## Editor Configuration

### Extensible Extension System

Add or remove extensions based on use case:

```typescript
<TipTapEditor
  extensions={[
    StarterKit,
    Link,
    Image,
    CustomExtension
  ]}
/>
```

### Custom Toolbar Configuration

Configure which toolbar buttons to show:

```typescript
<TipTapEditor
  toolbar={[
    'bold', 'italic', 'underline',
    'heading', 'bulletList', 'orderedList',
    'link', 'image', 'placeholder'
  ]}
/>
```

### Theme Support

Light and dark mode support:

```typescript
<TipTapEditor
  theme="dark" // or "light"
/>
```

### Accessibility Features

- Keyboard navigation
- Screen reader support
- ARIA labels
- Focus management

---

## Usage Examples

### Email Template Subject Field

```typescript
<TipTapEditor
  content={template.subject}
  onChange={(content) => setSubject(content)}
  mode="default"
  placeholder="Enter email subject..."
  placeholderDefinitions={template.placeholders}
  onPlaceholderInsert={(placeholder) => {
    insertPlaceholder(placeholder);
  }}
  showToolbar={true}
/>
```

### Email Template HTML Body

```typescript
<TipTapEditor
  content={template.htmlBody}
  onChange={(content) => setHtmlBody(content)}
  mode="email"  // Email mode enabled
  placeholder="Enter HTML content..."
  placeholderDefinitions={template.placeholders}
  onPlaceholderInsert={(placeholder) => {
    insertPlaceholder(placeholder);
  }}
  showToolbar={true}
/>
```

### Email Template Text Body

```typescript
<TipTapEditor
  content={template.textBody}
  onChange={(content) => setTextBody(content)}
  mode="plain"  // Plain text mode
  placeholder="Enter plain text content..."
  placeholderDefinitions={template.placeholders}
  showToolbar={false}  // Minimal toolbar for plain text
/>
```

### Notification Content

```typescript
<TipTapEditor
  content={notification.content}
  onChange={(content) => setContent(content)}
  mode="default"
  placeholder="Enter notification content..."
  showToolbar={true}
/>
```

### Document Content

```typescript
<TipTapEditor
  content={document.content}
  onChange={(content) => setContent(content)}
  mode="default"
  extensions={[
    StarterKit,
    Table,
    Image,
    CodeBlock
  ]}
  showToolbar={true}
/>
```

---

## Custom Extensions

### PlaceholderExtension

Handles `{{placeholder}}` syntax:

```typescript
const PlaceholderExtension = Node.create({
  name: 'placeholder',
  group: 'inline',
  inline: true,
  atom: true,
  
  addAttributes() {
    return {
      name: {
        default: null
      }
    };
  },
  
  parseHTML() {
    return [
      {
        tag: 'span[data-type="placeholder"]',
        getAttrs: (node) => ({
          name: node.getAttribute('data-name')
        })
      }
    ];
  },
  
  renderHTML({ node }) {
    return [
      'span',
      {
        'data-type': 'placeholder',
        'data-name': node.attrs.name,
        class: 'placeholder-badge'
      },
      `{{${node.attrs.name}}}`
    ];
  }
});
```

### EmailModeExtension

Email-safe HTML generation:

```typescript
const EmailModeExtension = Extension.create({
  name: 'emailMode',
  
  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading', 'listItem'],
        attributes: {
          style: {
            default: null,
            parseHTML: element => element.getAttribute('style'),
            renderHTML: attributes => {
              if (!attributes.style) return {};
              return { style: attributes.style };
            }
          }
        }
      }
    ];
  },
  
  addCommands() {
    return {
      setInlineStyle: (style: string) => ({ commands }) => {
        return commands.updateAttributes('paragraph', { style });
      }
    };
  }
});
```

### PlaceholderAutocomplete

Autocomplete for placeholders:

```typescript
const PlaceholderAutocomplete = Extension.create({
  name: 'placeholderAutocomplete',
  
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('placeholderAutocomplete'),
        props: {
          handleTextInput: (view, from, to, text) => {
            if (text === '{{') {
              showAutocomplete(view, from, this.options.placeholders);
              return true;
            }
            return false;
          }
        }
      })
    ];
  }
});
```

### EmailPreviewExtension

Email preview functionality:

```typescript
const EmailPreviewExtension = Extension.create({
  name: 'emailPreview',
  
  addCommands() {
    return {
      showEmailPreview: () => ({ editor }) => {
        const html = editor.getHTML();
        // Show preview modal
        showEmailPreviewModal(html);
        return true;
      }
    };
  }
});
```

---

## Component API

### TipTapEditor Props

```typescript
interface TipTapEditorProps {
  // Content
  content: string;
  onChange: (content: string) => void;
  
  // Configuration
  placeholder?: string;
  mode?: 'default' | 'email' | 'plain';
  showToolbar?: boolean;
  editable?: boolean;
  
  // Placeholder support
  placeholderDefinitions?: PlaceholderDefinition[];
  onPlaceholderInsert?: (placeholder: string) => void;
  
  // Extensions
  extensions?: Extension[];
  
  // Styling
  className?: string;
  theme?: 'light' | 'dark';
  
  // Events
  onFocus?: () => void;
  onBlur?: () => void;
  onUpdate?: ({ editor }: { editor: Editor }) => void;
}
```

### Usage Hook

```typescript
// use-tiptap-editor.ts
export function useTipTapEditor(props: TipTapEditorProps) {
  const editor = useEditor({
    content: props.content,
    extensions: props.extensions || getDefaultExtensions(props.mode),
    onUpdate: ({ editor }) => {
      props.onChange(editor.getHTML());
    },
    editable: props.editable !== false
  });

  return {
    editor,
    // Helper methods
    insertPlaceholder: (name: string) => {
      editor?.chain().focus().insertContent(`{{${name}}}`).run();
    },
    // ...
  };
}
```

---

## Implementation Files

### Components

- `apps/web/src/components/editor/tiptap-editor.tsx` - Main editor component
- `apps/web/src/components/editor/tiptap-toolbar.tsx` - Toolbar component
- `apps/web/src/components/editor/tiptap-extensions.ts` - Extension configurations
- `apps/web/src/components/editor/placeholder-autocomplete.tsx` - Autocomplete component
- `apps/web/src/components/editor/email-preview.tsx` - Email preview component

### Hooks

- `apps/web/src/hooks/use-tiptap-editor.ts` - Editor hook

### Extensions

- `apps/web/src/components/editor/extensions/placeholder-extension.ts` - Placeholder handling
- `apps/web/src/components/editor/extensions/email-mode-extension.ts` - Email mode
- `apps/web/src/components/editor/extensions/placeholder-autocomplete-extension.ts` - Autocomplete

---

## Related Documentation

- [Email Templates README](./README.md) - Overview
- [UI Implementation](./UI-IMPLEMENTATION.md) - Component usage
- [TipTap Documentation](https://tiptap.dev/) - Official TipTap docs







