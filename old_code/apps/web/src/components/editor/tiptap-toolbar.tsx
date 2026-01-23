"use client"

import { useCallback } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Link,
  Image as ImageIcon,
  Table,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Code2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { Editor } from '@tiptap/react';
import type { PlaceholderDefinition } from '@/types/email-template';

interface TipTapToolbarProps {
  editor: Editor;
  placeholders?: PlaceholderDefinition[];
  onPlaceholderInsert?: (placeholder: string) => void;
}

export function TipTapToolbar({ editor, placeholders = [], onPlaceholderInsert }: TipTapToolbarProps) {
  const setLink = useCallback(() => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    if (url === null) {
      return;
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const setImage = useCallback(() => {
    const url = window.prompt('Image URL' as any);

    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  const addTable = useCallback(() => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }, [editor]);

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-muted/50">
      {/* Text Formatting */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={cn(editor.isActive('bold') && 'bg-accent')}
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={cn(editor.isActive('italic') && 'bg-accent')}
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        disabled={!editor.can().chain().focus().toggleUnderline().run()}
        className={cn(editor.isActive('underline') && 'bg-accent')}
      >
        <Underline className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        disabled={!editor.can().chain().focus().toggleStrike().run()}
        className={cn(editor.isActive('strike') && 'bg-accent')}
      >
        <Strikethrough className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleCode().run()}
        disabled={!editor.can().chain().focus().toggleCode().run()}
        className={cn(editor.isActive('code') && 'bg-accent')}
      >
        <Code className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6" />

      {/* Headings */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <Heading1 className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          >
            <Heading1 className="mr-2 h-4 w-4" />
            Heading 1
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            <Heading2 className="mr-2 h-4 w-4" />
            Heading 2
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          >
            <Heading3 className="mr-2 h-4 w-4" />
            Heading 3
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Separator orientation="vertical" className="h-6" />

      {/* Lists */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={cn(editor.isActive('bulletList') && 'bg-accent')}
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={cn(editor.isActive('orderedList') && 'bg-accent')}
      >
        <ListOrdered className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={cn(editor.isActive('blockquote') && 'bg-accent')}
      >
        <Quote className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6" />

      {/* Alignment */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        className={cn(editor.isActive({ textAlign: 'left' }) && 'bg-accent')}
      >
        <AlignLeft className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        className={cn(editor.isActive({ textAlign: 'center' }) && 'bg-accent')}
      >
        <AlignCenter className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        className={cn(editor.isActive({ textAlign: 'right' }) && 'bg-accent')}
      >
        <AlignRight className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().setTextAlign('justify').run()}
        className={cn(editor.isActive({ textAlign: 'justify' }) && 'bg-accent')}
      >
        <AlignJustify className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6" />

      {/* Media */}
      <Button variant="ghost" size="sm" onClick={setLink}>
        <Link className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={setImage}>
        <ImageIcon className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={addTable}>
        <Table className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6" />

      {/* Placeholder Insert */}
      {placeholders.length > 0 && (
        <>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm">
                <Code2 className="h-4 w-4" />
                <span className="ml-1">Placeholder</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="start">
              <div className="max-h-64 overflow-y-auto">
                {placeholders.map((placeholder) => (
                  <button
                    key={placeholder.name}
                    type="button"
                    onClick={() => {
                      editor.chain().focus().insertContent(`{{${placeholder.name}}}`).run();
                      onPlaceholderInsert?.(`{{${placeholder.name}}}`);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground flex items-center justify-between"
                  >
                    <div>
                      <code className="text-xs font-mono">{`{{${placeholder.name}}}`}</code>
                      {placeholder.description && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {placeholder.description}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <Separator orientation="vertical" className="h-6" />
        </>
      )}

      {/* History */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().chain().focus().undo().run()}
      >
        <Undo className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().chain().focus().redo().run()}
      >
        <Redo className="h-4 w-4" />
      </Button>
    </div>
  );
}







