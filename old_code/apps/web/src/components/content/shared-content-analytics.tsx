"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Eye, Users, Clock, MousePointer } from "lucide-react"

interface AnalyticsProps {
    stats: {
        views: number;
        uniqueViewers: number;
        avgTimeSpent: string;
        clicks: number;
    };
    interactions: Array<{
        viewer: string;
        event: string;
        timestamp: string;
    }>;
}

export function SharedContentAnalytics({ stats, interactions }: AnalyticsProps) {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Views</CardTitle>
                        <Eye className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.views}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Unique Viewers</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.uniqueViewers}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg. Time</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.avgTimeSpent}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Interactions</CardTitle>
                        <MousePointer className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.clicks}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {interactions.map((interaction, i) => (
                            <div key={i} className="flex items-center justify-between border-b pb-2 last:border-0">
                                <div>
                                    <p className="font-medium text-sm">{interaction.viewer || 'Anonymous'}</p>
                                    <p className="text-xs text-muted-foreground">{interaction.event}</p>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {new Date(interaction.timestamp).toLocaleString()}
                                </div>
                            </div>
                        ))}
                        {interactions.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">No activity yet</p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
