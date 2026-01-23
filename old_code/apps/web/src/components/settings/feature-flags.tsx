"use client"

import { Flag } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { useFeatureFlags, useToggleFeatureFlag } from "@/hooks/use-tenant"
import { Skeleton } from "@/components/ui/skeleton"

export function FeatureFlags() {
  const { data: features, isLoading } = useFeatureFlags()
  const toggleFeature = useToggleFeatureFlag()

  const handleToggle = (id: string) => {
    toggleFeature.mutate(id)
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Feature Flags</CardTitle>
          <CardDescription>Enable or disable features for your organization</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="space-y-1">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-64" />
                </div>
                <Skeleton className="h-6 w-11 rounded-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Feature Flags</CardTitle>
        <CardDescription>
          Enable or disable features for your organization
        </CardDescription>
      </CardHeader>
      <CardContent>
        {features && features.length === 0 ? (
          <div className="text-center py-8">
            <Flag className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No feature flags</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              No feature flags are configured for your organization
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {features?.map((feature) => (
              <div
                key={feature.id}
                className="flex items-center justify-between space-x-4 border-b last:border-0 pb-4 last:pb-0"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Flag className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium">{feature.name}</p>
                  </div>
                  {feature.description && (
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground font-mono">
                    Key: {feature.key}
                  </p>
                </div>
                <Switch
                  checked={feature.enabled}
                  onCheckedChange={() => handleToggle(feature.id)}
                  disabled={toggleFeature.isPending}
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
