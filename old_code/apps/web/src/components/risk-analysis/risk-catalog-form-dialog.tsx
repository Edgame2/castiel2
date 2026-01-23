/**
 * Risk Catalog Form Dialog Component
 * Create and edit risk catalog entries
 */

'use client';

import { useState, useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { useCreateCustomRisk, useUpdateRisk } from '@/hooks/use-risk-analysis';
import type { RiskCatalog } from '@/types/risk-analysis';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { trackTrace } from '@/lib/monitoring/app-insights';

interface RiskCatalogFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  risk?: RiskCatalog | null;
  mode?: 'create' | 'edit';
}

export function RiskCatalogFormDialog({
  open,
  onOpenChange,
  risk,
  mode = 'create',
}: RiskCatalogFormDialogProps) {
  const { user } = useAuth();
  const createMutation = useCreateCustomRisk();
  const updateMutation = useUpdateRisk();

  // Check if user is super-admin
  // Check both roles array and single role field for compatibility
  const isSuperAdmin = 
    user?.roles?.some(role => 
      ['super-admin', 'super_admin', 'superadmin', 'global_admin'].includes(role.toLowerCase())
    ) || 
    (user?.role && ['super-admin', 'super_admin', 'superadmin', 'global_admin'].includes(user.role.toLowerCase())) ||
    false;

  // Debug logging (development only)
  useEffect(() => {
    if (open && mode === 'create' && process.env.NODE_ENV === 'development') {
      trackTrace('RiskCatalogFormDialog - Debug Info', 0, {
        userEmail: user?.email,
        userRoles: user?.roles,
        userRole: user?.role,
        isSuperAdmin,
        willShowCatalogTypeSelector: isSuperAdmin,
      })
    }
  }, [open, mode, user, isSuperAdmin]);

  const [formData, setFormData] = useState({
    catalogType: 'tenant' as 'global' | 'industry' | 'tenant',
    industryId: '',
    riskId: '',
    name: '',
    description: '',
    category: 'Commercial' as 'Commercial' | 'Technical' | 'Legal' | 'Financial' | 'Competitive' | 'Operational',
    defaultPonderation: 0.5,
    sourceShardTypes: [] as string[],
    detectionRules: {} as any,
    explainabilityTemplate: '',
    isActive: true,
  });

  const [sourceShardTypesInput, setSourceShardTypesInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Initialize form data when risk changes (edit mode)
  useEffect(() => {
    if (risk && mode === 'edit') {
      setFormData({
        catalogType: risk.catalogType,
        industryId: risk.industryId || '',
        riskId: risk.riskId,
        name: risk.name,
        description: risk.description,
        category: risk.category,
        defaultPonderation: risk.defaultPonderation,
        sourceShardTypes: risk.sourceShardTypes || [],
        detectionRules: risk.detectionRules || {},
        explainabilityTemplate: risk.explainabilityTemplate || '',
        isActive: risk.isActive !== false,
      });
      setSourceShardTypesInput(risk.sourceShardTypes?.join(', ') || '');
    } else if (mode === 'create') {
      // Reset form for create mode
      setFormData({
        catalogType: isSuperAdmin ? 'global' : 'tenant',
        industryId: '',
        riskId: '',
        name: '',
        description: '',
        category: 'Commercial',
        defaultPonderation: 0.5,
        sourceShardTypes: [],
        detectionRules: {},
        explainabilityTemplate: '',
        isActive: true,
      });
      setSourceShardTypesInput('');
    }
    setError(null);
  }, [risk, mode, open, isSuperAdmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      // Validate form data
      if (mode === 'create') {
        if (formData.catalogType === 'industry' && !formData.industryId?.trim()) {
          setError('Industry ID is required for industry-specific risks');
          return;
        }
        if (formData.catalogType === 'global' && formData.industryId?.trim()) {
          setError('Global risks cannot have an Industry ID');
          return;
        }
      }

      // Parse source shard types from comma-separated string
      const sourceShardTypes = sourceShardTypesInput
        .split(',' as any)
        .map(s => s.trim())
        .filter(s => s.length > 0);

      if (mode === 'create') {
        await createMutation.mutateAsync({
          ...formData,
          industryId: formData.catalogType === 'industry' ? formData.industryId?.trim() : undefined,
          sourceShardTypes,
        });
        onOpenChange(false);
      } else if (risk) {
        await updateMutation.mutateAsync({
          riskId: risk.riskId,
          data: {
            name: formData.name,
            description: formData.description,
            defaultPonderation: formData.defaultPonderation,
            detectionRules: formData.detectionRules,
            isActive: formData.isActive,
          },
        });
        onOpenChange(false);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save risk');
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Create Risk' : 'Edit Risk'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? isSuperAdmin
                ? 'Create a new risk definition (global, industry, or tenant-specific)'
                : 'Create a new tenant-specific risk definition'
              : 'Update risk catalog entry details'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Temporary debug info - remove after testing */}
          {mode === 'create' && (
            <div className="text-xs p-2 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded">
              <strong>Debug:</strong> Roles: {JSON.stringify(user?.roles || [])}, 
              Role: {user?.role || 'none'}, 
              isSuperAdmin: {String(isSuperAdmin)}
            </div>
          )}

          {/* Catalog Type (only for super-admin in create mode) */}
          {mode === 'create' && isSuperAdmin && (
            <div className="space-y-2">
              <Label htmlFor="catalogType">Catalog Type *</Label>
              <Select
                value={formData.catalogType}
                onValueChange={(value: 'global' | 'industry' | 'tenant') => {
                  setFormData((prev) => ({
                    ...prev,
                    catalogType: value,
                    // Clear industryId when switching away from industry type
                    industryId: value === 'industry' ? prev.industryId : '',
                  }));
                }}
                disabled={isLoading}
              >
                <SelectTrigger id="catalogType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global</SelectItem>
                  <SelectItem value="industry">Industry</SelectItem>
                  <SelectItem value="tenant">Tenant</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Global risks apply to all tenants. Industry risks apply to specific industries. Tenant risks are tenant-specific.
              </p>
            </div>
          )}

          {/* Industry ID (only for industry type) */}
          {mode === 'create' && formData.catalogType === 'industry' && (
            <div className="space-y-2">
              <Label htmlFor="industryId">Industry ID *</Label>
              <Input
                id="industryId"
                value={formData.industryId}
                onChange={(e) => setFormData((prev) => ({ ...prev, industryId: e.target.value }))}
                placeholder="e.g., technology, healthcare"
                required
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Industry identifier for this risk (required for industry-specific risks)
              </p>
            </div>
          )}

          {/* Risk ID */}
          <div className="space-y-2">
            <Label htmlFor="riskId">Risk ID *</Label>
            <Input
              id="riskId"
              value={formData.riskId}
              onChange={(e) => setFormData((prev) => ({ ...prev, riskId: e.target.value }))}
              placeholder="e.g., budget-constraint"
              required
              disabled={isLoading || mode === 'edit'}
            />
            <p className="text-xs text-muted-foreground">
              Unique identifier for this risk (cannot be changed after creation)
            </p>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Risk Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Budget Constraint"
              required
              disabled={isLoading}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Describe the risk and when it applies"
              rows={4}
              required
              disabled={isLoading}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select
              value={formData.category}
              onValueChange={(value: any) =>
                setFormData((prev) => ({ ...prev, category: value }))
              }
              disabled={isLoading || mode === 'edit'}
            >
              <SelectTrigger id="category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Commercial">Commercial</SelectItem>
                <SelectItem value="Technical">Technical</SelectItem>
                <SelectItem value="Legal">Legal</SelectItem>
                <SelectItem value="Financial">Financial</SelectItem>
                <SelectItem value="Competitive">Competitive</SelectItem>
                <SelectItem value="Operational">Operational</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Default Ponderation */}
          <div className="space-y-2">
            <Label htmlFor="defaultPonderation">
              Default Weight * (0.0 - 1.0)
            </Label>
            <Input
              id="defaultPonderation"
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={formData.defaultPonderation}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  defaultPonderation: parseFloat(e.target.value) || 0,
                }))
              }
              required
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Default weight for this risk (0.0 = no impact, 1.0 = maximum impact)
            </p>
          </div>

          {/* Source Shard Types */}
          {mode === 'create' && (
            <div className="space-y-2">
              <Label htmlFor="sourceShardTypes">Source Shard Types</Label>
              <Input
                id="sourceShardTypes"
                value={sourceShardTypesInput}
                onChange={(e) => setSourceShardTypesInput(e.target.value)}
                placeholder="e.g., c_opportunity, c_company (comma-separated)"
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Shard types that can trigger this risk (comma-separated)
              </p>
            </div>
          )}

          {/* Explainability Template */}
          {mode === 'create' && (
            <div className="space-y-2">
              <Label htmlFor="explainabilityTemplate">Explainability Template</Label>
              <Textarea
                id="explainabilityTemplate"
                value={formData.explainabilityTemplate}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, explainabilityTemplate: e.target.value }))
                }
                placeholder="Template for explaining why this risk was detected (optional)"
                rows={3}
                disabled={isLoading}
              />
            </div>
          )}

          {/* Active Status (edit mode only) */}
          {mode === 'edit' && (
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-0.5">
                <Label htmlFor="isActive">Active</Label>
                <p className="text-xs text-muted-foreground">
                  Inactive risks will not be detected
                </p>
              </div>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, isActive: checked }))
                }
                disabled={isLoading}
              />
            </div>
          )}

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
                ? 'Create Risk'
                : 'Update Risk'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

