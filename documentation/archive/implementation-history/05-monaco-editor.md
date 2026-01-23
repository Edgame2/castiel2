# Monaco Editor Module

**Category:** Editor & UI  
**Location:** `src/renderer/components/editor/`, `src/renderer/components/Editor.tsx`  
**Last Updated:** 2025-01-27

---

## Overview

The Monaco Editor Module provides the core code editing functionality for the Coder IDE. It integrates Monaco Editor (the editor that powers VS Code) with the application, providing syntax highlighting, IntelliSense, code completion, and advanced editing features.

## Purpose

- Code editing with Monaco Editor
- Syntax highlighting for multiple languages
- IntelliSense and code completion
- Multi-cursor support
- Code navigation and search
- Editor customization and theming
- Integration with AI features

---

## Key Components

### 1. Editor Component (`Editor.tsx`)

**Location:** `src/renderer/components/Editor.tsx`

**Purpose:** Main editor component wrapper

**Responsibilities:**
- Monaco Editor initialization
- Editor configuration
- File content loading
- Editor event handling
- Integration with IPC

**Key Features:**
- File-based editing
- Syntax highlighting
- Code completion
- Error markers
- Find/replace
- Multi-cursor editing

### 2. Editor Group (`EditorGroup.tsx`, `EditorGroupContainer.tsx`)

**Location:** `src/renderer/components/EditorGroup.tsx`, `EditorGroupContainer.tsx`

**Purpose:** Multiple editor group management

**Responsibilities:**
- Multiple editor groups (split view)
- Editor group layout
- Editor group switching
- Tab management per group

**Features:**
- Split editor groups
- Drag-and-drop between groups
- Group layout persistence

### 3. Editor Tabs (`EditorTabs.tsx`)

**Location:** `src/renderer/components/EditorTabs.tsx`

**Purpose:** Tab management for open files

**Responsibilities:**
- Tab display and management
- Tab switching
- Tab closing
- Tab pinning
- Tab decorations (modified, unsaved)

**Features:**
- Multiple tabs per editor group
- Tab reordering
- Tab pinning
- Tab decorations
- Keyboard navigation

---

## Monaco Editor Integration

### Initialization

```typescript
import * as monaco from 'monaco-editor';

const editor = monaco.editor.create(containerElement, {
  value: fileContent,
  language: fileLanguage,
  theme: 'vs-dark',
  automaticLayout: true,
  minimap: { enabled: true },
  wordWrap: 'on',
  lineNumbers: 'on',
});
```

### Configuration Options

**Common Options:**
- `value` - Initial content
- `language` - Programming language
- `theme` - Editor theme
- `automaticLayout` - Auto-resize
- `minimap` - Minimap display
- `wordWrap` - Word wrapping
- `lineNumbers` - Line numbers
- `readOnly` - Read-only mode
- `fontSize` - Font size
- `fontFamily` - Font family

### Language Support

Monaco Editor supports 100+ languages:
- JavaScript/TypeScript
- Python
- Java
- C/C++
- Go
- Rust
- And many more...

---

## Editor Features

### Syntax Highlighting

Automatic syntax highlighting based on file extension:

```typescript
const language = getLanguageFromExtension(filePath);
editor.setModelLanguage(model, language);
```

### IntelliSense

Code completion and IntelliSense:

```typescript
// Register language features
monaco.languages.registerCompletionItemProvider('typescript', {
  provideCompletionItems: (model, position) => {
    // Provide completion items
  }
});
```

### Error Markers

Display errors and warnings:

```typescript
monaco.editor.setModelMarkers(model, 'source', [
  {
    startLineNumber: 10,
    startColumn: 1,
    endLineNumber: 10,
    endColumn: 5,
    message: 'Error message',
    severity: monaco.MarkerSeverity.Error,
  }
]);
```

### Find/Replace

Built-in find/replace functionality:

```typescript
editor.getAction('actions.find').run();
editor.getAction('actions.replace').run();
```

### Multi-Cursor

Multi-cursor editing support:

```typescript
// Add cursor at position
editor.setSelections([
  new monaco.Selection(1, 1, 1, 1),
  new monaco.Selection(2, 1, 2, 1),
]);
```

---

## Editor Events

### Content Changes

```typescript
editor.onDidChangeModelContent((e) => {
  // Handle content changes
  const content = editor.getValue();
  // Save or update
});
```

### Cursor Position

```typescript
editor.onDidChangeCursorPosition((e) => {
  // Handle cursor position changes
  const position = e.position;
});
```

### Selection Changes

```typescript
editor.onDidChangeCursorSelection((e) => {
  // Handle selection changes
  const selection = e.selection;
});
```

---

## File Integration

### Loading Files

```typescript
// Load file content via IPC
const content = await window.electronAPI.file.read(filePath);
editor.setValue(content);
```

### Saving Files

```typescript
// Save file content via IPC
const content = editor.getValue();
await window.electronAPI.file.write(filePath, content);
```

### File Watching

```typescript
// Watch for external file changes
window.electronAPI.file.watch(filePath, (event) => {
  if (event.type === 'change') {
    // Reload file content
    reloadFile();
  }
});
```

---

## Editor Customization

### Themes

```typescript
// Set theme
monaco.editor.setTheme('vs-dark');
monaco.editor.setTheme('vs-light');
monaco.editor.setTheme('hc-black');
```

### Custom Themes

```typescript
monaco.editor.defineTheme('custom-theme', {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '6A9955' },
    { token: 'keyword', foreground: '569CD6' },
  ],
  colors: {
    'editor.background': '#1E1E1E',
  }
});
```

### Font Configuration

```typescript
editor.updateOptions({
  fontSize: 14,
  fontFamily: 'Fira Code, Consolas, monospace',
  fontLigatures: true,
});
```

---

## Integration with AI Features

### Code Completion

AI-powered code completion:

```typescript
monaco.languages.registerCompletionItemProvider('typescript', {
  provideCompletionItems: async (model, position) => {
    const suggestions = await getAISuggestions(model, position);
    return { suggestions };
  }
});
```

### Inline Suggestions

AI inline code suggestions:

```typescript
// Show AI suggestions inline
editor.setInlineSuggestions([
  {
    range: new monaco.Range(10, 1, 10, 5),
    text: 'suggested code',
  }
]);
```

---

## Editor Groups

### Split View

```typescript
// Create editor group
const editorGroup = new EditorGroup();
editorGroup.addEditor(filePath1);
editorGroup.split('vertical'); // or 'horizontal'
editorGroup.addEditor(filePath2);
```

### Group Layout

- Vertical split
- Horizontal split
- Grid layout
- Tab groups

---

## Keyboard Shortcuts

### Common Shortcuts

- `Ctrl/Cmd + S` - Save file
- `Ctrl/Cmd + F` - Find
- `Ctrl/Cmd + H` - Replace
- `Ctrl/Cmd + G` - Find next
- `Ctrl/Cmd + Shift + F` - Find in files
- `Ctrl/Cmd + /` - Toggle comment
- `Alt + Up/Down` - Move line
- `Ctrl/Cmd + D` - Add selection to next find match
- `Ctrl/Cmd + K, Ctrl/Cmd + D` - Move last selection to next find match

### Custom Shortcuts

```typescript
editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
  saveFile();
});
```

---

## Performance Optimization

### Large Files

For large files:
- Virtual scrolling
- Lazy loading
- Chunked rendering

### Model Management

```typescript
// Dispose unused models
monaco.editor.getModels().forEach(model => {
  if (!isModelInUse(model)) {
    model.dispose();
  }
});
```

---

## Accessibility

### Keyboard Navigation

- Full keyboard navigation support
- Screen reader compatibility
- ARIA labels

### Focus Management

```typescript
// Focus editor
editor.focus();

// Get focus state
const isFocused = editor.hasTextFocus();
```

---

## Related Modules

- **File Management Module** - File operations
- **Command & Palette Module** - Editor commands
- **Activity Bar & Views Module** - Editor view management

---

## Summary

The Monaco Editor Module provides a powerful, feature-rich code editing experience in the Coder IDE. With Monaco Editor integration, syntax highlighting, IntelliSense, multi-cursor support, and AI features, it delivers a professional code editing environment comparable to VS Code.
