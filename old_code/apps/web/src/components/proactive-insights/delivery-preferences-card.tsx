"use client";

/**
 * Delivery Preferences Card Component
 * Allows users to configure how they receive proactive insights
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useDeliveryPreferences,
  useUpdateDeliveryPreferences,
  useResetDeliveryPreferences,
} from "@/hooks/use-proactive-insights";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, Mail, Webhook, LayoutDashboard, Info, Save, RotateCcw } from "lucide-react";
import type { DeliveryPreferences } from "@/lib/api/proactive-insights";

export function DeliveryPreferencesCard() {
  const { data: preferences, isLoading } = useDeliveryPreferences();
  const updateMutation = useUpdateDeliveryPreferences();
  const resetMutation = useResetDeliveryPreferences();

  const [localPreferences, setLocalPreferences] = useState<Partial<DeliveryPreferences>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize local state when preferences load
  useEffect(() => {
    if (preferences) {
      setLocalPreferences(preferences);
      setHasChanges(false);
    }
  }, [preferences]);

  // Get current value (local or from API)
  const getValue = <K extends keyof DeliveryPreferences>(
    path: string[]
  ): any => {
    if (hasChanges && localPreferences) {
      let current: any = localPreferences;
      for (const key of path) {
        current = current?.[key];
        if (current === undefined) break;
      }
      if (current !== undefined) return current;
    }
    if (preferences) {
      let current: any = preferences;
      for (const key of path) {
        current = current?.[key];
        if (current === undefined) break;
      }
      return current;
    }
    return undefined;
  };

  const updateValue = (path: string[], value: any) => {
    setLocalPreferences((prev) => {
      // Create a deep clone of previous state
      const updated = prev ? JSON.parse(JSON.stringify(prev)) : {};
      
      // Navigate to the target path and update
      let current: any = updated;
      for (let i = 0; i < path.length - 1; i++) {
        if (!current[path[i]]) {
          current[path[i]] = {};
        } else {
          // Clone nested objects to avoid mutation
          current[path[i]] = { ...current[path[i]] };
        }
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
      
      return updated;
    });
    setHasChanges(true);
  };

  const handleSave = () => {
    if (!hasChanges) return;
    // Merge local changes with base preferences to ensure full structure
    const updatePayload: Partial<DeliveryPreferences> = preferences
      ? { ...preferences, ...localPreferences }
      : localPreferences;
    updateMutation.mutate(updatePayload, {
      onSuccess: () => {
        setHasChanges(false);
      },
    });
  };

  const handleReset = () => {
    resetMutation.mutate(undefined, {
      onSuccess: () => {
        setLocalPreferences({});
        setHasChanges(false);
      },
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Delivery Preferences</CardTitle>
          <CardDescription>Loading preferences...</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64" />
        </CardContent>
      </Card>
    );
  }

  const inAppEnabled = getValue(["channels", "in_app", "enabled"]) ?? true;
  const inAppPushThreshold = getValue(["channels", "in_app", "pushThreshold"]) ?? "medium";
  const dashboardEnabled = getValue(["channels", "dashboard", "enabled"]) ?? true;
  const dashboardMaxItems = getValue(["channels", "dashboard", "maxItems"]) ?? 10;
  const dashboardGroupByType = getValue(["channels", "dashboard", "groupByType"]) ?? false;
  const emailEnabled = getValue(["channels", "email", "enabled"]) ?? true;
  const emailImmediateThreshold = getValue(["channels", "email", "immediateThreshold"]) ?? "high";
  const emailDigestFrequency = getValue(["channels", "email", "digestFrequency"]) ?? "daily";
  const emailDigestTime = getValue(["channels", "email", "digestTime"]) ?? "09:00";
  const webhookEnabled = getValue(["channels", "webhook", "enabled"]) ?? false;
  const webhookUrl = getValue(["channels", "webhook", "url"]) ?? "";
  const webhookSecret = getValue(["channels", "webhook", "secret"]) ?? "";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <CardTitle>Proactive Insights Delivery Preferences</CardTitle>
          </div>
          <CardDescription>
            Configure how you receive proactive insights notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* In-App Notifications */}
          <div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="in-app" className="text-base font-semibold flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  In-App Notifications
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications within the application
                </p>
              </div>
              <Switch
                id="in-app"
                checked={inAppEnabled}
                onCheckedChange={(checked) =>
                  updateValue(["channels", "in_app", "enabled"], checked)
                }
              />
            </div>
            {inAppEnabled && (
              <div className="mt-4 space-y-4 pl-6 border-l-2">
                <div className="space-y-2">
                  <Label htmlFor="push-threshold" className="text-sm">
                    Push Notification Threshold
                  </Label>
                  <Select
                    value={inAppPushThreshold}
                    onValueChange={(value) =>
                      updateValue(["channels", "in_app", "pushThreshold"], value)
                    }
                  >
                    <SelectTrigger id="push-threshold" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low - All insights</SelectItem>
                      <SelectItem value="medium">Medium - High priority and above</SelectItem>
                      <SelectItem value="high">High - Critical and high priority</SelectItem>
                      <SelectItem value="critical">Critical - Critical only</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Insights below this threshold will be silent notifications
                  </p>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Dashboard Widget */}
          <div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="dashboard" className="text-base font-semibold flex items-center gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard Widget
                </Label>
                <p className="text-sm text-muted-foreground">
                  Show insights in the dashboard widget
                </p>
              </div>
              <Switch
                id="dashboard"
                checked={dashboardEnabled}
                onCheckedChange={(checked) =>
                  updateValue(["channels", "dashboard", "enabled"], checked)
                }
              />
            </div>
            {dashboardEnabled && (
              <div className="mt-4 space-y-4 pl-6 border-l-2">
                <div className="space-y-2">
                  <Label htmlFor="max-items" className="text-sm">
                    Maximum Items
                  </Label>
                  <Input
                    id="max-items"
                    type="number"
                    min="1"
                    max="100"
                    value={dashboardMaxItems}
                    onChange={(e) =>
                      updateValue(
                        ["channels", "dashboard", "maxItems"],
                        parseInt(e.target.value, 10) || 10
                      )
                    }
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum number of insights to show in the widget
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="group-by-type" className="text-sm">
                      Group by Type
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Organize insights by type in the widget
                    </p>
                  </div>
                  <Switch
                    id="group-by-type"
                    checked={dashboardGroupByType}
                    onCheckedChange={(checked) =>
                      updateValue(["channels", "dashboard", "groupByType"], checked)
                    }
                  />
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Email Notifications */}
          <div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email" className="text-base font-semibold flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Notifications
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receive insights via email
                </p>
              </div>
              <Switch
                id="email"
                checked={emailEnabled}
                onCheckedChange={(checked) =>
                  updateValue(["channels", "email", "enabled"], checked)
                }
              />
            </div>
            {emailEnabled && (
              <div className="mt-4 space-y-4 pl-6 border-l-2">
                <div className="space-y-2">
                  <Label htmlFor="immediate-threshold" className="text-sm">
                    Immediate Email Threshold
                  </Label>
                  <Select
                    value={emailImmediateThreshold}
                    onValueChange={(value) =>
                      updateValue(["channels", "email", "immediateThreshold"], value)
                    }
                  >
                    <SelectTrigger id="immediate-threshold" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low - All insights</SelectItem>
                      <SelectItem value="medium">Medium - High priority and above</SelectItem>
                      <SelectItem value="high">High - Critical and high priority</SelectItem>
                      <SelectItem value="critical">Critical - Critical only</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Insights at or above this priority will be sent immediately. Others will be included in digest.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="digest-frequency" className="text-sm">
                    Digest Frequency
                  </Label>
                  <Select
                    value={emailDigestFrequency}
                    onValueChange={(value) =>
                      updateValue(["channels", "email", "digestFrequency"], value)
                    }
                  >
                    <SelectTrigger id="digest-frequency" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Immediate</SelectItem>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {emailDigestFrequency !== "immediate" && (
                  <div className="space-y-2">
                    <Label htmlFor="digest-time" className="text-sm">
                      Digest Time
                    </Label>
                    <Input
                      id="digest-time"
                      type="time"
                      value={emailDigestTime}
                      onChange={(e) =>
                        updateValue(["channels", "email", "digestTime"], e.target.value)
                      }
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      Time to send digest emails (24-hour format)
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Webhook */}
          <div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="webhook" className="text-base font-semibold flex items-center gap-2">
                  <Webhook className="h-4 w-4" />
                  Webhook
                </Label>
                <p className="text-sm text-muted-foreground">
                  Send insights to an external webhook URL
                </p>
              </div>
              <Switch
                id="webhook"
                checked={webhookEnabled}
                onCheckedChange={(checked) =>
                  updateValue(["channels", "webhook", "enabled"], checked)
                }
              />
            </div>
            {webhookEnabled && (
              <div className="mt-4 space-y-4 pl-6 border-l-2">
                <div className="space-y-2">
                  <Label htmlFor="webhook-url" className="text-sm">
                    Webhook URL
                  </Label>
                  <Input
                    id="webhook-url"
                    type="url"
                    placeholder="https://example.com/webhook"
                    value={webhookUrl}
                    onChange={(e) =>
                      updateValue(["channels", "webhook", "url"], e.target.value)
                    }
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    URL to receive webhook notifications
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="webhook-secret" className="text-sm">
                    Webhook Secret (Optional)
                  </Label>
                  <Input
                    id="webhook-secret"
                    type="password"
                    placeholder="Secret for HMAC signature"
                    value={webhookSecret}
                    onChange={(e) =>
                      updateValue(["channels", "webhook", "secret"], e.target.value)
                    }
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Secret key for HMAC signature verification (optional)
                  </p>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex justify-between gap-4">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={resetMutation.isPending || !hasChanges}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset to Defaults
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending || !hasChanges}
            >
              <Save className="mr-2 h-4 w-4" />
              {updateMutation.isPending ? "Saving..." : "Save Preferences"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>About Delivery Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 text-sm text-muted-foreground">
            <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p>
                Proactive insights are automatically generated when certain conditions are met in your data.
                Configure how you want to receive these insights through different channels.
              </p>
              <ul className="list-inside list-disc space-y-1 ml-4">
                <li>
                  <strong>In-App:</strong> Notifications appear in the application interface
                </li>
                <li>
                  <strong>Dashboard:</strong> Insights are displayed in the dashboard widget
                </li>
                <li>
                  <strong>Email:</strong> Receive insights via email (immediate or digest)
                </li>
                <li>
                  <strong>Webhook:</strong> Send insights to an external system via HTTP POST
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

