/**
 * TipTap Editor Types
 */

import type { Extension } from '@tiptap/core';
import type { PlaceholderDefinition } from './email-template';

export type EditorMode = 'default' | 'email' | 'plain';

export interface TipTapEditorProps {
  content: string | object;
  onChange: (content: string | object) => void;
  outputFormat?: 'html' | 'json';
  placeholder?: string;
  mode?: EditorMode;
  placeholderDefinitions?: PlaceholderDefinition[];
  onPlaceholderInsert?: (placeholder: string) => void;
  showToolbar?: boolean;
  editable?: boolean;
  extensions?: Extension[];
  className?: string;
  minHeight?: string;
  maxHeight?: string;
}

export interface PlaceholderAutocompleteProps {
  placeholders: PlaceholderDefinition[];
  onSelect: (placeholder: string) => void;
  query: string;
  isOpen: boolean;
  position?: { top: number; left: number };
}







