'use client';

import { useCallback, useMemo } from 'react';
import { DocumentFilters, DocumentStatus, DocumentVisibility } from '@/types/documents';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Search, X, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DocumentFilterPanelProps {
  filters: DocumentFilters;
  onFiltersChange: (filters: DocumentFilters) => void;
  categories?: string[];
  availableTags?: string[];
  className?: string;
}

/**
 * Filter panel component for document filtering
 * Provides search, category, visibility, status, and date range filtering
 */
export function DocumentFilterPanel({
  filters,
  onFiltersChange,
  categories = ['General', 'Financial', 'HR', 'Legal', 'Technical'],
  availableTags = [],
  className,
}: DocumentFilterPanelProps) {
  // Memoize filter options
  const visibilityOptions = useMemo(
    () => [
      { value: 'public', label: 'Public' },
      { value: 'internal', label: 'Internal' },
      { value: 'confidential', label: 'Confidential' },
    ],
    []
  );

  const statusOptions = useMemo(
    () => [
      { value: 'active', label: 'Active' },
      { value: 'deleted', label: 'Deleted' },
      { value: 'quarantined', label: 'Quarantined' },
      { value: 'scan_failed', label: 'Scan Failed' },
    ],
    []
  );

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.searchQuery) count++;
    if (filters.category) count++;
    if (filters.visibility && filters.visibility.length > 0) count++;
    if (filters.status && filters.status.length > 0) count++;
    if (filters.tags && filters.tags.length > 0) count++;
    if (filters.dateFrom || filters.dateTo) count++;
    return count;
  }, [filters]);

  // Handle search query change
  const handleSearchChange = useCallback(
    (query: string) => {
      onFiltersChange({ ...filters, searchQuery: query });
    },
    [filters, onFiltersChange]
  );

  // Handle category change
  const handleCategoryChange = useCallback(
    (category: string) => {
      onFiltersChange({
        ...filters,
        category: category || undefined,
      });
    },
    [filters, onFiltersChange]
  );

  // Handle visibility toggle
  const handleVisibilityChange = useCallback(
    (visibility: string | DocumentVisibility, checked: boolean) => {
      const current = filters.visibility || [];
      const currentArray = Array.isArray(current) ? current : current ? [current] : [];
      const updated = checked
        ? [...currentArray, visibility]
        : currentArray.filter((v) => v !== visibility);

      onFiltersChange({
        ...filters,
        visibility: (updated.length > 0 ? updated : undefined) as any,
      });
    },
    [filters, onFiltersChange]
  );

  // Handle status toggle
  const handleStatusChange = useCallback(
    (status: DocumentStatus, checked: boolean) => {
      const current = filters.status || [];
      const updated = checked
        ? [...current, status]
        : current.filter((s) => s !== status);

      onFiltersChange({
        ...filters,
        status: updated.length > 0 ? (updated as DocumentStatus[]) : undefined,
      });
    },
    [filters, onFiltersChange]
  );

  // Handle tag toggle
  const handleTagChange = useCallback(
    (tag: string, checked: boolean) => {
      const current = filters.tags || [];
      const updated = checked
        ? [...current, tag]
        : current.filter((t) => t !== tag);

      onFiltersChange({
        ...filters,
        tags: updated.length > 0 ? updated : undefined,
      });
    },
    [filters, onFiltersChange]
  );

  // Handle date range change
  const handleDateFromChange = useCallback(
    (date: string) => {
      onFiltersChange({
        ...filters,
        dateFrom: date || undefined,
      });
    },
    [filters, onFiltersChange]
  );

  const handleDateToChange = useCallback(
    (date: string) => {
      onFiltersChange({
        ...filters,
        dateTo: date || undefined,
      });
    },
    [filters, onFiltersChange]
  );

  // Handle reset filters
  const handleResetFilters = useCallback(() => {
    onFiltersChange({});
  }, [onFiltersChange]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search */}
      <div className="space-y-2">
        <Label htmlFor="search" className="text-xs font-semibold">
          Search
        </Label>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            id="search"
            type="text"
            placeholder="Document name..."
            value={filters.searchQuery || ''}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
      </div>

      {/* Accordion sections */}
      <Accordion
        type="multiple"
        defaultValue={['category', 'visibility']}
        className="w-full"
      >
          {/* Category */}
          <AccordionItem value="category">
            <AccordionTrigger className="text-xs font-semibold text-gray-700">
              Category
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                <Select
                  value={filters.category || 'all'}
                  onValueChange={(value) =>
                    handleCategoryChange(value === 'all' ? '' : value)
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Visibility */}
          <AccordionItem value="visibility">
            <AccordionTrigger className="text-xs font-semibold text-gray-700">
              Visibility
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                {visibilityOptions.map((vis) => (
                  <label
                    key={vis.value}
                    className="flex items-center gap-2 text-xs cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={(() => {
                        const visArray = Array.isArray(filters.visibility) ? filters.visibility : filters.visibility ? [filters.visibility] : [];
                        return visArray.includes(vis.value as DocumentVisibility);
                      })()}
                      onChange={(e) =>
                        handleVisibilityChange(vis.value as DocumentVisibility, e.target.checked)
                      }
                      className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600"
                    />
                    <span>{vis.label}</span>
                  </label>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Status */}
          <AccordionItem value="status">
            <AccordionTrigger className="text-xs font-semibold text-gray-700">
              Status
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                {statusOptions.map((status) => (
                  <label
                    key={status.value}
                    className="flex items-center gap-2 text-xs cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={(filters.status || []).includes(
                        status.value as DocumentStatus
                      )}
                      onChange={(e) =>
                        handleStatusChange(
                          status.value as DocumentStatus,
                          e.target.checked
                        )
                      }
                      className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600"
                    />
                    <span>{status.label}</span>
                  </label>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Tags */}
          {availableTags.length > 0 && (
            <AccordionItem value="tags">
              <AccordionTrigger className="text-xs font-semibold text-gray-700">
                Tags
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {availableTags.slice(0, 10).map((tag) => (
                    <label
                      key={tag}
                      className="flex items-center gap-2 text-xs cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={(filters.tags || []).includes(tag)}
                        onChange={(e) =>
                          handleTagChange(tag, e.target.checked)
                        }
                        className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600"
                      />
                      <span>{tag}</span>
                    </label>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Date Range */}
          <AccordionItem value="date">
            <AccordionTrigger className="text-xs font-semibold text-gray-700">
              Date Range
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                <div>
                  <Label htmlFor="date-from" className="text-xs">
                    From
                  </Label>
                  <Input
                    id="date-from"
                    type="date"
                    value={filters.dateFrom ? (typeof filters.dateFrom === 'string' ? filters.dateFrom : filters.dateFrom.toISOString().split('T')[0]) : ''}
                    onChange={(e) => handleDateFromChange(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label htmlFor="date-to" className="text-xs">
                    To
                  </Label>
                  <Input
                    id="date-to"
                    type="date"
                    value={filters.dateTo ? (typeof filters.dateTo === 'string' ? filters.dateTo : filters.dateTo.toISOString().split('T')[0]) : ''}
                    onChange={(e) => handleDateToChange(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
    </div>
  );
}
