/**
 * Contact detail — GET /api/v1/shards/:id; edit via PUT; delete with confirm.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

const contactSchema = z.object({
  Name: z.string().min(1, 'Name is required'),
  Email: z.string().email('Invalid email').optional().or(z.literal('')),
});

type ContactFormData = z.infer<typeof contactSchema>;

interface ShardItem {
  id: string;
  shardTypeId: string;
  shardTypeName?: string;
  structuredData?: Record<string, unknown>;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function ContactDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : '';
  const [shard, setShard] = useState<ShardItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: { Name: '', Email: '' },
  });

  const fetchContact = useCallback(async () => {
    if (!id) return;
    const base = getApiBaseUrl();
    if (!base) {
      setLoading(false);
      setError('API base URL not configured');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/v1/shards/${id}`);
      if (!res.ok) {
        if (res.status === 404) setError('Contact not found');
        else throw new Error(res.statusText || 'Failed to load contact');
        setShard(null);
        return;
      }
      const data: ShardItem = await res.json();
      setShard(data);
      const sd = data.structuredData ?? {};
      reset({
        Name: (typeof sd.Name === 'string' ? sd.Name : '') || (typeof sd.name === 'string' ? sd.name : ''),
        Email: (typeof sd.Email === 'string' ? sd.Email : '') || (typeof sd.email === 'string' ? sd.email : ''),
      });
    } catch (e) {
      if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') console.error(e);
      setError(GENERIC_ERROR_MESSAGE);
      setShard(null);
    } finally {
      setLoading(false);
    }
  }, [id, reset]);

  useEffect(() => {
    fetchContact();
  }, [fetchContact]);

  useEffect(() => {
    if (id) document.title = `Contact ${id} | Castiel`;
    return () => { document.title = 'Castiel'; };
  }, [id]);

  const onSubmit = useCallback(
    async (data: ContactFormData) => {
      if (!shard) return;
      try {
        const body = {
          structuredData: {
            ...(shard.structuredData as Record<string, unknown> || {}),
            Name: data.Name.trim(),
            Email: data.Email?.trim() ?? '',
          },
        };
        const res = await apiFetch(`/api/v1/shards/${shard.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(res.statusText || 'Update failed');
        toast.success('Contact updated');
        setShard((prev) =>
          prev
            ? {
                ...prev,
                structuredData: { ...prev.structuredData, Name: data.Name.trim(), Email: data.Email?.trim() ?? '' },
              }
            : null
        );
        reset(data);
      } catch (e) {
        if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') console.error(e);
        toast.error(GENERIC_ERROR_MESSAGE);
      }
    },
    [shard, reset]
  );

  const handleDelete = async () => {
    if (!shard) return;
    setDeleting(true);
    try {
      const res = await apiFetch(`/api/v1/shards/${shard.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(res.statusText || 'Delete failed');
      toast.success('Contact deleted');
      setDeleteOpen(false);
      router.push('/contacts');
    } catch (e) {
      if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') console.error(e);
      toast.error(GENERIC_ERROR_MESSAGE);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-md">
        <Skeleton className="h-6 w-48 mb-4" />
        <Skeleton className="h-10 w-full mb-4" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (error && !shard) {
    return (
      <div className="p-6">
        <p className="text-destructive mb-4" role="alert">
          {error}
        </p>
        <Link href="/contacts">
          <Button variant="outline">Back to contacts</Button>
        </Link>
      </div>
    );
  }

  if (!shard) return null;

  return (
    <div className="p-6 max-w-md">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/contacts" className="text-sm font-medium hover:underline">
          ← Contacts
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-4">Contact</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="contact-name">Name (required)</Label>
          <Input
            id="contact-name"
            {...register('Name')}
            className="mt-1"
            aria-required
            aria-invalid={!!errors.Name}
          />
          {errors.Name && (
            <p className="text-sm text-destructive mt-1" role="alert">
              {errors.Name.message}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="contact-email">Email</Label>
          <Input
            id="contact-email"
            type="email"
            {...register('Email')}
            className="mt-1"
            aria-invalid={!!errors.Email}
          />
          {errors.Email && (
            <p className="text-sm text-destructive mt-1" role="alert">
              {errors.Email.message}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting || !isDirty}>
            {isSubmitting ? 'Saving…' : 'Save'}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          >
            Delete
          </Button>
          <Link href="/contacts">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
        </div>
      </form>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete contact</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this contact.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
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
