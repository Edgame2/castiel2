/**
 * CreateRemediationWorkflowModal – select risks and actions (Plan §6.3, §598, §937).
 * Fetches GET /api/v1/opportunities/:id/mitigation-actions; POST /api/v1/remediation-workflows.
 * No hardcoded URLs; auth via getHeaders from parent.
 */

'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { useState, useCallback, useEffect } from 'react';

type MitigationAction = {
  id: string;
  actionId: string;
  title: string;
  description?: string;
  estimatedEffort?: string;
};

export type CreateRemediationWorkflowModalProps = {
  isOpen: boolean;
  onClose: () => void;
  opportunityId: string;
  onCreated?: () => void;
  apiBaseUrl?: string;
  getHeaders?: () => HeadersInit | Promise<HeadersInit>;
};

export function CreateRemediationWorkflowModal({
  isOpen,
  onClose,
  opportunityId,
  onCreated,
  apiBaseUrl = '',
  getHeaders,
}: CreateRemediationWorkflowModalProps) {
  const [actions, setActions] = useState<MitigationAction[]>([]);
  const [actionsLoading, setActionsLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [customSteps, setCustomSteps] = useState<{ description: string }[]>([]);
  const [riskId, setRiskId] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [customInput, setCustomInput] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const base = apiBaseUrl.replace(/\/$/, '');
  const actionsUrl = `${base}/api/v1/opportunities/${opportunityId}/mitigation-actions`;
  const createUrl = `${base}/api/v1/remediation-workflows`;

  const doFetch = useCallback(async () => {
    const headers: HeadersInit = getHeaders ? await Promise.resolve(getHeaders()) : {};
    return { headers, credentials: getHeaders ? undefined : ('same-origin' as RequestCredentials) };
  }, [getHeaders]);

  useEffect(() => {
    if (!isOpen || !opportunityId) return;
    setActionsLoading(true);
    setError(null);
    (async () => {
      try {
        const { headers, credentials } = await doFetch();
        const res = await fetch(actionsUrl, { headers, credentials });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
        }
        const json = (await res.json()) as { actions?: MitigationAction[] };
        setActions(Array.isArray(json?.actions) ? json.actions : []);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setActions([]);
      } finally {
        setActionsLoading(false);
      }
    })();
  }, [isOpen, opportunityId, actionsUrl, doFetch]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setSelectedIds([]);
        setCustomSteps([]);
        setRiskId('');
        setAssignedTo('');
        setCustomInput('');
        setError(null);
        onClose();
      }
    },
    [onClose]
  );

  const toggleAction = (actionId: string) => {
    setSelectedIds((prev) =>
      prev.includes(actionId) ? prev.filter((x) => x !== actionId) : [...prev, actionId]
    );
  };

  const addCustom = () => {
    const d = customInput.trim();
    if (!d) return;
    setCustomSteps((prev) => [...prev, { description: d }]);
    setCustomInput('');
  };

  const removeCustom = (i: number) => {
    setCustomSteps((prev) => prev.filter((_, j) => j !== i));
  };

  const steps = selectedIds
    .map((id) => {
      const a = actions.find((x) => x.actionId === id);
      return { actionId: id, description: a?.title || a?.description || id, estimatedEffort: a?.estimatedEffort };
    })
    .concat(customSteps.map((c) => ({ actionId: 'custom', description: c.description, estimatedEffort: undefined as string | undefined })));

  const canSubmit = steps.length >= 1 && !submitLoading;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!canSubmit) return;
      setError(null);
      setSubmitLoading(true);
      try {
        const { headers, credentials } = await doFetch();
        const res = await fetch(createUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify({
            opportunityId,
            riskId: riskId.trim() || undefined,
            assignedTo: assignedTo.trim() || undefined,
            steps,
          }),
          credentials,
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
        }
        onCreated?.();
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setSubmitLoading(false);
      }
    },
    [canSubmit, createUrl, opportunityId, riskId, assignedTo, steps, doFetch, onCreated, onClose]
  );

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 max-h-[90vh] overflow-y-auto rounded-lg border bg-white p-4 shadow-lg dark:bg-gray-900 dark:border-gray-700">
          <Dialog.Title className="text-sm font-semibold">Create remediation workflow</Dialog.Title>
          <Dialog.Description className="text-xs text-gray-500 mt-1">
            Select actions for opportunity {opportunityId}. At least one step required.
          </Dialog.Description>
          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Risk ID (optional)</label>
            <input
              type="text"
              value={riskId}
              onChange={(e) => setRiskId(e.target.value)}
              placeholder="Link to risk evaluation"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
            />
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Assigned to (optional)</label>
            <input
              type="text"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              placeholder="User or email"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
            />
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Steps (select or add custom)</label>
              {actionsLoading ? (
                <p className="text-xs text-gray-500">Loading actions…</p>
              ) : actions.length === 0 ? (
                <p className="text-xs text-gray-500">No mitigation actions. Add custom steps below.</p>
              ) : (
                <ul className="space-y-1 max-h-36 overflow-y-auto">
                  {actions.map((a) => (
                    <li key={a.actionId} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`act-${a.actionId}`}
                        checked={selectedIds.includes(a.actionId)}
                        onChange={() => toggleAction(a.actionId)}
                        className="rounded"
                      />
                      <label htmlFor={`act-${a.actionId}`} className="text-sm truncate" title={a.description}>{a.title}</label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustom())}
                placeholder="Custom step"
                className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
              />
              <button type="button" onClick={addCustom} className="rounded border px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800">
                Add
              </button>
            </div>
            {customSteps.length > 0 && (
              <ul className="space-y-1">
                {customSteps.map((c, i) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <span className="truncate">{c.description}</span>
                    <button type="button" onClick={() => removeCustom(i)} className="text-red-600 hover:underline text-xs">Remove</button>
                  </li>
                ))}
              </ul>
            )}
            {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Dialog.Close asChild>
                <button type="button" className="rounded border px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800">Cancel</button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={!canSubmit}
                className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {submitLoading ? 'Creating…' : 'Create'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Button + modal for creating a workflow. Use on remediation page. */
export type CreateRemediationWorkflowButtonProps = {
  opportunityId: string;
  onCreated?: () => void;
  apiBaseUrl?: string;
  getHeaders?: () => HeadersInit | Promise<HeadersInit>;
};

export function CreateRemediationWorkflowButton({
  opportunityId,
  onCreated,
  apiBaseUrl,
  getHeaders,
}: CreateRemediationWorkflowButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
      >
        Create workflow
      </button>
      <CreateRemediationWorkflowModal
        isOpen={open}
        onClose={() => setOpen(false)}
        opportunityId={opportunityId}
        onCreated={onCreated}
        apiBaseUrl={apiBaseUrl}
        getHeaders={getHeaders}
      />
    </>
  );
}
