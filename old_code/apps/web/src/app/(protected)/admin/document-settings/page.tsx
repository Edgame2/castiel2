'use client';

import { useCallback, useState, useEffect } from 'react';
import { TenantDocumentSettings } from '@/types/documents';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { FileText, Shield, Database, Settings as SettingsIcon, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useTenantSettings } from '@/hooks/useTenantSettings';

/**
 * Admin document settings page
 * Configures tenant-level document management settings
 */
export default function DocumentSettingsPage() {
  const { settings, isLoading, updateSettings, isUpdating } = useTenantSettings();
  const [localSettings, setLocalSettings] = useState<TenantDocumentSettings | null>(null);

  // Update local settings when data is fetched
  useEffect(() => {
    if (settings && !localSettings) {
      setLocalSettings(settings);
    }
  }, [settings, localSettings]);

  // Handle settings change
  const handleSettingChange = useCallback(
    <K extends keyof TenantDocumentSettings>(
      key: K,
      value: TenantDocumentSettings[K]
    ) => {
      setLocalSettings((prev) => (prev ? { ...prev, [key]: value } : null));
    },
    []
  );

  // Handle save
  const handleSave = useCallback(async () => {
    if (!localSettings) return;

    try {
      await updateSettings(localSettings);
      toast.success('Settings saved', {
        description: 'Document management settings have been updated.',
      });
    } catch (error) {
      toast.error('Error', {
        description: 'Failed to save settings. Please try again.',
      });
    }
  }, [localSettings, updateSettings]);

  // Format bytes to MB/GB
  const formatStorageSize = (bytes: number) => {
    if (bytes >= 1073741824) {
      return `${(bytes / 1073741824).toFixed(1)} GB`;
    }
    return `${(bytes / 1048576).toFixed(0)} MB`;
  };

  if (isLoading || !localSettings) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-sm text-gray-500">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <SettingsIcon className="h-8 w-8" />
            Document Management Settings
          </h2>
          <p className="text-muted-foreground">
            Configure document storage, security, and retention policies
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="general">
        <TabsList className="mb-4">
          <TabsTrigger value="general" className="gap-2">
            <FileText className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="storage" className="gap-2">
            <Database className="h-4 w-4" />
            Storage
          </TabsTrigger>
        </TabsList>

        {/* General settings */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>File Upload Settings</CardTitle>
              <CardDescription>
                Configure file upload limits and allowed types
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Max file size */}
              <div className="space-y-2">
                <Label htmlFor="max-file-size">Maximum File Size</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="max-file-size"
                    type="number"
                    value={localSettings.maxFileSizeBytes / 1048576}
                    onChange={(e) =>
                      handleSettingChange(
                        'maxFileSizeBytes',
                        parseInt(e.target.value) * 1048576
                      )
                    }
                    className="w-32"
                  />
                  <span className="text-sm text-gray-600">MB</span>
                </div>
                <p className="text-xs text-gray-500">
                  Maximum size per file upload
                </p>
              </div>

              <Separator />

              {/* Allowed MIME types */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="mime-types">Allowed File Types</Label>
                  <Select
                    value={
                      localSettings.acceptedMimeTypes?.length === 1 && localSettings.acceptedMimeTypes[0] === '*/*'
                        ? 'all'
                        : 'custom'
                    }
                    onValueChange={(value) => {
                      if (value === 'all') {
                        handleSettingChange('acceptedMimeTypes', ['*/*']);
                      } else if (value === 'custom') {
                        // If switching to custom, keep current if valid, else default to empty
                        if (localSettings.acceptedMimeTypes?.[0] === '*/*') {
                          handleSettingChange('acceptedMimeTypes', []);
                        }
                      }
                    }}
                  >
                    <SelectTrigger id="mime-types">
                      <SelectValue placeholder="Select file types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All file types</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    Restrict which file types can be uploaded
                  </p>
                </div>

                {/* Custom Mime Types Input */}
                {(localSettings.acceptedMimeTypes?.length !== 1 || localSettings.acceptedMimeTypes[0] !== '*/*') && (
                  <div className="space-y-2 pl-4 border-l-2 border-slate-200">
                    <Label htmlFor="custom-mime-types">Custom Extensions / MIME Types</Label>
                    <Input
                      id="custom-mime-types"
                      value={localSettings.acceptedMimeTypes?.join(', ') || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        const types = value.split(',' as any).map((t) => t.trim()).filter(Boolean);
                        handleSettingChange('acceptedMimeTypes', types);
                      }}
                      placeholder="e.g. .pdf, .docx, image/*, application/json"
                    />
                    <p className="text-xs text-gray-500">
                      Enter comma-separated file extensions (e.g. .pdf) or MIME types (e.g. image/png).
                    </p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Daily Upload Limit */}
              <div className="space-y-2">
                <Label htmlFor="daily-limit">Daily Upload Limit</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="daily-limit"
                    type="number"
                    value={localSettings.dailyUploadLimit}
                    onChange={(e) =>
                      handleSettingChange(
                        'dailyUploadLimit',
                        parseInt(e.target.value)
                      )
                    }
                    className="w-32"
                  />
                  <span className="text-sm text-gray-600">files</span>
                </div>
                <p className="text-xs text-gray-500">
                  Maximum files per day
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Retention Policy</CardTitle>
              <CardDescription>
                Configure document retention and cleanup
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="retention-days">Retention Period</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="retention-days"
                    type="number"
                    value={localSettings.defaultRetentionDays || 365}
                    onChange={(e) =>
                      handleSettingChange(
                        'defaultRetentionDays',
                        parseInt(e.target.value)
                      )
                    }
                    className="w-32"
                  />
                  <span className="text-sm text-gray-600">days</span>
                </div>
                <p className="text-xs text-gray-500">
                  Automatically delete documents after this period
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security settings */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Features</CardTitle>
              <CardDescription>
                Configure security and scanning options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Virus scanning */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="virus-scan">Enable Virus Scanning</Label>
                  <p className="text-xs text-gray-500">
                    Scan all uploaded files for malware
                  </p>
                </div>
                <Switch
                  id="virus-scan"
                  checked={localSettings.enableVirusScanning}
                  onCheckedChange={(checked) =>
                    handleSettingChange('enableVirusScanning', checked)
                  }
                />
              </div>

              <Separator />

              {/* Default visibility */}
              <div className="space-y-2">
                <Label htmlFor="default-visibility">Default Visibility</Label>
                <Select
                  value={localSettings.defaultVisibility}
                  onValueChange={(value) => handleSettingChange('defaultVisibility', value as any)}
                >
                  <SelectTrigger id="default-visibility">
                    <SelectValue placeholder="Select visibility" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="internal">Internal</SelectItem>
                    <SelectItem value="confidential">Confidential</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Default visibility level for new documents
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Storage settings */}
        <TabsContent value="storage" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Storage Configuration</CardTitle>
              <CardDescription>
                Manage storage quotas and usage
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Storage quota */}
              <div className="space-y-2">
                <Label htmlFor="storage-quota">Storage Quota</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="storage-quota"
                    type="number"
                    disabled={true} // Usually controlled by plan/global
                    value={
                      localSettings.maxStorageSizeBytes
                        ? localSettings.maxStorageSizeBytes / 1073741824
                        : 100
                    }
                    className="w-32 bg-gray-100"
                  />
                  <span className="text-sm text-gray-600">GB</span>
                </div>
                <p className="text-xs text-gray-500">
                  Maximum storage space (Controlled by your plan)
                </p>
              </div>

              <Separator />

              {/* Current usage */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Current Usage</Label>
                  <Badge variant="secondary">
                    {localSettings.currentStorageUsed > 0 ? (localSettings.currentStorageUsed / localSettings.maxStorageSizeBytes * 100).toFixed(1) : 0}% used
                  </Badge>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200">
                  <div className="h-2 rounded-full bg-blue-600"
                    style={{ width: `${Math.min((localSettings.currentStorageUsed / localSettings.maxStorageSizeBytes) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500">
                  {formatStorageSize(localSettings.currentStorageUsed || 0)} of {formatStorageSize(localSettings.maxStorageSizeBytes || 0)}{' '}
                  used
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Storage Location</CardTitle>
              <CardDescription>
                Azure Blob Storage configuration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-gray-500">Container</Label>
                  <p className="text-sm font-medium text-gray-900">
                    tenant-documents
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Region</Label>
                  <p className="text-sm font-medium text-gray-900">
                    East US
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">
                    Redundancy
                  </Label>
                  <p className="text-sm font-medium text-gray-900">
                    Geo-redundant (GRS)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save button */}
      <div className="mt-6 flex justify-end">
        <Button onClick={handleSave} disabled={isUpdating} className="gap-2">
          <Save className="h-4 w-4" />
          {isUpdating ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>

  );
}
