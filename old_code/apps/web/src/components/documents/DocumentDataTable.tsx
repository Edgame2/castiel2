'use client';

import { useMemo, useState } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  getPaginationRowModel,
  ColumnFiltersState,
  getFilteredRowModel,
} from '@tanstack/react-table';
import { Document } from '@/types/documents';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DocumentRowActions } from './DocumentRowActions';
import { CategoryBadge } from './CategoryBadge';
import { VisibilityBadge } from './VisibilityBadge';
import { StatusBadge } from './StatusBadge';
import {
  formatDate,
  formatBytes,
  getMimeTypeIcon,
} from '@/lib/document-utils';
import { ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DocumentDataTableProps {
  documents: Document[];
  onView?: (doc: Document) => void;
  onDownload?: (doc: Document) => void;
  onShare?: (doc: Document) => void;
  onEdit?: (doc: Document) => void;
  onDelete?: (doc: Document) => void;
  onDuplicate?: (doc: Document) => void;
  onMove?: (doc: Document) => void;
  onSelectionChange?: (selectedDocs: Document[]) => void;
  className?: string;
}

/**
 * Data table component for document list view
 * Uses shadcn DataTable with sorting, filtering, and pagination
 */
export function DocumentDataTable({
  documents,
  onView,
  onDownload,
  onShare,
  onEdit,
  onDelete,
  onDuplicate,
  onMove,
  onSelectionChange,
  className,
}: DocumentDataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState({});

  // Define columns
  const columns = useMemo<ColumnDef<Document>[]>(
    () => [
      // Selection column
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      // Name column
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="h-8 px-2"
          >
            Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const Icon = getMimeTypeIcon(row.original.mimeType);
          return (
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-gray-500" />
              <span className="font-medium">{row.getValue('name')}</span>
            </div>
          );
        },
      },
      // Category column
      {
        accessorKey: 'category',
        header: 'Category',
        cell: ({ row }) => {
          const category = row.getValue('category') as string | undefined;
          return category ? <CategoryBadge category={category} /> : null;
        },
      },
      // Visibility column
      {
        accessorKey: 'visibility',
        header: 'Visibility',
        cell: ({ row }) => (
          <VisibilityBadge visibility={row.getValue('visibility')} />
        ),
      },
      // Status column
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.getValue('status')} />,
      },
      // Size column
      {
        accessorKey: 'fileSize',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="h-8 px-2"
          >
            Size
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="text-sm text-gray-600">
            {formatBytes(row.getValue('fileSize'))}
          </span>
        ),
      },
      // Created date column
      {
        accessorKey: 'createdAt',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="h-8 px-2"
          >
            Created
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="text-sm text-gray-600">
            {formatDate(row.getValue('createdAt'))}
          </span>
        ),
      },
      // Actions column
      {
        id: 'actions',
        cell: ({ row }) => (
          <DocumentRowActions
            document={row.original}
            onView={onView}
            onDownload={onDownload}
            onShare={onShare}
            onEdit={onEdit}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
            onMove={onMove}
          />
        ),
      },
    ],
    [onView, onDownload, onShare, onEdit, onDelete, onDuplicate, onMove]
  );

  // Initialize table
  const table = useReactTable({
    data: documents,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      rowSelection,
    },
  });

  // Notify parent of selection changes
  useMemo(() => {
    if (onSelectionChange) {
      const selectedRows = table.getFilteredSelectedRowModel().rows;
      onSelectionChange(selectedRows.map((row) => row.original));
    }
  }, [rowSelection, table, onSelectionChange]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onView?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  No documents found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-2">
        <div className="text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{' '}
          {table.getFilteredRowModel().rows.length} row(s) selected
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <div className="text-sm text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of{' '}
            {table.getPageCount()}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
