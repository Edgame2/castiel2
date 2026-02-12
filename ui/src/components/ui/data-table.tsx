/**
 * Shared data table for list pages. Per requirements: first column links to detail,
 * last column is Actions (Edit/Delete). Use with Skeleton for loading and EmptyState for empty.
 */

import * as React from 'react';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';

export interface DataTableColumn<T> {
  id: string;
  header: string;
  cell: (row: T) => React.ReactNode;
}

export interface DataTableProps<T> {
  /** Column definitions (first = primary, last = actions if present) */
  columns: DataTableColumn<T>[];
  data: T[];
  getRowId: (row: T) => string;
  /** When true, show skeleton rows instead of data */
  isLoading?: boolean;
  /** First column: link to detail page (e.g. /resources/[id]) */
  firstColumnHref?: (row: T) => string;
  /** Last column: actions (Edit, Delete). Render buttons/dropdown here. */
  actionsColumn?: (row: T) => React.ReactNode;
  /** Shown when !isLoading && data.length === 0 */
  emptyTitle: string;
  emptyDescription?: string;
  emptyAction?: { label: string; href: string };
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  getRowId,
  isLoading = false,
  firstColumnHref,
  actionsColumn,
  emptyTitle,
  emptyDescription,
  emptyAction,
  className,
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className={cn('rounded-lg border', className)}>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.id}>{col.header}</TableHead>
              ))}
              {actionsColumn && <TableHead className="w-[100px]">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3].map((i) => (
              <TableRow key={i}>
                {columns.map((col) => (
                  <TableCell key={col.id}>
                    <Skeleton className="h-5 w-full max-w-[120px]" />
                  </TableCell>
                ))}
                {actionsColumn && (
                  <TableCell>
                    <Skeleton className="h-8 w-16" />
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
        className={className}
      />
    );
  }

  return (
    <div className={cn('rounded-lg border', className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col.id}>{col.header}</TableHead>
            ))}
            {actionsColumn && <TableHead className="w-[100px]">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => {
            const id = getRowId(row);
            const firstCol = columns[0];
            const firstContent = firstCol?.cell(row);
            const firstHref = firstColumnHref?.(row);

            return (
              <TableRow key={id}>
                {columns.map((col, idx) => {
                  const isFirst = idx === 0;
                  const content = col.cell(row);
                  const href = isFirst && firstHref ? firstHref : undefined;

                  return (
                    <TableCell key={col.id}>
                      {href != null ? (
                        <Link
                          href={href}
                          className="font-medium text-primary hover:underline"
                        >
                          {content}
                        </Link>
                      ) : (
                        content
                      )}
                    </TableCell>
                  );
                })}
                {actionsColumn && (
                  <TableCell>{actionsColumn(row)}</TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
