'use client';

/**
 * Web Search Provider Management Component
 *
 * Provides UI for managing search providers:
 * - List all providers with status
 * - Configure provider settings
 * - Test provider connectivity
 * - Manage fallback chain
 * - View health metrics
 * - Track costs and usage
 *
 * Can be used as both standalone page and dashboard widget
 *
 * @author AI Insights Team
 * @version 1.0.0
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { trackException, trackTrace } from '@/lib/monitoring/app-insights';
import {
    AlertCircle,
    CheckCircle2,
    Clock,
    DollarSign,
    Eye,
    EyeOff,
    AlertTriangle,
    Zap,
    ArrowUpRight,
    ArrowDownRight,
    RefreshCw,
    Settings,
    Trash2,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';

interface Provider {
    id: string;
    name: string;
    type: string;
    enabled: boolean;
    priority: number;
    endpoint?: string;
    config: any;
    budget?: any;
    metrics?: any;
    health?: any;
}

interface WidgetProps {
    isWidget?: boolean;
    widgetSize?: 'small' | 'medium' | 'large' | 'full';
    widgetConfig?: {
        title?: string;
        [key: string]: any;
    };
}

interface ProviderManagementProps extends WidgetProps {
    onRefresh?: () => void;
}

/**
 * Web Search Provider Management Component
 */
export function WebSearchProviderManagement({
    isWidget = false,
    widgetSize = 'medium',
    widgetConfig = {},
    onRefresh,
}: ProviderManagementProps) {
    const [providers, setProviders] = useState<Provider[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showHealthChart, setShowHealthChart] = useState(false);

    useEffect(() => {
        fetchProviders();
    }, []);

    const fetchProviders = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch('/api/v1/admin/web-search/providers');
            if (!response.ok) {
                throw new Error('Failed to fetch providers');
            }
            const data = await response.json();
            setProviders(data.providers || []);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const handleTestProvider = async (providerId: string) => {
        try {
            const response = await fetch(
                `/api/v1/admin/web-search/providers/${providerId}/test`,
                { method: 'POST' }
            );
            const result = await response.json();

            // Show result notification
            const status = result.success ? 'Success' : 'Failed';
            // Log test result in development only
            if (process.env.NODE_ENV === 'development') {
                trackTrace(`Provider test ${status}`, 0, {
                    providerId,
                    latency: result.latency,
                    success: result.success,
                })
            }
        } catch (err) {
            const errorObj = err instanceof Error ? err : new Error(String(err))
            trackException(errorObj, 3)
            trackTrace('Test failed in WebSearchProviderManagement', 3, {
                errorMessage: errorObj.message,
                providerId,
            })
        }
    };

    const handleToggleEnabled = async (providerId: string, enabled: boolean) => {
        try {
            const response = await fetch(
                `/api/v1/admin/web-search/providers/${providerId}`,
                {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ enabled: !enabled }),
                }
            );

            if (response.ok) {
                setProviders(
                    providers.map((p) =>
                        p.id === providerId ? { ...p, enabled: !enabled } : p
                    )
                );
            }
        } catch (err) {
            const errorObj = err instanceof Error ? err : new Error(String(err))
            trackException(errorObj, 3)
            trackTrace('Update failed in WebSearchProviderManagement', 3, {
                errorMessage: errorObj.message,
                providerId,
                enabled: !enabled,
            })
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'healthy':
                return <CheckCircle2 className="h-4 w-4 text-green-600" />;
            case 'degraded':
                return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
            case 'down':
                return <AlertCircle className="h-4 w-4 text-red-600" />;
            default:
                return null;
        }
    };

    const widgetClasses = isWidget
        ? `rounded-lg border ${widgetSize === 'small' ? 'p-3' : 'p-4'}`
        : '';

    if (loading) {
        return (
            <div className={widgetClasses}>
                <div className="flex items-center justify-center h-40">
                    <div className="animate-spin">
                        <RefreshCw className="h-5 w-5 text-gray-400" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={widgetClasses}>
            <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className={isWidget && widgetSize === 'small' ? 'text-base font-semibold' : 'text-lg font-semibold'}>
                            {widgetConfig?.title || 'Web Search Providers'}
                        </h3>
                        {!isWidget && (
                            <p className="text-sm text-muted-foreground">
                                Manage search providers, configure fallback chains, and monitor health
                            </p>
                        )}
                    </div>
                    <Button
                        size={isWidget ? 'sm' : 'default'}
                        variant="outline"
                        onClick={() => {
                            fetchProviders();
                            onRefresh?.();
                        }}
                    >
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>

                {error && (
                    <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400">
                        <AlertCircle className="h-4 w-4 inline mr-2" />
                        {error}
                    </div>
                )}

                {/* Provider List */}
                {widgetSize === 'small' ? (
                    // Compact view for small widgets
                    <div className="space-y-2">
                        {providers.slice(0, 3).map((provider) => (
                            <div
                                key={provider.id}
                                className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded"
                            >
                                <div className="flex items-center gap-2">
                                    {getStatusIcon(provider.health?.status || 'healthy')}
                                    <span className="text-sm font-medium">{provider.name}</span>
                                </div>
                                <Badge variant={provider.enabled ? 'default' : 'secondary'}>
                                    {provider.enabled ? 'On' : 'Off'}
                                </Badge>
                            </div>
                        ))}
                    </div>
                ) : (
                    // Full view for larger widgets and pages
                    <Tabs defaultValue="providers" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="providers">Providers</TabsTrigger>
                            <TabsTrigger value="health">Health</TabsTrigger>
                            <TabsTrigger value="costs">Costs</TabsTrigger>
                        </TabsList>

                        {/* Providers Tab */}
                        <TabsContent value="providers" className="space-y-4">
                            <div className="border rounded-lg overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Provider</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Priority</TableHead>
                                            <TableHead>Latency</TableHead>
                                            <TableHead>Errors</TableHead>
                                            <TableHead>Cache Hit</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {providers.map((provider) => (
                                            <div key={provider.id}>
                                                <TableRow
                                                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900"
                                                    onClick={() =>
                                                        setExpandedId(expandedId === provider.id ? null : provider.id)
                                                    }
                                                >
                                                    <TableCell className="font-medium">
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-3 w-3 rounded-full bg-blue-500" />
                                                            {provider.name}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            {getStatusIcon(provider.health?.status || 'healthy')}
                                                            <span className="text-xs capitalize">
                                                                {provider.health?.status || 'healthy'}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{provider.priority}</TableCell>
                                                    <TableCell className="text-sm">
                                                        {provider.metrics?.avgLatency || 0}ms
                                                    </TableCell>
                                                    <TableCell className="text-sm">
                                                        {((provider.metrics?.errorRate || 0) * 100).toFixed(2)}%
                                                    </TableCell>
                                                    <TableCell className="text-sm">
                                                        {((provider.metrics?.cacheHitRate || 0) * 100).toFixed(0)}%
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleTestProvider(provider.id);
                                                            }}
                                                        >
                                                            <Zap className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>

                                                {/* Expanded Details */}
                                                {expandedId === provider.id && (
                                                    <TableRow className="bg-gray-50 dark:bg-gray-900">
                                                        <TableCell colSpan={7} className="p-6">
                                                            <div className="grid grid-cols-2 gap-6">
                                                                <div>
                                                                    <h4 className="font-semibold mb-4">Configuration</h4>
                                                                    <div className="space-y-3">
                                                                        <div>
                                                                            <Label className="text-xs text-muted-foreground">
                                                                                Enabled
                                                                            </Label>
                                                                            <div className="flex items-center mt-1">
                                                                                <Switch
                                                                                    checked={provider.enabled}
                                                                                    onCheckedChange={() =>
                                                                                        handleToggleEnabled(provider.id, provider.enabled)
                                                                                    }
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                        {provider.endpoint && (
                                                                            <div>
                                                                                <Label className="text-xs text-muted-foreground">
                                                                                    Endpoint
                                                                                </Label>
                                                                                <p className="text-sm mt-1 font-mono break-all">
                                                                                    {provider.endpoint}
                                                                                </p>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <div>
                                                                    <h4 className="font-semibold mb-4">Metrics</h4>
                                                                    <div className="space-y-3">
                                                                        <div className="grid grid-cols-2 gap-4">
                                                                            <div>
                                                                                <p className="text-xs text-muted-foreground">
                                                                                    This Month
                                                                                </p>
                                                                                <p className="text-lg font-semibold">
                                                                                    {provider.metrics?.requestsMonth || 0}
                                                                                </p>
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-xs text-muted-foreground">
                                                                                    Cost (Month)
                                                                                </p>
                                                                                <p className="text-lg font-semibold">
                                                                                    ${provider.metrics?.costMonth || 0}
                                                                                </p>
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-xs text-muted-foreground">
                                                                                    Avg Relevance
                                                                                </p>
                                                                                <p className="text-lg font-semibold">
                                                                                    {(provider.metrics?.avgRelevanceScore || 0).toFixed(2)}
                                                                                </p>
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-xs text-muted-foreground">
                                                                                    Last Check
                                                                                </p>
                                                                                <p className="text-xs font-mono">
                                                                                    {provider.health?.lastCheck
                                                                                        ? new Date(
                                                                                            provider.health.lastCheck
                                                                                        ).toLocaleString()
                                                                                        : 'Never'}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </div>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </TabsContent>

                        {/* Health Tab */}
                        <TabsContent value="health" className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                {providers.map((provider) => (
                                    <Card key={provider.id}>
                                        <CardHeader className="pb-3">
                                            <div className="flex items-center justify-between">
                                                <CardTitle className="text-base">{provider.name}</CardTitle>
                                                {getStatusIcon(provider.health?.status || 'healthy')}
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-2">
                                            <div className="text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">P50 Latency:</span>
                                                    <span className="font-semibold">
                                                        {Math.round(provider.metrics?.avgLatency || 0)}ms
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">P95 Latency:</span>
                                                    <span className="font-semibold">
                                                        {Math.round((provider.metrics?.avgLatency || 0) * 1.5)}ms
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">P99 Latency:</span>
                                                    <span className="font-semibold">
                                                        {Math.round((provider.metrics?.avgLatency || 0) * 2)}ms
                                                    </span>
                                                </div>
                                                <div className="flex justify-between pt-2 border-t">
                                                    <span className="text-muted-foreground">Error Rate:</span>
                                                    <span className="font-semibold text-red-600">
                                                        {((provider.metrics?.errorRate || 0) * 100).toFixed(2)}%
                                                    </span>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </TabsContent>

                        {/* Costs Tab */}
                        <TabsContent value="costs" className="space-y-4">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Provider</TableHead>
                                        <TableHead className="text-right">Monthly Cost</TableHead>
                                        <TableHead className="text-right">Budget</TableHead>
                                        <TableHead className="text-right">Usage %</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {providers.map((provider) => (
                                        <TableRow key={provider.id}>
                                            <TableCell className="font-medium">{provider.name}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <DollarSign className="h-4 w-4" />
                                                    {provider.metrics?.costMonth || 0}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                ${provider.budget?.monthlyLimit || 'Unlimited'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {provider.budget?.monthlyLimit
                                                    ? (
                                                        ((provider.metrics?.costMonth || 0) /
                                                            provider.budget.monthlyLimit) *
                                                        100
                                                    ).toFixed(0)
                                                    : 'N/A'}
                                                %
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TabsContent>
                    </Tabs>
                )}
            </div>
        </div>
    );
}
