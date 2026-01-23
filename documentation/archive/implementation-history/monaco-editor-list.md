# Monaco Editor Module
## UI Components, Features, and Integration

---

## OVERVIEW

**Location:** `src/renderer/components/editor/`, `src/renderer/components/Editor.tsx`  
**Purpose:** Core code editing functionality using Monaco Editor (VS Code's editor)

---

## UI COMPONENTS

### Main Editor Components

1. **Editor** (`Editor.tsx`)
   - Main editor component wrapper
   - Monaco Editor instance container
   - File content display and editing
   - Configuration management

2. **EditorGroup** (`EditorGroup.tsx`)
   - Multiple editor group management
   - Split view container
   - Editor group layout manager

3. **EditorGroupContainer** (`EditorGroupContainer.tsx`)
   - Container for editor groups
   - Group layout orchestration
   - Drag-and-drop support

4. **EditorTabs** (`EditorTabs.tsx`)
   - Tab bar for open files
   - Tab switching interface
   - Tab management (close, pin, reorder)

5. **Minimap**
   - Code overview minimap
   - Quick navigation
   - Built-in Monaco feature

6. **IntelliSense Widget**
   - Code completion popup
   - Parameter hints
   - Quick info display

7. **HoverWidget**
   - Hover information display
   - Type information
   - Documentation preview

8. **Find Widget**
   - Find and replace interface
   - Search options panel
   - Replace controls

9. **DiffEditor**
   - Side-by-side diff view
   - Inline diff display
   - Change navigation

10. **SuggestWidget**
    - Autocomplete suggestions
    - Snippet expansion
    - Context-aware suggestions

### Editor Overlays & Widgets

11. **ErrorWidget**
    - Error marker display
    - Warning indicators
    - Problem tooltips

12. **BreakpointWidget**
    - Breakpoint indicators
    - Debug breakpoints
    - Conditional breakpoints

13. **LineNumbersGutter**
    - Line number display
    - Gutter decorations
    - Code folding controls

14. **OverviewRuler**
    - Scrollbar annotations
    - Error/warning markers
    - Search result markers

15. **ContentWidget**
    - Custom inline widgets
    - Decoration widgets
    - Overlay elements

### Supporting Components

16. **EditorContextMenu**
    - Right-click context menu
    - Editor actions
    - Quick actions

17. **EditorStatusBar**
    - Position indicator (line:column)
    - File type display
    - Encoding information
    - End-of-line display

18. **EditorBreadcrumbs**
    - File path breadcrumbs
    - Symbol navigation
    - Quick file switching

---

## MONACO EDITOR FEATURES

### Core Editing Features

1. **Syntax Highlighting**
   - 100+ language support
   - Custom token colorization
   - Semantic highlighting

2. **IntelliSense**
   - Code completion
   - Parameter hints
   - Quick info
   - Signature help

3. **Code Navigation**
   - Go to definition
   - Find all references
   - Peek definition
   - Go to symbol

4. **Code Folding**
   - Block folding
   - Region folding
   - Custom fold regions

5. **Multi-Cursor**
   - Multiple cursor editing
   - Column selection
   - Multi-cursor shortcuts

6. **Find & Replace**
   - Text search
   - Regular expression search
   - Replace single/all
   - Case-sensitive search

7. **Code Formatting**
   - Auto-formatting
   - Format on type
   - Format on paste
   - Custom formatters

8. **Code Actions**
   - Quick fixes
   - Refactoring actions
   - Code generation
   - Import organization

### Advanced Features

9. **Diff Editor**
   - Side-by-side comparison
   - Inline diff view
   - Change navigation
   - Merge conflict resolution

10. **Code Lens**
    - Inline actionable items
    - Reference counts
    - Custom code lens providers

11. **Markers & Diagnostics**
    - Error markers
    - Warning markers
    - Information markers
    - Hint markers

12. **Decorations**
    - Line decorations
    - Inline decorations
    - Gutter decorations
    - Overview ruler decorations

13. **Snippets**
    - Code snippets
    - Tab stops
    - Placeholders
    - Variable substitution

14. **Bracket Matching**
    - Matching bracket highlighting
    - Bracket colorization
    - Auto-closing brackets

15. **Indentation Guides**
    - Indentation lines
    - Active indent guide
    - Indentation detection

### Editor Settings

16. **Font Configuration**
    - Font family
    - Font size
    - Font weight
    - Font ligatures

17. **Theme Support**
    - Light themes
    - Dark themes
    - High contrast themes
    - Custom themes

18. **Word Wrap**
    - Line wrapping
    - Word wrap column
    - Word wrap indent

19. **Line Numbers**
    - Absolute line numbers
    - Relative line numbers
    - Interval line numbers

20. **Minimap**
    - Minimap display
    - Minimap size
    - Minimap position

### Language Support

21. **Language Detection**
    - Auto-detect language from file extension
    - Manual language selection
    - Language association

22. **Supported Languages** (100+)
    - JavaScript/TypeScript
    - Python
    - Java
    - C/C++/C#
    - Go
    - Rust
    - PHP
    - Ruby
    - Swift
    - Kotlin
    - HTML/CSS
    - SQL
    - Markdown
    - JSON/YAML
    - And many more...

---

## INTEGRATION FEATURES

### AI-Powered Features

1. **AI Code Completion**
   - Context-aware suggestions
   - Multi-line completion
   - Natural language to code

2. **AI Inline Suggestions**
   - Ghost text suggestions
   - Accept/reject suggestions
   - Partial acceptance

3. **AI Code Actions**
   - AI-powered refactoring
   - Code optimization
   - Bug fixing suggestions

### File System Integration

4. **File Loading**
   - Load file via IPC
   - Async file reading
   - Large file handling

5. **File Saving**
   - Save via IPC
   - Auto-save support
   - Dirty state tracking

6. **File Watching**
   - External change detection
   - Auto-reload on change
   - Conflict resolution

### Editor Groups & Layout

7. **Split View**
   - Vertical split
   - Horizontal split
   - Grid layout
   - Custom layouts

8. **Tab Management**
   - Multiple tabs per group
   - Tab reordering
   - Tab pinning
   - Tab decorations

9. **Drag & Drop**
   - Drag tabs between groups
   - Drag files into editor
   - Reorder groups

---

## KEYBOARD SHORTCUTS

### Essential Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + S` | Save file |
| `Ctrl/Cmd + F` | Find |
| `Ctrl/Cmd + H` | Replace |
| `Ctrl/Cmd + G` | Go to line |
| `Ctrl/Cmd + Shift + F` | Find in files |
| `Ctrl/Cmd + /` | Toggle comment |
| `Alt + Up/Down` | Move line up/down |
| `Ctrl/Cmd + D` | Add selection to next match |
| `Ctrl/Cmd + Shift + K` | Delete line |
| `Ctrl/Cmd + Enter` | Insert line below |
| `Ctrl/Cmd + Shift + Enter` | Insert line above |
| `Ctrl/Cmd + ]` | Indent line |
| `Ctrl/Cmd + [` | Outdent line |
| `Ctrl/Cmd + Shift + \` | Jump to matching bracket |
| `F12` | Go to definition |
| `Alt + F12` | Peek definition |
| `Shift + F12` | Find all references |
| `F2` | Rename symbol |
| `Ctrl/Cmd + K, Ctrl/Cmd + F` | Format selection |
| `Shift + Alt + F` | Format document |

### Multi-Cursor Shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt + Click` | Add cursor |
| `Ctrl/Cmd + Alt + Up/Down` | Add cursor above/below |
| `Ctrl/Cmd + D` | Add selection to next match |
| `Ctrl/Cmd + K, Ctrl/Cmd + D` | Move last selection to next match |
| `Ctrl/Cmd + Shift + L` | Select all occurrences |

---

## EDITOR CONFIGURATION OPTIONS

### Display Options

```typescript
{
  // Font settings
  fontSize: 14,
  fontFamily: 'Fira Code, Consolas, monospace',
  fontLigatures: true,
  fontWeight: 'normal',
  
  // Line settings
  lineNumbers: 'on', // 'on' | 'off' | 'relative' | 'interval'
  lineHeight: 0, // 0 = auto
  
  // Minimap
  minimap: {
    enabled: true,
    side: 'right',
    showSlider: 'mouseover',
    renderCharacters: true,
    maxColumn: 120
  },
  
  // Word wrap
  wordWrap: 'on', // 'on' | 'off' | 'wordWrapColumn' | 'bounded'
  wordWrapColumn: 80,
  
  // Whitespace
  renderWhitespace: 'selection', // 'none' | 'boundary' | 'selection' | 'all'
  
  // Indent guides
  renderIndentGuides: true,
  highlightActiveIndentGuide: true
}
```

### Editing Options

```typescript
{
  // Auto-closing
  autoClosingBrackets: 'languageDefined',
  autoClosingQuotes: 'languageDefined',
  autoSurround: 'languageDefined',
  
  // Formatting
  formatOnType: true,
  formatOnPaste: true,
  
  // Suggestions
  quickSuggestions: true,
  suggestOnTriggerCharacters: true,
  acceptSuggestionOnEnter: 'on',
  
  // Tabs
  tabSize: 2,
  insertSpaces: true,
  detectIndentation: true,
  
  // Selection
  multiCursorModifier: 'alt',
  selectionHighlight: true,
  occurrencesHighlight: true
}
```

### Behavior Options

```typescript
{
  // Scrolling
  smoothScrolling: true,
  mouseWheelZoom: true,
  
  // Cursor
  cursorBlinking: 'blink',
  cursorStyle: 'line',
  cursorSmoothCaretAnimation: true,
  
  // Folding
  folding: true,
  foldingStrategy: 'auto',
  showFoldingControls: 'mouseover',
  
  // Find
  find: {
    seedSearchStringFromSelection: true,
    autoFindInSelection: 'never',
    addExtraSpaceOnTop: true
  },
  
  // Read-only
  readOnly: false,
  readOnlyMessage: { value: 'File is read-only' }
}
```

---

## EDITOR EVENTS & LIFECYCLE

### Content Events

```typescript
// Content changed
editor.onDidChangeModelContent((event) => {
  const content = editor.getValue();
  // Handle change
});

// Model changed
editor.onDidChangeModel((event) => {
  // New file loaded
});
```

### Cursor Events

```typescript
// Cursor position changed
editor.onDidChangeCursorPosition((event) => {
  const { lineNumber, column } = event.position;
});

// Selection changed
editor.onDidChangeCursorSelection((event) => {
  const selection = event.selection;
});
```

### Editor State Events

```typescript
// Focus changed
editor.onDidFocusEditorText(() => {
  // Editor gained focus
});

editor.onDidBlurEditorText(() => {
  // Editor lost focus
});

// Options changed
editor.onDidChangeConfiguration((event) => {
  // Editor configuration changed
});
```

---

## EDITOR API METHODS

### Content Manipulation

```typescript
// Get/Set content
const content = editor.getValue();
editor.setValue('new content');

// Get/Set selection
const selection = editor.getSelection();
editor.setSelection(new monaco.Selection(1, 1, 1, 5));

// Insert text
editor.trigger('keyboard', 'type', { text: 'new text' });

// Execute command
editor.getAction('editor.action.formatDocument').run();
```

### Navigation

```typescript
// Go to line
editor.revealLine(10);
editor.revealLineInCenter(10);

// Scroll
editor.setScrollTop(100);
editor.setScrollLeft(50);

// Focus
editor.focus();
```

### Language Features

```typescript
// Get position
const position = editor.getPosition();

// Get model
const model = editor.getModel();

// Get language
const language = model.getLanguageId();

// Set language
monaco.editor.setModelLanguage(model, 'javascript');
```

---

## THEME CUSTOMIZATION

### Built-in Themes

1. **vs** - Light theme
2. **vs-dark** - Dark theme
3. **hc-black** - High contrast dark
4. **hc-light** - High contrast light

### Custom Theme Definition

```typescript
monaco.editor.defineTheme('custom-theme', {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '6A9955' },
    { token: 'keyword', foreground: '569CD6' },
    { token: 'string', foreground: 'CE9178' },
    { token: 'number', foreground: 'B5CEA8' },
    { token: 'type', foreground: '4EC9B0' },
    { token: 'function', foreground: 'DCDCAA' }
  ],
  colors: {
    'editor.background': '#1E1E1E',
    'editor.foreground': '#D4D4D4',
    'editor.lineHighlightBackground': '#2A2A2A',
    'editorCursor.foreground': '#AEAFAD',
    'editor.selectionBackground': '#264F78',
    'editor.inactiveSelectionBackground': '#3A3D41'
  }
});

// Apply theme
monaco.editor.setTheme('custom-theme');
```

---

## LANGUAGE PROVIDERS

### Completion Provider

```typescript
monaco.languages.registerCompletionItemProvider('javascript', {
  provideCompletionItems: (model, position) => {
    const suggestions = [
      {
        label: 'console.log',
        kind: monaco.languages.CompletionItemKind.Function,
        insertText: 'console.log(${1:message});',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'Log to console'
      }
    ];
    return { suggestions };
  }
});
```

### Hover Provider

```typescript
monaco.languages.registerHoverProvider('javascript', {
  provideHover: (model, position) => {
    return {
      contents: [
        { value: '**Function Name**' },
        { value: 'Description of the function' }
      ]
    };
  }
});
```

### Definition Provider

```typescript
monaco.languages.registerDefinitionProvider('javascript', {
  provideDefinition: (model, position) => {
    return {
      uri: model.uri,
      range: new monaco.Range(10, 1, 10, 10)
    };
  }
});
```

---

## DIAGNOSTICS & MARKERS

### Setting Markers

```typescript
monaco.editor.setModelMarkers(model, 'source', [
  {
    startLineNumber: 10,
    startColumn: 1,
    endLineNumber: 10,
    endColumn: 5,
    message: 'Variable not defined',
    severity: monaco.MarkerSeverity.Error
  },
  {
    startLineNumber: 15,
    startColumn: 1,
    endLineNumber: 15,
    endColumn: 10,
    message: 'Deprecated method',
    severity: monaco.MarkerSeverity.Warning
  }
]);
```

### Marker Severities

- `Error` - Red squiggly underline
- `Warning` - Yellow squiggly underline
- `Info` - Blue squiggly underline
- `Hint` - Gray dots

---

## PERFORMANCE OPTIMIZATIONS

### Large File Handling

1. **Virtual Scrolling**
   - Only render visible lines
   - Lazy load content

2. **Model Disposal**
   - Dispose unused models
   - Free memory

3. **Chunked Rendering**
   - Render in chunks
   - Progressive loading

### Memory Management

```typescript
// Dispose editor
editor.dispose();

// Dispose model
model.dispose();

// Dispose all models
monaco.editor.getModels().forEach(model => {
  if (!isModelInUse(model)) {
    model.dispose();
  }
});
```

---

## NO API ENDPOINTS

The Monaco Editor module is entirely frontend-based and does not have its own API endpoints. It interacts with:

1. **File System via IPC**
   - `window.electronAPI.file.read(path)`
   - `window.electronAPI.file.write(path, content)`
   - `window.electronAPI.file.watch(path, callback)`

2. **Backend Services (Indirect)**
   - AI code completion via Model Integration module
   - File operations via Platform Services
   - Project context via Context Aggregation module

---

## SUMMARY

### Total Components & Features

**UI Components:** 18 main components
- 4 core editor components
- 14 widgets and overlays

**Monaco Features:** 20+ feature categories
- Core editing (7 features)
- Advanced features (9 features)
- Settings (5 categories)

**Language Support:** 100+ languages

**Keyboard Shortcuts:** 30+ essential shortcuts

**Integration Points:**
- AI-powered features (3)
- File system integration (3)
- Layout management (3)

**Configuration Options:** 50+ settings

**API Methods:** 20+ methods

**Events:** 10+ event types

**Language Providers:** 10+ provider types

**No API Endpoints** - Frontend component only
