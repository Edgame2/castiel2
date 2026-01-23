'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Document, DocumentVisibility } from '@/types/documents';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { useDocuments } from '@/hooks/useDocuments';
import { trackException, trackTrace } from '@/lib/monitoring/app-insights';

// Validation schema
const editDocumentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must be less than 255 characters'),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
  category: z.string().optional(),
  tags: z.array(z.string()),
  visibility: z.enum(['public', 'internal', 'confidential']),
});

type EditDocumentFormData = z.infer<typeof editDocumentSchema>;

interface EditDocumentMetadataDialogProps {
  document: Document | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  availableCategories?: string[];
}

/**
 * Dialog for editing document metadata
 * Allows users to update name, description, category, tags, and visibility
 */
export function EditDocumentMetadataDialog({
  document,
  open,
  onOpenChange,
  onSuccess,
  availableCategories = [],
}: EditDocumentMetadataDialogProps) {
  const [tagInput, setTagInput] = useState('');
  const { updateDocument, isUpdatingDocument } = useDocuments();

  const form = useForm<EditDocumentFormData>({
    resolver: zodResolver(editDocumentSchema),
    defaultValues: {
      name: '',
      description: '',
      category: '',
      tags: [],
      visibility: 'internal',
    },
  });

  // Reset form when document changes or dialog opens
  useEffect(() => {
    if (document && open) {
      form.reset({
        name: document.name || '',
        description: document.description || '',
        category: document.category || '',
        tags: document.tags || [],
        visibility: document.visibility || 'internal',
      });
      setTagInput('');
    }
  }, [document, open, form]);

  const currentTags = form.watch('tags');

  const addTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !currentTags.includes(trimmedTag)) {
      form.setValue('tags', [...currentTags, trimmedTag], {
        shouldValidate: true,
        shouldDirty: true,
      });
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    form.setValue(
      'tags',
      currentTags.filter((t) => t !== tag),
      {
        shouldValidate: true,
        shouldDirty: true,
      }
    );
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const onSubmit = async (data: EditDocumentFormData) => {
    if (!document) return;

    try {
      await updateDocument({
        documentId: document.id,
        metadata: {
          name: data.name,
          description: data.description || undefined,
          category: data.category || undefined,
          tags: data.tags,
          visibility: data.visibility,
        },
      });

      toast.success('Document metadata updated successfully');
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 3)
      trackTrace('Update error', 3, {
        errorMessage: errorObj.message,
        documentId: document.id,
      })
      toast.error('Failed to update document metadata');
    }
  };

  if (!document) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Document Metadata</DialogTitle>
          <DialogDescription>
            Update the metadata for "{document.name}"
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Document Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter document name" {...field} />
                  </FormControl>
                  <FormDescription>
                    The display name for this document
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter a description for this document"
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional description of the document contents
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category */}
            {availableCategories.length > 0 && (
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {availableCategories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Categorize this document for easier organization
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Tags */}
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add a tag and press Enter"
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={handleTagInputKeyDown}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={addTag}
                        >
                          Add
                        </Button>
                      </div>
                      {currentTags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {currentTags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="flex items-center gap-1"
                            >
                              {tag}
                              <button
                                type="button"
                                onClick={() => removeTag(tag)}
                                className="ml-1 rounded-full hover:bg-gray-300 focus:outline-none"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormDescription>
                    Add tags to help organize and find this document
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Visibility */}
            <FormField
              control={form.control}
              name="visibility"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Visibility</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="internal">Internal</SelectItem>
                      <SelectItem value="confidential">Confidential</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Control who can access this document
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isUpdatingDocument}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdatingDocument}>
                {isUpdatingDocument ? 'Updating...' : 'Update Document'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}





