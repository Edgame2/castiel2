"use client"

import { useEffect, useState, useRef } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import type { PlaceholderDefinition } from '@/types/email-template';
import { cn } from '@/lib/utils';

interface PlaceholderAutocompleteProps {
  placeholders: PlaceholderDefinition[];
  onSelect: (placeholder: string) => void;
  query: string;
  isOpen: boolean;
  position?: { top: number; left: number };
  onClose: () => void;
}

export function PlaceholderAutocomplete({
  placeholders,
  onSelect,
  query,
  isOpen,
  position,
  onClose,
}: PlaceholderAutocompleteProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const filteredPlaceholders = placeholders.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filteredPlaceholders.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredPlaceholders[selectedIndex]) {
          onSelect(filteredPlaceholders[selectedIndex].name);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredPlaceholders, onSelect, onClose]);

  if (!isOpen || filteredPlaceholders.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed z-50 min-w-[200px] rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
      style={{
        top: position?.top || 0,
        left: position?.left || 0,
      }}
    >
      <Command>
        <CommandInput placeholder="Search placeholders..." value={query} />
        <CommandList>
          <CommandEmpty>No placeholders found.</CommandEmpty>
          <CommandGroup>
            {filteredPlaceholders.map((placeholder, index) => (
              <CommandItem
                key={placeholder.name}
                value={placeholder.name}
                onSelect={() => onSelect(placeholder.name)}
                className={cn(
                  'cursor-pointer',
                  index === selectedIndex && 'bg-accent'
                )}
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono">{`{{${placeholder.name}}}`}</code>
                    {placeholder.required && (
                      <Badge variant="destructive" className="text-xs">
                        Required
                      </Badge>
                    )}
                  </div>
                  {placeholder.description && (
                    <span className="text-xs text-muted-foreground">
                      {placeholder.description}
                    </span>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  );
}







