/**
 * Contacts list — GET /api/v1/shards?shardTypeName=c_contact
 * Data table: first column clickable → /contacts/[id]; Actions: Edit, Delete (AlertDialog + toast).
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { apiFetch, getApiBaseUrl, GENERIC_ERROR_MESSAGE } from '@/lib/api';
import { toast } from 'sonner';

interface ShardItem {
  id: string;
  shardTypeName?: string;
  structuredData?: Record<string, unknown>;
  createdAt?: string;
  status?: string;
}

interface ListResponse {
  items?: ShardItem[];
  continuationToken?: string;
}

function getContactDisplayName(row: ShardItem): string {
  const sd = row.structuredData;
  if (sd && typeof sd.Name === 'string') return sd.Name;
  if (sd && typeof sd.name === 'string') return sd.name;
  if (sd && typeof sd.Email === 'string') return sd.Email;
  if (sd && typeof sd.email === 'string') return sd.email;
  return row.id;
}

export default function ContactsListPage() {
  const [items, setItems] = useState<ShardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchContacts = useCallback(async () => {
    const base = getApiBaseUrl();
    if (!base) {
      setLoading(false);
      setError('API base URL not configured');
      return;
    }
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    params.set('shardTypeName', 'c_contact');
    params.set('limit', '100');
    try {
      const res = await apiFetch(`/api/v1/shards?${params.toString()}`);
      if (!res.ok) throw new Error(res.statusText || 'Failed to load contacts');
      const data: ListResponse = await res.json();
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') console.error(e);
      setError(GENERIC_ERROR_MESSAGE);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  useEffect(() => {
    document.title = 'Contacts | Castiel';
    return () => { document.title = 'Castiel'; };
  }, []);

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await apiFetch(`/api/v1/shards/${deleteId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(res.statusText || 'Delete failed');
      toast.success('Contact deleted');
      setDeleteId(null);
      await fetchContacts();
    } catch (e) {
      if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') console.error(e);
      toast.error(GENERIC_ERROR_MESSAGE);
    } finally {
      setDeleting(false);
    }
  };

  const filtered = items.filter((row) => {
    const name = getContactDisplayName(row).toLowerCase();
    const id = row.id.toLowerCase();
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return name.includes(q) || id.includes(q);
  });

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Contacts</h1>
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Contacts</h1>
        <div className="flex gap-2">
          <Link href="/contacts/new">
            <Button>New contact</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline" size="sm">Dashboard</Button>
          </Link>
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive mb-4" role="alert">
          {error}
        </p>
      )}

      <div className="mb-4">
        <Input
          placeholder="Search by name or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
          aria-label="Search contacts"
        />
      </div>

      {!error && filtered.length === 0 && (
        <p className="text-muted-foreground">No contacts found.</p>
      )}

      {!error && filtered.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <Link
                    href={`/contacts/${row.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {getContactDisplayName(row)}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{row.id}</TableCell>
                <TableCell>{row.status ?? '—'}</TableCell>
                <TableCell className="text-right">
                  <Link href={`/contacts/${row.id}`}>
                    <Button variant="ghost" size="sm">Edit</Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => setDeleteId(row.id)}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete contact</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the contact.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDeleteConfirm(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
