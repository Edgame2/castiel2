/**
 * TipTap Extensions Configuration
 */

import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import CodeBlock from '@tiptap/extension-code-block';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import TextAlign from '@tiptap/extension-text-align';
import type { Extension } from '@tiptap/core';
import type { EditorMode } from '@/types/editor.types';

/**
 * Get default extensions for the editor
 */
export function getDefaultExtensions(
  mode: EditorMode = 'default',
  placeholder?: string
): Extension[] {
  const extensions: Extension[] = [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3, 4, 5, 6],
      },
      codeBlock: false, // We'll add it separately with custom config
      horizontalRule: {},
      blockquote: {},
      hardBreak: {},
    }),
    Placeholder.configure({
      placeholder: placeholder || 'Start typing...',
    }),
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        class: 'text-primary underline underline-offset-4 hover:text-primary/80',
      },
    }) as any as Extension,
    Image.configure({
      HTMLAttributes: {
        class: 'max-w-full h-auto rounded-lg',
      },
    }) as any as Extension,
    Table.configure({
      resizable: true,
      HTMLAttributes: {
        class: 'border-collapse border border-border',
      },
    }) as any as Extension,
    TableRow.configure({
      HTMLAttributes: {
        class: 'border-b border-border',
      },
    }) as any as Extension,
    TableCell.configure({
      HTMLAttributes: {
        class: 'border border-border px-4 py-2',
      },
    }) as any as Extension,
    TableHeader.configure({
      HTMLAttributes: {
        class: 'border border-border px-4 py-2 bg-muted font-semibold',
      },
    }) as any as Extension,
    CodeBlock.configure({
      HTMLAttributes: {
        class: 'bg-muted p-4 rounded-lg font-mono text-sm',
      },
    }) as any as Extension,
    TextStyle as any as Extension,
    Color as any as Extension,
    Underline as any as Extension,
    TextAlign.configure({
      types: ['heading', 'paragraph'],
    }) as any as Extension,
  ];

  // Email mode specific configurations
  if (mode === 'email') {
    // Email mode uses inline styles and table-based layouts
    // The extensions are already configured for email-safe HTML
    // Additional email-specific processing can be done in the rendering phase
  }

  // Plain mode - minimal formatting
  if (mode === 'plain') {
    // Remove rich formatting extensions for plain text mode
    return [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        horizontalRule: false,
        blockquote: false,
        hardBreak: {},
      }),
      Placeholder.configure({
        placeholder: placeholder || 'Start typing...',
      }),
    ];
  }

  return extensions;
}







