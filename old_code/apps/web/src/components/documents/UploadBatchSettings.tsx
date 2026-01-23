'use client';

import { useCallback, useMemo } from 'react';
import { Control, Controller } from 'react-hook-form';
import { DocumentMetadata } from '@/types/documents';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UploadBatchSettingsProps {
  control: Control<DocumentMetadata>;
  categories?: string[];
  visibility?: Array<{ value: string; label: string }>;
  onClear?: () => void;
  className?: string;
}

/**
 * Batch settings form for document upload
 * Allows configuration of metadata applied to all files in batch
 */
export function UploadBatchSettings({
  control,
  categories = ['General', 'Financial', 'HR', 'Legal', 'Technical'],
  visibility = [
    { value: 'public', label: 'Public' },
    { value: 'internal', label: 'Internal' },
    { value: 'confidential', label: 'Confidential' },
  ],
  onClear,
  className,
}: UploadBatchSettingsProps) {
  // Memoize selected values for dynamic rendering
  const memoizedVisibility = useMemo(() => visibility, [visibility]);
  const memoizedCategories = useMemo(() => categories, [categories]);

  return (
    <div
      className={cn(
        'space-y-6 rounded-lg border border-gray-200 bg-gray-50 p-6',
        className
      )}
    >
      <div>
        <h3 className="text-sm font-semibold text-gray-900">Batch Settings</h3>
        <p className="text-xs text-gray-500">
          Settings will be applied to all files in this upload
        </p>
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label htmlFor="category" className="text-sm font-medium">
          Category
        </Label>
        <Controller
          name="category"
          control={control}
          render={({ field }) => (
            <Select value={field.value || ''} onValueChange={field.onChange}>
              <SelectTrigger id="category" className="w-full">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {memoizedCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {/* Visibility */}
      <div className="space-y-2">
        <Label htmlFor="visibility" className="text-sm font-medium">
          Visibility
        </Label>
        <Controller
          name="visibility"
          control={control}
          render={({ field }) => (
            <Select value={field.value || 'internal'} onValueChange={field.onChange}>
              <SelectTrigger id="visibility" className="w-full">
                <SelectValue placeholder="Select visibility" />
              </SelectTrigger>
              <SelectContent>
                {memoizedVisibility.map((vis) => (
                  <SelectItem key={vis.value} value={vis.value}>
                    {vis.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <p className="text-xs text-gray-500">
          Controls who can access these documents
        </p>
      </div>

      {/* Tags */}
      <TagInput control={control} />

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description" className="text-sm font-medium">
          Description (Optional)
        </Label>
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <Textarea
              id="description"
              placeholder="Add notes about these documents..."
              className="min-h-20 resize-none text-sm"
              {...field}
              value={field.value || ''}
            />
          )}
        />
        <p className="text-xs text-gray-500">
          Description will be added to all uploaded documents
        </p>
      </div>

      {/* Clear button */}
      {onClear && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClear}
          className="w-full"
        >
          Clear All
        </Button>
      )}
    </div>
  );
}

/**
 * Tag input component for batch settings
 */
interface TagInputProps {
  control: Control<DocumentMetadata>;
}

function TagInput({ control }: TagInputProps) {
  return (
    <Controller
      name="tags"
      control={control}
      render={({ field }) => (
        <div className="space-y-2">
          <Label htmlFor="tag-input" className="text-sm font-medium">
            Tags (Optional)
          </Label>

          {/* Tag display */}
          {field.value && field.value.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {field.value.map((tag, index) => (
                <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                  {tag}
                  <button
                    type="button"
                    onClick={() => {
                      const updated = field.value.filter((_, i) => i !== index);
                      field.onChange(updated);
                    }}
                    className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-gray-300"
                    aria-label={`Remove tag ${tag}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {/* Tag input */}
          <TagInputField
            onAddTag={(tag) => {
              const current = field.value || [];
              if (tag && !current.includes(tag)) {
                field.onChange([...current, tag]);
              }
            }}
          />
          <p className="text-xs text-gray-500">
            Press Enter to add tags for better organization
          </p>
        </div>
      )}
    />
  );
}

/**
 * Input field for adding tags
 */
interface TagInputFieldProps {
  onAddTag: (tag: string) => void;
}

function TagInputField({ onAddTag }: TagInputFieldProps) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const value = (e.currentTarget as HTMLInputElement).value.trim();
        if (value) {
          onAddTag(value);
          (e.currentTarget as HTMLInputElement).value = '';
        }
      }
    },
    [onAddTag]
  );

  return (
    <Input
      id="tag-input"
      type="text"
      placeholder="Add tag and press Enter"
      onKeyDown={handleKeyDown}
      className="text-sm"
    />
  );
}
