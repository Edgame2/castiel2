'use client';

/**
 * Usage Analytics Dashboard Component
 *
 * Displays comprehensive usage and cost analytics:
 * - Overall usage summary
 * - Breakdown by provider
 * - Breakdown by tenant
 * - Breakdown by query type
 * - Daily usage trends
 * - Cost forecasting
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
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';
import { RefreshCw, TrendingUp, TrendingDown, DollarSign, Search, Calendar, Download } from 'lucide-react';

interface UsageData {
    period: {
        startDate: string;
        endDate: string;
        label: string;
    };
    summary: {
        totalSearches: number;
        totalCost: number;
        totalUsers: number;
        totalTenants: number;
        cacheHitRate: number;
    };
    byProvider: Array<{
        providerId: string;
        name: string;
        searches: number;
        cost: number;
        percentage: number;
        trend: number;
        avgLatency: number;
        errorRate: number;
    }>;
    byTenant: Array<{
        tenantId: string;
        name: string;
        searches: number;
        cost: number;
        percentage: number;
        trend: number;
    }>;
    byQueryType: Array<{
        type: string;
        searches: number;
        cost: number;
        percentage: number;
    }>;
    dailyBreakdown: Array<{
        date: string;
        searches: number;
        cost: number;
        avgLatency: number;
        errorRate: number;
    }>;
}

interface WidgetProps {
    isWidget?: boolean;
    widgetSize?: 'small' | 'medium' | 'large' | 'full';
    widgetConfig?: {
        title?: string;
        [key: string]: any;
    };
}

interface UsageAnalyticsProps extends WidgetProps {
    onRefresh?: () => void;
}

/**
 * Usage Analytics Dashboard Component
 */
export function UsageAnalyticsDashboard({
    isWidget = false,
    widgetSize = 'medium',
    widgetConfig = {},
    onRefresh,
}: UsageAnalyticsProps) {
    const [usage, setUsage] = useState<UsageData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [period, setPeriod] = useState('30');

    useEffect(() => {
        fetchUsageAnalytics();
    }, [period]);

    const fetchUsageAnalytics = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch(`/api/v1/admin/web-search/usage?days=${period}`);
            if (!response.ok) {
                throw new Error('Failed to fetch usage analytics');
            }
            const data = await response.json();
            setUsage(data);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

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

    if (!usage) {
        return (
            <div className={widgetClasses}>
                <div className="text-center text-muted-foreground p-8">
                    No data available
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
                            {widgetConfig?.title || 'Usage Analytics'}
                        </h3>
                        {!isWidget && (
                            <p className="text-sm text-muted-foreground">
                                View search usage, costs, and performance metrics
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {!isWidget && (
                            <Select value={period} onValueChange={setPeriod}>
                                <SelectTrigger className="w-[120px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="7">Last 7 days</SelectItem>
                                    <SelectItem value="30">Last 30 days</SelectItem>
                                    <SelectItem value="90">Last 90 days</SelectItem>
                                </SelectContent>
                            </Select>
                        )}
                        <Button
                            size={isWidget ? 'sm' : 'default'}
                            variant="outline"
                            onClick={() => {
                                fetchUsageAnalytics();
                                onRefresh?.();
                            }}
                        >
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {error && (
                    <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400">
                        {error}
                    </div>
                )}

                {/* Summary Cards */}
                {widgetSize !== 'small' && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Total Searches
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{usage.summary.totalSearches.toLocaleString()}</div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {usage.period.label}
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Total Cost
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    ${usage.summary.totalCost.toFixed(2)}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {usage.period.label}
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Cache Hit Rate
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {(usage.summary.cacheHitRate * 100).toFixed(0)}%
                                </div>
                                <p className="text-xs text-green-600 mt-1">
                                    ↑ Saves on costs
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Active Tenants
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{usage.summary.totalTenants}</div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Using platform
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Tabs */}
                {widgetSize !== 'small' && (
                    <Tabs defaultValue="providers" className="w-full">
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="providers">By Provider</TabsTrigger>
                            <TabsTrigger value="tenants">By Tenant</TabsTrigger>
                            <TabsTrigger value="types">By Type</TabsTrigger>
                            <TabsTrigger value="trends">Trends</TabsTrigger>
                        </TabsList>

                        {/* By Provider */}
                        <TabsContent value="providers" className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                {/* Chart */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">Searches by Provider</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <BarChart data={usage.byProvider}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="name" />
                                                <YAxis />
                                                <Tooltip />
                                                <Bar dataKey="searches" fill="#3b82f6" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>

                                {/* Cost Chart */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">Cost by Provider</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <PieChart>
                                                <Pie
                                                    data={usage.byProvider}
                                                    dataKey="cost"
                                                    nameKey="name"
                                                    cx="50%"
                                                    cy="50%"
                                                    outerRadius={100}
                                                    label
                                                >
                                                    {usage.byProvider.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Table */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Provider Details</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Provider</TableHead>
                                                <TableHead className="text-right">Searches</TableHead>
                                                <TableHead className="text-right">Cost</TableHead>
                                                <TableHead className="text-right">%</TableHead>
                                                <TableHead className="text-right">Trend</TableHead>
                                                <TableHead className="text-right">Latency</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {usage.byProvider.map((provider) => (
                                                <TableRow key={provider.providerId}>
                                                    <TableCell className="font-medium">{provider.name}</TableCell>
                                                    <TableCell className="text-right">
                                                        {provider.searches.toLocaleString()}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        ${provider.cost.toFixed(2)}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {provider.percentage.toFixed(1)}%
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Badge variant={provider.trend > 0 ? 'default' : 'secondary'}>
                                                            {provider.trend > 0 ? '↑' : '↓'} {Math.abs(provider.trend).toFixed(1)}%
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {provider.avgLatency}ms
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* By Tenant */}
                        <TabsContent value="tenants" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Usage by Tenant</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Tenant</TableHead>
                                                <TableHead className="text-right">Searches</TableHead>
                                                <TableHead className="text-right">Cost</TableHead>
                                                <TableHead className="text-right">%</TableHead>
                                                <TableHead className="text-right">Trend</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {usage.byTenant.map((tenant) => (
                                                <TableRow key={tenant.tenantId}>
                                                    <TableCell className="font-medium">{tenant.name}</TableCell>
                                                    <TableCell className="text-right">
                                                        {tenant.searches.toLocaleString()}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        ${tenant.cost.toFixed(2)}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {tenant.percentage.toFixed(1)}%
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Badge variant={tenant.trend > 0 ? 'default' : 'secondary'}>
                                                            {tenant.trend > 0 ? '↑' : '↓'} {Math.abs(tenant.trend).toFixed(1)}%
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* By Type */}
                        <TabsContent value="types" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Searches by Query Type</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <PieChart>
                                            <Pie
                                                data={usage.byQueryType}
                                                dataKey="searches"
                                                nameKey="type"
                                                cx="50%"
                                                cy="50%"
                                                outerRadius={100}
                                                label
                                            >
                                                {usage.byQueryType.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Trends */}
                        <TabsContent value="trends" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Daily Usage Trend</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <LineChart data={usage.dailyBreakdown}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis
                                                dataKey="date"
                                                tickFormatter={(date) =>
                                                    new Date(date).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                    })
                                                }
                                            />
                                            <YAxis yAxisId="left" />
                                            <YAxis yAxisId="right" orientation="right" />
                                            <Tooltip />
                                            <Legend />
                                            <Line
                                                yAxisId="left"
                                                type="monotone"
                                                dataKey="searches"
                                                stroke="#3b82f6"
                                                name="Searches"
                                            />
                                            <Line
                                                yAxisId="right"
                                                type="monotone"
                                                dataKey="cost"
                                                stroke="#ef4444"
                                                name="Cost"
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                )}

                {/* Compact view for small widgets */}
                {widgetSize === 'small' && (
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Searches:</span>
                            <span className="font-semibold">{usage.summary.totalSearches.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Cost:</span>
                            <span className="font-semibold">${usage.summary.totalCost.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Cache Hit:</span>
                            <span className="font-semibold">
                                {(usage.summary.cacheHitRate * 100).toFixed(0)}%
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
