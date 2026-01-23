'use client';

/**
 * Quota Management Component
 *
 * Manage tenant quotas and budgets:
 * - Monthly search quota limits
 * - Monthly budget limits
 * - Alert thresholds
 * - Usage tracking
 * - Forecasting
 *
 * Can be used as both standalone page and dashboard widget
 *
 * @author AI Insights Team
 * @version 1.0.0
 */

import { useState, useEffect } from 'react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { trackException, trackTrace } from '@/lib/monitoring/app-insights';
import {
    AlertCircle,
    CheckCircle2,
    TrendingUp,
    TrendingDown,
    Clock,
    DollarSign,
    Zap,
    Edit2,
    RefreshCw,
} from 'lucide-react';

interface QuotaConfig {
    tenantId: string;
    monthlySearchQuota: number;
    monthlyBudget: number;
    currentMonthSearches: number;
    currentMonthCost: number;
    usedPercentage: number;
    budgetPercentage: number;
    alerts: Array<{
        id: string;
        type: 'quota' | 'budget';
        threshold: number;
        triggered: boolean;
        triggeredAt?: string;
    }>;
    createdAt: string;
    updatedAt: string;
}

interface WidgetProps {
    isWidget?: boolean;
    widgetSize?: 'small' | 'medium' | 'large' | 'full';
    widgetConfig?: {
        title?: string;
        tenantId?: string;
        [key: string]: any;
    };
}

interface QuotaManagementProps extends WidgetProps {
    tenantId?: string;
    onRefresh?: () => void;
}

/**
 * Quota Management Component
 */
export function QuotaManagement({
    isWidget = false,
    widgetSize = 'medium',
    widgetConfig = {},
    tenantId: propTenantId,
    onRefresh,
}: QuotaManagementProps) {
    const tenantId = propTenantId || widgetConfig?.tenantId || 'tenant-123';
    const [quota, setQuota] = useState<QuotaConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState<Partial<QuotaConfig>>({});

    useEffect(() => {
        fetchQuota();
    }, [tenantId]);

    const fetchQuota = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch(`/api/v1/admin/quota/${tenantId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch quota');
            }
            const data = await response.json();
            setQuota(data);
            setEditData({
                monthlySearchQuota: data.monthlySearchQuota,
                monthlyBudget: data.monthlyBudget,
            });
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveQuota = async () => {
        try {
            const response = await fetch(`/api/v1/admin/quota/${tenantId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editData),
            });

            if (response.ok) {
                const updated = await response.json();
                setQuota(updated.quota);
                setIsEditing(false);
            }
        } catch (err) {
            const errorObj = err instanceof Error ? err : new Error(String(err))
            trackException(errorObj, 3)
            trackTrace('Save failed in QuotaManagement', 3, {
                errorMessage: errorObj.message,
                tenantId,
            })
        }
    };

    const daysInMonth = 30;
    const daysRemaining = daysInMonth - Math.floor((new Date().getDate() / daysInMonth) * daysInMonth);
    const projectedSearches = quota
        ? Math.ceil((quota.currentMonthSearches / Math.max(1, daysInMonth - daysRemaining)) * daysInMonth)
        : 0;
    const projectedCost = quota
        ? Math.ceil((quota.currentMonthCost / Math.max(1, daysInMonth - daysRemaining)) * daysInMonth)
        : 0;

    const widgetClasses = isWidget
        ? `rounded-lg border ${widgetSize === 'small' ? 'p-3' : 'p-4'}`
        : '';

    if (loading) {
        return (
            <div className={widgetClasses}>
                <div className="flex items-center justify-center h-40">
                    <RefreshCw className="h-5 w-5 text-gray-400 animate-spin" />
                </div>
            </div>
        );
    }

    if (!quota) {
        return (
            <div className={widgetClasses}>
                <div className="text-center text-muted-foreground p-8">
                    {error || 'No quota data available'}
                </div>
            </div>
        );
    }

    return (
        <div className={widgetClasses}>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className={isWidget && widgetSize === 'small' ? 'text-base font-semibold' : 'text-lg font-semibold'}>
                            {widgetConfig?.title || 'Quota Management'}
                        </h3>
                        {!isWidget && (
                            <p className="text-sm text-muted-foreground">
                                Manage search quota and budget limits for {tenantId}
                            </p>
                        )}
                    </div>
                    <div className="flex gap-2">
                        {!isWidget && (
                            <Dialog open={isEditing} onOpenChange={setIsEditing}>
                                <DialogTrigger asChild>
                                    <Button size={isWidget ? 'sm' : 'default'} variant="outline">
                                        <Edit2 className="h-4 w-4 mr-2" />
                                        Edit Quota
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Edit Quota Settings</DialogTitle>
                                        <DialogDescription>
                                            Update search quota and budget limits
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                        <div>
                                            <Label htmlFor="searchQuota">Monthly Search Quota</Label>
                                            <Input
                                                id="searchQuota"
                                                type="number"
                                                value={editData.monthlySearchQuota || 0}
                                                onChange={(e) =>
                                                    setEditData({
                                                        ...editData,
                                                        monthlySearchQuota: parseInt(e.target.value, 10),
                                                    })
                                                }
                                                placeholder="Enter monthly search quota"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="budget">Monthly Budget</Label>
                                            <Input
                                                id="budget"
                                                type="number"
                                                step="0.01"
                                                value={editData.monthlyBudget || 0}
                                                onChange={(e) =>
                                                    setEditData({
                                                        ...editData,
                                                        monthlyBudget: parseFloat(e.target.value),
                                                    })
                                                }
                                                placeholder="Enter monthly budget in USD"
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <Button onClick={handleSaveQuota} className="flex-1">
                                                Save Changes
                                            </Button>
                                            <Button
                                                variant="outline"
                                                onClick={() => setIsEditing(false)}
                                                className="flex-1"
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        )}
                        <Button
                            size={isWidget ? 'sm' : 'default'}
                            variant="outline"
                            onClick={() => {
                                fetchQuota();
                                onRefresh?.();
                            }}
                        >
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {error && (
                    <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400">
                        <AlertCircle className="h-4 w-4 inline mr-2" />
                        {error}
                    </div>
                )}

                {/* Search Quota */}
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base">Search Quota</CardTitle>
                            <Badge
                                variant={
                                    quota.usedPercentage > 80
                                        ? 'destructive'
                                        : quota.usedPercentage > 60
                                            ? 'default'
                                            : 'secondary'
                                }
                            >
                                {quota.usedPercentage.toFixed(0)}% used
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-muted-foreground">Current Usage</span>
                                <span className="font-semibold">
                                    {quota.currentMonthSearches.toLocaleString()} / {quota.monthlySearchQuota.toLocaleString()}
                                </span>
                            </div>
                            <Progress value={quota.usedPercentage} className="h-2" />
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-muted-foreground">Projected Usage</p>
                                <p className="text-lg font-semibold">
                                    {projectedSearches.toLocaleString()}
                                </p>
                                {projectedSearches > quota.monthlySearchQuota && (
                                    <p className="text-xs text-red-600 mt-1">
                                        ↑ Will exceed quota
                                    </p>
                                )}
                            </div>
                            <div>
                                <p className="text-muted-foreground">Days Remaining</p>
                                <p className="text-lg font-semibold">{daysRemaining}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    ~{Math.ceil((quota.monthlySearchQuota - quota.currentMonthSearches) / Math.max(1, daysRemaining))}/day
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Budget */}
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base">Monthly Budget</CardTitle>
                            <Badge
                                variant={
                                    quota.budgetPercentage > 80
                                        ? 'destructive'
                                        : quota.budgetPercentage > 60
                                            ? 'default'
                                            : 'secondary'
                                }
                            >
                                {quota.budgetPercentage.toFixed(0)}% used
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-muted-foreground">Spending</span>
                                <span className="font-semibold">
                                    ${quota.currentMonthCost.toFixed(2)} / ${quota.monthlyBudget.toFixed(2)}
                                </span>
                            </div>
                            <Progress value={quota.budgetPercentage} className="h-2" />
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-muted-foreground">Projected Spend</p>
                                <p className="text-lg font-semibold">
                                    ${projectedCost.toFixed(2)}
                                </p>
                                {projectedCost > quota.monthlyBudget && (
                                    <p className="text-xs text-red-600 mt-1">
                                        ↑ Will exceed budget
                                    </p>
                                )}
                            </div>
                            <div>
                                <p className="text-muted-foreground">Budget Remaining</p>
                                <p className="text-lg font-semibold">
                                    ${(quota.monthlyBudget - quota.currentMonthCost).toFixed(2)}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {daysRemaining} days left
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Alerts */}
                {!isWidget && quota.alerts.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Alert Thresholds</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {quota.alerts.map((alert) => (
                                    <div
                                        key={alert.id}
                                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded"
                                    >
                                        <div className="flex items-center gap-2">
                                            {alert.triggered ? (
                                                <AlertCircle className="h-4 w-4 text-yellow-600" />
                                            ) : (
                                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                            )}
                                            <div>
                                                <p className="text-sm font-medium capitalize">
                                                    {alert.type} Alert at {alert.threshold}%
                                                </p>
                                                {alert.triggered && alert.triggeredAt && (
                                                    <p className="text-xs text-muted-foreground">
                                                        Triggered {new Date(alert.triggeredAt).toLocaleDateString()}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <Badge variant={alert.triggered ? 'destructive' : 'secondary'}>
                                            {alert.triggered ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
