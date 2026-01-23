"use client"

import { useEditor, EditorContent } from '@tiptap/react';
import { useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { getDefaultExtensions } from './tiptap-extensions';
import { TipTapToolbar } from './tiptap-toolbar';
import type { TipTapEditorProps } from '@/types/editor.types';

export function TipTapEditor({
  content,
  onChange,
  placeholder,
  mode = 'default',
  outputFormat = 'html',
  showToolbar = true,
  editable = true,
  extensions = [],
  className,
  minHeight = '200px',
  maxHeight,
}: TipTapEditorProps) {
  const editor = useEditor({
    extensions: [
      ...getDefaultExtensions(mode, placeholder),
      ...extensions,
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(outputFormat === 'json' ? editor.getJSON() : editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm dark:prose-invert max-w-none focus:outline-none',
          'prose-headings:font-semibold',
          'prose-p:my-2',
          'prose-ul:my-2',
          'prose-ol:my-2',
          'prose-li:my-1',
          'prose-a:text-primary prose-a:underline prose-a:underline-offset-4',
          'prose-strong:font-semibold',
          'prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm',
          'prose-pre:bg-muted prose-pre:p-4 prose-pre:rounded-lg',
          'prose-blockquote:border-l-4 prose-blockquote:border-border prose-blockquote:pl-4',
          'prose-img:rounded-lg prose-img:my-4',
          'prose-table:w-full prose-table:border-collapse',
          'prose-th:border prose-th:border-border prose-th:bg-muted prose-th:p-2',
          'prose-td:border prose-td:border-border prose-td:p-2',
        ),
      },
    },
  });

  // Sync content when it changes externally
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, false);
    }
  }, [content, editor]);

  // Update editable state
  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

  if (!editor) {
    return (
      <div className={cn('border rounded-lg p-4', className)}>
        <div className="animate-pulse">Loading editor...</div>
      </div>
    );
  }

  return (
    <div className={cn('border rounded-lg bg-background', className)}>
      {showToolbar && <TipTapToolbar editor={editor} />}
      <div
        className={cn(
          'relative',
          'overflow-y-auto',
          'p-4',
          'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2'
        )}
        style={{
          minHeight,
          maxHeight: maxHeight || 'none',
        }}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}







