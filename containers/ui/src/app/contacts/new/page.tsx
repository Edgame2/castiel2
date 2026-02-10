/**
 * Create contact — POST /api/v1/shards with shard type c_contact.
 * Resolves shardTypeId via GET /api/v1/admin/shard-types (find name c_contact).
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch, getApiBaseUrl, GENERIC_ERROR_MESSAGE } from '@/lib/api';
import { toast } from 'sonner';

const contactSchema = z.object({
  Name: z.string().min(1, 'Name is required'),
  Email: z.string().email('Invalid email').optional().or(z.literal('')),
});

type ContactFormData = z.infer<typeof contactSchema>;

interface ShardTypeItem {
  id: string;
  name?: string;
}

interface ShardTypesResponse {
  shardTypes?: ShardTypeItem[];
}

export default function NewContactPage() {
  const router = useRouter();
  const [shardTypeId, setShardTypeId] = useState<string | null>(null);
  const [typeLoading, setTypeLoading] = useState(true);
  const [typeError, setTypeError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: { Name: '', Email: '' },
  });

  useEffect(() => {
    document.title = 'New contact | Castiel';
    return () => { document.title = 'Castiel'; };
  }, []);

  useEffect(() => {
    const base = getApiBaseUrl();
    if (!base) {
      setTypeLoading(false);
      setTypeError('API base URL not configured');
      return;
    }
    apiFetch('/api/v1/admin/shard-types?limit=200')
      .then((r) => {
        if (!r.ok) throw new Error(r.statusText || 'Failed to load shard types');
        return r.json();
      })
      .then((data: ShardTypesResponse) => {
        const list = Array.isArray(data.shardTypes) ? data.shardTypes : [];
        const cContact = list.find((t) => t.name === 'c_contact');
        setShardTypeId(cContact?.id ?? null);
        if (!cContact) setTypeError('Contact type (c_contact) not found. Ask an admin to configure shard types.');
      })
      .catch((e) => {
        if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') console.error(e);
        setTypeError(GENERIC_ERROR_MESSAGE);
      })
      .finally(() => setTypeLoading(false));
  }, []);

  const onSubmit = useCallback(
    async (data: ContactFormData) => {
      if (!shardTypeId) {
        toast.error('Contact type not available');
        return;
      }
      const base = getApiBaseUrl();
      if (!base) {
        toast.error('API base URL not configured');
        return;
      }
      try {
        const body = {
          shardTypeId,
          shardTypeName: 'c_contact',
          structuredData: {
            Name: data.Name.trim(),
            ...(data.Email?.trim() ? { Email: data.Email.trim() } : {}),
          },
        };
        const res = await apiFetch('/api/v1/shards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as { message?: string }).message || res.statusText || 'Create failed');
        }
        const created = await res.json();
        toast.success('Contact created');
        router.push(`/contacts/${created.id}`);
      } catch (e) {
        if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') console.error(e);
        toast.error(GENERIC_ERROR_MESSAGE);
      }
    },
    [shardTypeId, router]
  );

  if (typeLoading) {
    return (
      <div className="p-6 max-w-md">
        <h1 className="text-2xl font-bold mb-4">New contact</h1>
        <Skeleton className="h-10 w-full mb-4" />
        <Skeleton className="h-10 w-full mb-4" />
      </div>
    );
  }

  if (typeError || !shardTypeId) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">New contact</h1>
        <p className="text-destructive mb-4" role="alert">
          {typeError ?? 'Contact type not configured'}
        </p>
        <Link href="/contacts">
          <Button variant="outline">Back to contacts</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-md">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/contacts" className="text-sm font-medium hover:underline">
          ← Contacts
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-4">New contact</h1>
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
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating…' : 'Create contact'}
          </Button>
          <Link href="/contacts">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
