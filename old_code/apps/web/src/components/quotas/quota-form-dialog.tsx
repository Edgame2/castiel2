/**
 * Quota Form Dialog Component
 * Create and edit quota form
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCreateQuota, useUpdateQuota } from '@/hooks/use-quotas';
import type { Quota, CreateQuotaInput, UpdateQuotaInput } from '@/types/quota';
import { AlertCircle } from 'lucide-react';

interface QuotaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quota?: Quota | null;
  mode?: 'create' | 'edit';
}

export function QuotaFormDialog({
  open,
  onOpenChange,
  quota,
  mode = 'create',
}: QuotaFormDialogProps) {
  const router = useRouter();
  const createMutation = useCreateQuota();
  const updateMutation = useUpdateQuota();

  const [formData, setFormData] = useState<CreateQuotaInput>({
    quotaType: 'individual',
    period: {
      type: 'monthly',
      startDate: new Date().toISOString().split('T' as any)[0],
      endDate: new Date(new Date().setMonth(new Date().getMonth() + 1))
        .toISOString()
        .split('T' as any)[0],
    },
    target: {
      amount: 0,
      currency: 'USD',
    },
  });

  const [error, setError] = useState<string | null>(null);

  // Initialize form data when quota changes (edit mode)
  useEffect(() => {
    if (quota && mode === 'edit') {
      // Handle date strings - they might be ISO strings or already formatted
      const startDate = quota.period.startDate.includes('T')
        ? quota.period.startDate.split('T' as any)[0]
        : quota.period.startDate;
      const endDate = quota.period.endDate.includes('T')
        ? quota.period.endDate.split('T' as any)[0]
        : quota.period.endDate;

      setFormData({
        quotaType: quota.quotaType,
        targetUserId: quota.targetUserId,
        teamId: quota.teamId,
        period: {
          type: quota.period.type,
          startDate,
          endDate,
        },
        target: {
          amount: quota.target.amount,
          currency: quota.target.currency,
          opportunityCount: quota.target.opportunityCount,
        },
        parentQuotaId: quota.parentQuotaId,
      });
    } else if (mode === 'create') {
      // Reset form for create mode
      const today = new Date();
      const nextMonth = new Date(today);
      nextMonth.setMonth(today.getMonth() + 1);

      setFormData({
        quotaType: 'individual',
        period: {
          type: 'monthly',
          startDate: today.toISOString().split('T' as any)[0],
          endDate: nextMonth.toISOString().split('T' as any)[0],
        },
        target: {
          amount: 0,
          currency: 'USD',
        },
      });
    }
    setError(null);
  }, [quota, mode, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      // Convert date strings to ISO format
      const submitData = {
        ...formData,
        period: {
          ...formData.period,
          startDate: new Date(formData.period.startDate).toISOString(),
          endDate: new Date(formData.period.endDate).toISOString(),
        },
      };

      if (mode === 'create') {
        const newQuota = await createMutation.mutateAsync(submitData);
        onOpenChange(false);
        router.push(`/quotas/${newQuota.id}`);
      } else if (quota) {
        const updateData: UpdateQuotaInput = {
          period: submitData.period,
          target: submitData.target,
          parentQuotaId: submitData.parentQuotaId,
        };
        await updateMutation.mutateAsync({
          quotaId: quota.id,
          data: updateData,
        });
        onOpenChange(false);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save quota');
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Create Quota' : 'Edit Quota'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Create a new sales quota and performance target'
              : 'Update quota details and targets'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Quota Type */}
          <div className="space-y-2">
            <Label htmlFor="quotaType">Quota Type *</Label>
            <Select
              value={formData.quotaType}
              onValueChange={(value: 'individual' | 'team' | 'tenant') =>
                setFormData((prev) => ({ ...prev, quotaType: value }))
              }
              disabled={isLoading || mode === 'edit'}
            >
              <SelectTrigger id="quotaType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">Individual</SelectItem>
                <SelectItem value="team">Team</SelectItem>
                <SelectItem value="tenant">Tenant</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Target User ID (for individual quotas) */}
          {formData.quotaType === 'individual' && (
            <div className="space-y-2">
              <Label htmlFor="targetUserId">User ID</Label>
              <Input
                id="targetUserId"
                value={formData.targetUserId || ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    targetUserId: e.target.value || undefined,
                  }))
                }
                placeholder="User ID (optional)"
                disabled={isLoading}
              />
            </div>
          )}

          {/* Team ID (for team quotas) */}
          {formData.quotaType === 'team' && (
            <div className="space-y-2">
              <Label htmlFor="teamId">Team ID</Label>
              <Input
                id="teamId"
                value={formData.teamId || ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    teamId: e.target.value || undefined,
                  }))
                }
                placeholder="Team ID (optional)"
                disabled={isLoading}
              />
            </div>
          )}

          {/* Period Type */}
          <div className="space-y-2">
            <Label htmlFor="periodType">Period Type *</Label>
            <Select
              value={formData.period.type}
              onValueChange={(value: 'monthly' | 'quarterly' | 'yearly') =>
                setFormData((prev) => ({
                  ...prev,
                  period: { ...prev.period, type: value },
                }))
              }
              disabled={isLoading}
            >
              <SelectTrigger id="periodType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date *</Label>
            <Input
              id="startDate"
              type="date"
              value={formData.period.startDate}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  period: { ...prev.period, startDate: e.target.value },
                }))
              }
              required
              disabled={isLoading}
            />
          </div>

          {/* End Date */}
          <div className="space-y-2">
            <Label htmlFor="endDate">End Date *</Label>
            <Input
              id="endDate"
              type="date"
              value={formData.period.endDate}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  period: { ...prev.period, endDate: e.target.value },
                }))
              }
              required
              disabled={isLoading}
            />
          </div>

          {/* Target Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Target Amount *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={formData.target.amount}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  target: {
                    ...prev.target,
                    amount: parseFloat(e.target.value) || 0,
                  },
                }))
              }
              required
              disabled={isLoading}
            />
          </div>

          {/* Currency */}
          <div className="space-y-2">
            <Label htmlFor="currency">Currency *</Label>
            <Select
              value={formData.target.currency}
              onValueChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  target: { ...prev.target, currency: value },
                }))
              }
              disabled={isLoading}
            >
              <SelectTrigger id="currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="GBP">GBP</SelectItem>
                <SelectItem value="CAD">CAD</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Opportunity Count (optional) */}
          <div className="space-y-2">
            <Label htmlFor="opportunityCount">Opportunity Count</Label>
            <Input
              id="opportunityCount"
              type="number"
              min="0"
              value={formData.target.opportunityCount || ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  target: {
                    ...prev.target,
                    opportunityCount: e.target.value
                      ? parseInt(e.target.value)
                      : undefined,
                  },
                }))
              }
              placeholder="Optional"
              disabled={isLoading}
            />
          </div>

          {/* Parent Quota ID (optional) */}
          <div className="space-y-2">
            <Label htmlFor="parentQuotaId">Parent Quota ID</Label>
            <Input
              id="parentQuotaId"
              value={formData.parentQuotaId || ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  parentQuotaId: e.target.value || undefined,
                }))
              }
              placeholder="Parent quota ID (optional, for rollup quotas)"
              disabled={isLoading}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? 'Saving...'
                : mode === 'create'
                ? 'Create Quota'
                : 'Update Quota'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

