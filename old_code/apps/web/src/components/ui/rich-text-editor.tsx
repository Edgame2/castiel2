"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { cn } from "@/lib/utils"
import { Skeleton } from "./skeleton"
import type { ToolbarPreset } from "@castiel/shared-types"

// Dynamically import ReactQuill to avoid SSR issues
const ReactQuill = dynamic(
  async () => {
    const { default: RQ } = await import("react-quill" as any)
    // Import Quill styles
    await import("react-quill/dist/quill.snow.css" as any)
    return RQ
  },
  {
    ssr: false,
    loading: () => <RichTextEditorSkeleton />,
  }
)

// ============================================================================
// Toolbar Presets
// ============================================================================

const TOOLBAR_PRESETS = {
  basic: [
    ["bold", "italic", "underline"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["link"],
    ["clean"],
  ],
  standard: [
    ["bold", "italic", "underline", "strike"],
    [{ header: [1, 2, 3, false] }],
    [{ list: "ordered" }, { list: "bullet" }],
    ["link", "image"],
    ["blockquote"],
    ["clean"],
  ],
  full: [
    ["bold", "italic", "underline", "strike"],
    [{ header: [1, 2, 3, 4, 5, 6, false] }],
    [{ font: [] }, { size: ["small", false, "large", "huge"] }],
    [{ color: [] }, { background: [] }],
    [{ list: "ordered" }, { list: "bullet" }, { indent: "-1" }, { indent: "+1" }],
    [{ align: [] }],
    ["link", "image", "video"],
    ["blockquote", "code-block"],
    ["clean"],
  ],
} as const

// ============================================================================
// Types
// ============================================================================

export interface RichTextEditorProps {
  /** Current value (HTML string) */
  value?: string
  /** Change handler */
  onChange?: (value: string) => void
  /** Toolbar preset or 'custom' */
  toolbar?: ToolbarPreset
  /** Custom toolbar configuration (when toolbar = 'custom') */
  customToolbar?: (string | Record<string, unknown>)[][]
  /** Placeholder text */
  placeholder?: string
  /** Minimum height in pixels */
  minHeight?: number
  /** Maximum height in pixels (enables scroll) */
  maxHeight?: number
  /** Maximum content size in bytes */
  maxSize?: number
  /** Read-only mode */
  readOnly?: boolean
  /** Disabled state */
  disabled?: boolean
  /** Show character/size count */
  showCount?: boolean
  /** Error state */
  error?: boolean
  /** Error message */
  errorMessage?: string
  /** Additional class name */
  className?: string
  /** ID for the editor */
  id?: string
  /** Blur handler */
  onBlur?: () => void
  /** Focus handler */
  onFocus?: () => void
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function RichTextEditorSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-10 w-full rounded-t-md" />
      <Skeleton className="h-32 w-full rounded-b-md" />
    </div>
  )
}

// ============================================================================
// Character Counter
// ============================================================================

interface CharacterCounterProps {
  content: string
  maxSize?: number
}

function CharacterCounter({ content, maxSize }: CharacterCounterProps) {
  const charCount = content.length
  const byteSize = new Blob([content]).size
  const isOverLimit = maxSize && byteSize > maxSize

  return (
    <div
      className={cn(
        "text-xs text-muted-foreground flex items-center gap-2 mt-1",
        isOverLimit && "text-destructive"
      )}
    >
      <span>{charCount.toLocaleString()} characters</span>
      {maxSize && (
        <>
          <span>•</span>
          <span>
            {(byteSize / 1024).toFixed(1)} KB / {(maxSize / 1024).toFixed(0)} KB
          </span>
        </>
      )}
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export const RichTextEditor = React.forwardRef<HTMLDivElement, RichTextEditorProps>(
  (
    {
      value = "",
      onChange,
      toolbar = "standard",
      customToolbar,
      placeholder = "Write something...",
      minHeight = 150,
      maxHeight,
      maxSize,
      readOnly = false,
      disabled = false,
      showCount = false,
      error = false,
      errorMessage,
      className,
      id,
      onBlur,
      onFocus,
    },
    ref
  ) => {
    const [isMounted, setIsMounted] = React.useState(false)
    const [isFocused, setIsFocused] = React.useState(false)

    // Handle SSR
    React.useEffect(() => {
      setIsMounted(true)
    }, [])

    // Determine toolbar configuration
    const toolbarConfig = React.useMemo(() => {
      if (toolbar === "custom" && customToolbar) {
        return customToolbar
      }
      return TOOLBAR_PRESETS[toolbar as keyof typeof TOOLBAR_PRESETS] || TOOLBAR_PRESETS.standard
    }, [toolbar, customToolbar])

    // Handle value change with size validation
    const handleChange = React.useCallback(
      (content: string) => {
        // Check size limit
        if (maxSize) {
          const byteSize = new Blob([content]).size
          if (byteSize > maxSize) {
            // Don't update if over limit - could also truncate
            return
          }
        }
        onChange?.(content)
      },
      [onChange, maxSize]
    )

    // Handle focus/blur
    const handleFocus = React.useCallback(() => {
      setIsFocused(true)
      onFocus?.()
    }, [onFocus])

    const handleBlur = React.useCallback(() => {
      setIsFocused(false)
      onBlur?.()
    }, [onBlur])

    // Quill modules configuration
    const modules = React.useMemo(
      () => ({
        toolbar: readOnly ? false : toolbarConfig,
        clipboard: {
          matchVisual: false,
        },
      }),
      [toolbarConfig, readOnly]
    )

    // Quill formats configuration
    const formats = [
      "header",
      "font",
      "size",
      "bold",
      "italic",
      "underline",
      "strike",
      "blockquote",
      "code-block",
      "list",
      "bullet",
      "indent",
      "link",
      "image",
      "video",
      "color",
      "background",
      "align",
    ]

    if (!isMounted) {
      return <RichTextEditorSkeleton />
    }

    return (
      <div ref={ref} className={cn("rich-text-editor", className)}>
        <div
          className={cn(
            "relative rounded-md border bg-background transition-colors",
            isFocused && "ring-2 ring-ring ring-offset-2",
            error && "border-destructive",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          {/* @ts-ignore - ReactQuill types are incomplete */}
          {React.createElement(ReactQuill as any, {
            theme: "snow",
            value: value,
            onChange: handleChange,
            modules: modules,
            formats: formats,
            placeholder: placeholder,
            readOnly: readOnly || disabled,
            onFocus: handleFocus,
            onBlur: handleBlur,
            style: {
              minHeight: `${minHeight}px`,
              maxHeight: maxHeight ? `${maxHeight}px` : undefined,
            },
          })}
        </div>

        {/* Character/size counter */}
        {showCount && <CharacterCounter content={value} maxSize={maxSize} />}

        {/* Error message */}
        {errorMessage && (
          <p className="text-sm text-destructive mt-1">{errorMessage}</p>
        )}

        {/* Custom styles */}
        <style jsx global>{`
          .rich-text-editor .ql-container {
            font-family: inherit;
            font-size: 0.875rem;
            border: none;
            min-height: ${minHeight - 42}px;
            ${maxHeight ? `max-height: ${maxHeight - 42}px; overflow-y: auto;` : ""}
          }

          .rich-text-editor .ql-toolbar {
            border: none;
            border-bottom: 1px solid hsl(var(--border));
            background: hsl(var(--muted) / 0.3);
            border-radius: calc(var(--radius) - 2px) calc(var(--radius) - 2px) 0 0;
          }

          .rich-text-editor .ql-editor {
            padding: 12px 16px;
            min-height: ${minHeight - 42}px;
          }

          .rich-text-editor .ql-editor.ql-blank::before {
            color: hsl(var(--muted-foreground));
            font-style: normal;
            left: 16px;
            right: 16px;
          }

          .rich-text-editor .ql-toolbar button:hover,
          .rich-text-editor .ql-toolbar button:focus,
          .rich-text-editor .ql-toolbar button.ql-active {
            color: hsl(var(--primary));
          }

          .rich-text-editor .ql-toolbar button:hover .ql-stroke,
          .rich-text-editor .ql-toolbar button:focus .ql-stroke,
          .rich-text-editor .ql-toolbar button.ql-active .ql-stroke {
            stroke: hsl(var(--primary));
          }

          .rich-text-editor .ql-toolbar button:hover .ql-fill,
          .rich-text-editor .ql-toolbar button:focus .ql-fill,
          .rich-text-editor .ql-toolbar button.ql-active .ql-fill {
            fill: hsl(var(--primary));
          }

          .rich-text-editor .ql-snow .ql-picker {
            color: hsl(var(--foreground));
          }

          .rich-text-editor .ql-snow .ql-picker-options {
            background: hsl(var(--popover));
            border-color: hsl(var(--border));
            border-radius: var(--radius);
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
          }

          .rich-text-editor .ql-snow .ql-picker-item:hover {
            color: hsl(var(--primary));
          }

          /* Dark mode support */
          .dark .rich-text-editor .ql-toolbar .ql-stroke {
            stroke: hsl(var(--foreground));
          }

          .dark .rich-text-editor .ql-toolbar .ql-fill {
            fill: hsl(var(--foreground));
          }

          .dark .rich-text-editor .ql-toolbar .ql-picker {
            color: hsl(var(--foreground));
          }

          /* Links */
          .rich-text-editor .ql-editor a {
            color: hsl(var(--primary));
          }

          /* Code blocks */
          .rich-text-editor .ql-editor pre.ql-syntax {
            background: hsl(var(--muted));
            border-radius: var(--radius);
            padding: 12px;
            font-family: ui-monospace, monospace;
            font-size: 0.8125rem;
          }

          /* Blockquotes */
          .rich-text-editor .ql-editor blockquote {
            border-left: 4px solid hsl(var(--border));
            padding-left: 16px;
            color: hsl(var(--muted-foreground));
          }

          /* Focus within for accessibility */
          .rich-text-editor:focus-within .ql-toolbar {
            border-bottom-color: hsl(var(--ring));
          }
        `}</style>
      </div>
    )
  }
)

RichTextEditor.displayName = "RichTextEditor"

// ============================================================================
// Read-only Viewer Component
// ============================================================================

export interface RichTextViewerProps {
  /** HTML content to display */
  content: string
  /** Additional class name */
  className?: string
}

export function RichTextViewer({ content, className }: RichTextViewerProps) {
  return (
    <div
      className={cn(
        "prose prose-sm dark:prose-invert max-w-none",
        "prose-a:text-primary",
        "prose-blockquote:border-l-border prose-blockquote:text-muted-foreground",
        "prose-pre:bg-muted prose-pre:rounded-md",
        "prose-code:bg-muted prose-code:rounded prose-code:px-1.5 prose-code:py-0.5",
        className
      )}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  )
}

export default RichTextEditor
