"use client"

import { useEditor, EditorContent } from '@tiptap/react';
import { useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { getDefaultExtensions } from './tiptap-extensions';
import { PlaceholderExtension } from './extensions/placeholder-extension';
import { TipTapToolbar } from './tiptap-toolbar';
import { PlaceholderAutocomplete } from './placeholder-autocomplete';
import type { TipTapEditorProps } from '@/types/editor.types';
import type { PlaceholderDefinition } from '@/types/email-template';

export function TipTapEditorWithPlaceholders({
  content,
  onChange,
  placeholder,
  mode = 'default',
  placeholderDefinitions = [],
  onPlaceholderInsert,
  showToolbar = true,
  editable = true,
  extensions = [],
  className,
  minHeight = '200px',
  maxHeight,
}: TipTapEditorProps) {
  const [autocompleteOpen, setAutocompleteOpen] = useState(false);
  const [autocompleteQuery, setAutocompleteQuery] = useState('');
  const [autocompletePosition, setAutocompletePosition] = useState<{ top: number; left: number } | undefined>();

  const editor = useEditor({
    extensions: [
      ...getDefaultExtensions(mode, placeholder),
      PlaceholderExtension,
      ...extensions,
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
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
      handleKeyDown: (view, event) => {
        const { state } = view;
        const { selection } = state;
        const { $from } = selection;
        const currentText = state.doc.textBetween(
          Math.max(0, $from.pos - 20),
          $from.pos,
          ''
        );

        // Check if user is typing {{
        if (event.key === '{') {
          const textBefore = currentText.slice(-1);
          if (textBefore === '{') {
            const rect = view.coordsAtPos($from.pos);
            setAutocompletePosition({
              top: rect.top + 20,
              left: rect.left,
            });
            setAutocompleteQuery('');
            setAutocompleteOpen(true);
            return false; // Allow the { to be inserted
          }
        }

        // Update query as user types after {{
        if (autocompleteOpen) {
          if (event.key === 'Escape') {
            setAutocompleteOpen(false);
            return true;
          }
          if (event.key === 'Enter' || event.key === 'Tab') {
            // Will be handled by autocomplete component
            return false;
          }
          // Update query for filtering
          if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
            const newQuery = autocompleteQuery + event.key;
            setAutocompleteQuery(newQuery);
            return false; // Allow normal typing
          }
        }

        return false;
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

  const handlePlaceholderSelect = useCallback(
    (placeholderName: string) => {
      if (!editor) return;

      const { state } = editor.view;
      const { selection } = state;
      const { $from } = selection;

      // Find the position of the last {{
      const textBefore = state.doc.textBetween(
        Math.max(0, $from.pos - 50),
        $from.pos,
        ''
      );
      const lastBraceIndex = textBefore.lastIndexOf('{{');

      if (lastBraceIndex !== -1) {
        const startPos = $from.pos - (textBefore.length - lastBraceIndex);
        const currentPos = $from.pos;
        const textAfter = state.doc.textBetween($from.pos, Math.min($from.pos + 10, state.doc.content.size), '');

        // Calculate what to replace ({{ and any typed characters)
        let endPos = currentPos;
        if (textAfter.startsWith('}}')) {
          endPos = currentPos + 2;
        } else {
          // Find where the placeholder name ends (before }} or space/newline)
          const match = textAfter.match(/^([^}\s\n]*)/);
          if (match) {
            endPos = currentPos + match[0].length;
          }
        }

        // Replace {{... with {{placeholderName}}
        editor
          .chain()
          .focus()
          .setTextSelection({ from: startPos, to: endPos })
          .insertContent(`{{${placeholderName}}}`, {
            parseOptions: {
              preserveWhitespace: 'full',
            },
          })
          .run();
      } else {
        // Just insert at cursor
        editor
          .chain()
          .focus()
          .insertContent(`{{${placeholderName}}}`)
          .run();
      }

      setAutocompleteOpen(false);
      setAutocompleteQuery('');
      onPlaceholderInsert?.(`{{${placeholderName}}}`);
    },
    [editor, onPlaceholderInsert]
  );

  if (!editor) {
    return (
      <div className={cn('border rounded-lg p-4', className)}>
        <div className="animate-pulse">Loading editor...</div>
      </div>
    );
  }

  return (
    <div className={cn('border rounded-lg bg-background', className)}>
      {showToolbar && (
        <TipTapToolbar
          editor={editor}
          placeholders={placeholderDefinitions}
          onPlaceholderInsert={onPlaceholderInsert}
        />
      )}
      <div className="relative">
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
        <PlaceholderAutocomplete
          placeholders={placeholderDefinitions}
          onSelect={handlePlaceholderSelect}
          query={autocompleteQuery}
          isOpen={autocompleteOpen}
          position={autocompletePosition}
          onClose={() => setAutocompleteOpen(false)}
        />
      </div>
    </div>
  );
}







