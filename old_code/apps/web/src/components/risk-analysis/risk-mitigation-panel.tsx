/**
 * Risk Mitigation Panel Component
 * Display and manage mitigation actions for risks
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, Clock, AlertCircle, Plus, X } from 'lucide-react';
import { useRiskEvaluation } from '@/hooks/use-risk-analysis';
import { ErrorDisplay } from './error-display';
import type { DetectedRisk, MitigationAction } from '@/types/risk-analysis';

interface RiskMitigationPanelProps {
  opportunityId: string;
  // In a full implementation, mitigation actions would be fetched from the opportunity shard
  // For now, we'll use a placeholder structure
  mitigationActions?: MitigationAction[];
  onActionUpdate?: (actionId: string, updates: Partial<MitigationAction>) => void;
  onActionCreate?: (action: Omit<MitigationAction, 'id' | 'createdAt' | 'createdBy'>) => void;
}

export function RiskMitigationPanel({
  opportunityId,
  mitigationActions = [],
  onActionUpdate,
  onActionCreate,
}: RiskMitigationPanelProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRiskId, setSelectedRiskId] = useState<string | null>(null);

  const {
    data: evaluation,
    isLoading: evaluationLoading,
    error: evaluationError,
    refetch: refetchEvaluation,
  } = useRiskEvaluation(opportunityId);

  // Group actions by risk
  const actionsByRisk = mitigationActions.reduce((acc, action) => {
    if (!acc[action.riskId]) {
      acc[action.riskId] = [];
    }
    acc[action.riskId].push(action);
    return acc;
  }, {} as Record<string, MitigationAction[]>);

  // Get risk name
  const getRiskName = (riskId: string) => {
    return evaluation?.risks.find((r) => r.riskId === riskId)?.riskName || riskId;
  };

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Get status icon
  const getStatusIcon = (status: MitigationAction['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'dismissed':
        return <X className="h-4 w-4 text-gray-400" />;
      default:
        return null;
    }
  };

  // Get priority color
  const getPriorityColor = (priority: MitigationAction['priority']) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (evaluationLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (evaluationError) {
    return (
      <Card>
        <CardContent className="pt-6">
          <ErrorDisplay 
            error={evaluationError} 
            onRetry={() => refetchEvaluation()}
            title="Failed to Load Mitigation Actions"
          />
        </CardContent>
      </Card>
    );
  }

  const allActions = Object.values(actionsByRisk).flat();
  const hasActions = allActions.length > 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Mitigation Actions
              </CardTitle>
              <CardDescription>
                {hasActions
                  ? `${allActions.length} action${allActions.length !== 1 ? 's' : ''} defined`
                  : 'No mitigation actions yet'}
              </CardDescription>
            </div>
            {evaluation && evaluation.risks.length > 0 && (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Action
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Mitigation Action</DialogTitle>
                    <DialogDescription>
                      Define an action to mitigate identified risks
                    </DialogDescription>
                  </DialogHeader>
                  <MitigationActionForm
                    risks={evaluation.risks}
                    onSubmit={(data) => {
                      if (onActionCreate) {
                        onActionCreate(data);
                      }
                      setIsDialogOpen(false);
                    }}
                    onCancel={() => setIsDialogOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!hasActions ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No mitigation actions defined yet.</p>
              {evaluation && evaluation.risks.length > 0 && (
                <p className="text-sm mt-2">
                  Create actions to address the {evaluation.risks.length} detected risk
                  {evaluation.risks.length !== 1 ? 's' : ''}.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(actionsByRisk).map(([riskId, actions]) => (
                <div key={riskId} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-sm">{getRiskName(riskId)}</h4>
                    <Badge variant="outline" className="text-xs">
                      {actions.length} action{actions.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  <div className="space-y-2 pl-4 border-l-2">
                    {actions.map((action) => (
                      <MitigationActionCard
                        key={action.id}
                        action={action}
                        riskName={getRiskName(riskId)}
                        onUpdate={onActionUpdate}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface MitigationActionCardProps {
  action: MitigationAction;
  riskName: string;
  onUpdate?: (actionId: string, updates: Partial<MitigationAction>) => void;
}

function MitigationActionCard({
  action,
  riskName,
  onUpdate,
}: MitigationActionCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusChange = (newStatus: MitigationAction['status']) => {
    if (onUpdate) {
      onUpdate(action.id, { status: newStatus });
    }
  };

  return (
    <div className="p-3 rounded-lg border bg-muted/50">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            {getStatusIcon(action.status)}
            <span className="font-medium text-sm">{action.title}</span>
            <Badge variant={getPriorityColor(action.priority) as any} className="text-xs">
              {action.priority}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{action.description}</p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {action.assignedTo && <span>Assigned to: {action.assignedTo}</span>}
            {action.dueDate && <span>Due: {formatDate(action.dueDate)}</span>}
            {action.completedAt && <span>Completed: {formatDate(action.completedAt)}</span>}
          </div>
          {action.explainability && (
            <div className="text-xs text-muted-foreground italic">
              {action.explainability}
            </div>
          )}
        </div>
        {onUpdate && (
          <Select
            value={action.status}
            onValueChange={(value) => handleStatusChange(value as MitigationAction['status'])}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="dismissed">Dismissed</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}

interface MitigationActionFormProps {
  risks: DetectedRisk[];
  onSubmit: (data: Omit<MitigationAction, 'id' | 'createdAt' | 'createdBy'>) => void;
  onCancel: () => void;
}

function MitigationActionForm({ risks, onSubmit, onCancel }: MitigationActionFormProps) {
  const [formData, setFormData] = useState({
    riskId: '',
    actionType: 'custom' as MitigationAction['actionType'],
    title: '',
    description: '',
    priority: 'medium' as MitigationAction['priority'],
    assignedTo: '',
    dueDate: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      expectedImpact: 0.5, // Default impact
      explainability: `Mitigation action for ${risks.find((r) => r.riskId === formData.riskId)?.riskName || 'risk'}`,
      status: 'pending',
      dueDate: formData.dueDate || undefined,
      assignedTo: formData.assignedTo || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="riskId">Risk</Label>
        <Select
          value={formData.riskId}
          onValueChange={(value) => setFormData({ ...formData, riskId: value })}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a risk" />
          </SelectTrigger>
          <SelectContent>
            {risks.map((risk) => (
              <SelectItem key={risk.riskId} value={risk.riskId}>
                {risk.riskName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="actionType">Action Type</Label>
        <Select
          value={formData.actionType}
          onValueChange={(value) =>
            setFormData({ ...formData, actionType: value as MitigationAction['actionType'] })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="engage_stakeholder">Engage Stakeholder</SelectItem>
            <SelectItem value="accelerate_review">Accelerate Review</SelectItem>
            <SelectItem value="technical_validation">Technical Validation</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <Select
            value={formData.priority}
            onValueChange={(value) =>
              setFormData({ ...formData, priority: value as MitigationAction['priority'] })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dueDate">Due Date</Label>
          <Input
            id="dueDate"
            type="date"
            value={formData.dueDate}
            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="assignedTo">Assigned To (User ID)</Label>
        <Input
          id="assignedTo"
          value={formData.assignedTo}
          onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
          placeholder="Optional"
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Create Action</Button>
      </div>
    </form>
  );
}

// Helper functions (duplicated from component for use in card)
function getStatusIcon(status: MitigationAction['status']) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case 'in_progress':
      return <Clock className="h-4 w-4 text-blue-600" />;
    case 'pending':
      return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    case 'dismissed':
      return <X className="h-4 w-4 text-gray-400" />;
    default:
      return null;
  }
}

function getPriorityColor(priority: MitigationAction['priority']) {
  switch (priority) {
    case 'high':
      return 'destructive';
    case 'medium':
      return 'default';
    case 'low':
      return 'secondary';
    default:
      return 'outline';
  }
}

function formatDate(dateString?: string) {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}


