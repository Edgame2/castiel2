/**
 * Placeholder Extension for TipTap
 * Handles {{placeholder}} syntax with visual badges
 */

import { Mark, mergeAttributes } from '@tiptap/core';

export interface PlaceholderOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    placeholder: {
      /**
       * Set a placeholder mark
       */
      setPlaceholder: (name: string) => ReturnType;
      /**
       * Toggle a placeholder mark
       */
      togglePlaceholder: (name: string) => ReturnType;
      /**
       * Unset a placeholder mark
       */
      unsetPlaceholder: () => ReturnType;
    };
  }
}

export const PlaceholderExtension = Mark.create<PlaceholderOptions>({
  name: 'placeholder',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      name: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-placeholder'),
        renderHTML: (attributes) => {
          if (!attributes.name) {
            return {};
          }
          return {
            'data-placeholder': attributes.name,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-placeholder]',
        getAttrs: (node) => {
          if (typeof node === 'string') return false;
          const name = (node as HTMLElement).getAttribute('data-placeholder');
          return name ? { name } : false;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(
        this.options.HTMLAttributes,
        HTMLAttributes,
        {
          class: 'inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary font-mono text-sm border border-primary/20',
        }
      ),
      0,
    ];
  },

  addCommands() {
    return {
      setPlaceholder:
        (name: string) =>
        ({ commands }) => {
          return commands.setMark(this.name, { name });
        },
      togglePlaceholder:
        (name: string) =>
        ({ commands }) => {
          return commands.toggleMark(this.name, { name });
        },
      unsetPlaceholder:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
    };
  },
});







