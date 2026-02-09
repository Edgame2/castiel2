/**
 * CompleteRemediationStepModal – complete a remediation step (Plan §6.3, §937).
 * POST /api/v1/remediation-workflows/:id/steps/:stepNumber/complete.
 * Auth via getHeaders from parent; no hardcoded URLs.
 */

'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type CompleteRemediationStepModalProps = {
  isOpen: boolean;
  onClose: () => void;
  workflowId: string;
  stepNumber: number;
  stepDescription: string;
  onSubmitted?: () => void;
  /** Optional. If not set, uses relative /api/v1/... (rewrites to gateway). */
  apiBaseUrl?: string;
  /** Optional. Parent provides auth headers; if omitted, credentials: 'same-origin' is used. */
  getHeaders?: () => HeadersInit | Promise<HeadersInit>;
};

export function CompleteRemediationStepModal({
  isOpen,
  onClose,
  workflowId,
  stepNumber,
  stepDescription,
  onSubmitted,
  apiBaseUrl = '',
  getHeaders,
}: CompleteRemediationStepModalProps) {
  const [completedBy, setCompletedBy] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const base = apiBaseUrl.replace(/\/$/, '');
  const url = `${base}/api/v1/remediation-workflows/${workflowId}/steps/${stepNumber}/complete`;

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setError(null);
        setCompletedBy('');
        onClose();
      }
    },
    [onClose]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setLoading(true);
      try {
        const headers: HeadersInit = {};
        if (getHeaders) {
          const h = await Promise.resolve(getHeaders());
          Object.assign(headers, h);
        }
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
          body: JSON.stringify(completedBy.trim() ? { completedBy: completedBy.trim() } : {}),
          credentials: getHeaders ? undefined : ('same-origin' as RequestCredentials),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
        }
        setCompletedBy('');
        onSubmitted?.();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    },
    [url, completedBy, getHeaders, onSubmitted, onClose]
  );

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-white p-4 shadow-lg dark:bg-gray-900 dark:border-gray-700">
          <Dialog.Title className="text-sm font-semibold">Complete step {stepNumber}</Dialog.Title>
          <Dialog.Description className="text-xs text-gray-500 mt-1">{stepDescription}</Dialog.Description>
          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <Label className="text-xs">Completed by (optional)</Label>
            <Input
              type="text"
              value={completedBy}
              onChange={(e) => setCompletedBy(e.target.value)}
              placeholder="Leave empty to use current user"
              className="w-full"
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <Dialog.Close asChild>
                <Button type="button" variant="outline" size="sm">
                  Cancel
                </Button>
              </Dialog.Close>
              <Button type="submit" disabled={loading} size="sm">
                {loading ? 'Submitting…' : 'Complete'}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
