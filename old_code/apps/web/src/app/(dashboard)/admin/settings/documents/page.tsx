'use client';

import { useCallback, useState, useEffect } from 'react';
import { GlobalDocumentSettings, TenantDocumentSettings } from '@/types/documents';
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
import { Settings as SettingsIcon, Save, Server, Shield, FileText, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useGlobalSettings } from '@/hooks/useGlobalSettings';
import { useTenants } from '@/hooks/use-tenants';

/**
 * Super Admin Global Document Settings Page
 */
export default function GlobalDocumentSettingsPage() {
    const { settings, isLoading, updateSettings, isUpdating, getTenantOverrides, updateTenantOverrides } = useGlobalSettings();
    const { data: tenantList } = useTenants();

    // Global Settings State
    const [localSettings, setLocalSettings] = useState<GlobalDocumentSettings | null>(null);

    // Tenant Override State
    const [selectedTenantId, setSelectedTenantId] = useState<string>('');
    const [tenantSettings, setTenantSettings] = useState<TenantDocumentSettings | null>(null);
    const [isOverrideLoading, setIsOverrideLoading] = useState(false);
    const [isOverrideSaving, setIsOverrideSaving] = useState(false);

    useEffect(() => {
        if (settings && !localSettings) {
            setLocalSettings(settings);
        }
    }, [settings, localSettings]);

    // Fetch tenant settings when selected
    useEffect(() => {
        if (!selectedTenantId) {
            setTenantSettings(null);
            return;
        }

        const fetchTenantSettings = async () => {
            setIsOverrideLoading(true);
            try {
                const data = await getTenantOverrides(selectedTenantId);
                setTenantSettings(data);
            } catch (error) {
                toast.error('Failed to load tenant settings');
                setTenantSettings(null);
            } finally {
                setIsOverrideLoading(false);
            }
        };

        fetchTenantSettings();
    }, [selectedTenantId, getTenantOverrides]);

    const handleSettingChange = useCallback(
        <K extends keyof GlobalDocumentSettings>(
            key: K,
            value: GlobalDocumentSettings[K]
        ) => {
            setLocalSettings((prev) => (prev ? { ...prev, [key]: value } : null));
        },
        []
    );

    const handleTenantSettingChange = useCallback(
        <K extends keyof TenantDocumentSettings>(
            key: K,
            value: TenantDocumentSettings[K]
        ) => {
            setTenantSettings((prev) => (prev ? { ...prev, [key]: value } : null));
        },
        []
    );

    const handleSave = useCallback(async () => {
        if (!localSettings) return;
        try {
            await updateSettings(localSettings);
            toast.success('Settings saved', {
                description: 'Global document settings have been updated.',
            });
        } catch (error) {
            toast.error('Error', {
                description: 'Failed to save global settings.',
            });
        }
    }, [localSettings, updateSettings]);

    const handleSaveOverride = useCallback(async () => {
        if (!selectedTenantId || !tenantSettings) return;
        setIsOverrideSaving(true);
        try {
            await updateTenantOverrides({ tenantId: selectedTenantId, data: tenantSettings });
            toast.success('Override saved', {
                description: 'Tenant document settings have been updated.',
            });
        } catch (error) {
            toast.error('Error', {
                description: 'Failed to save tenant override.',
            });
        } finally {
            setIsOverrideSaving(false);
        }
    }, [selectedTenantId, tenantSettings, updateTenantOverrides]);

    if (isLoading || !localSettings) {
        return <div className="p-8">Loading global settings...</div>;
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <SettingsIcon className="h-8 w-8" />
                        Global Document Settings
                    </h2>
                    <p className="text-muted-foreground">System-wide configuration and default limits for all tenants</p>
                </div>
            </div>

            <Tabs defaultValue="system">
                <TabsList className="mb-4">
                    <TabsTrigger value="system" className="gap-2">
                        <Server className="h-4 w-4" />
                        System Limits
                    </TabsTrigger>
                    <TabsTrigger value="defaults" className="gap-2">
                        <FileText className="h-4 w-4" />
                        Tenant Defaults
                    </TabsTrigger>
                    <TabsTrigger value="retention" className="gap-2">
                        <Shield className="h-4 w-4" />
                        Retention
                    </TabsTrigger>
                    <TabsTrigger value="overrides" className="gap-2">
                        <Users className="h-4 w-4" />
                        Tenant Overrides
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="system" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>System Hard Limits</CardTitle>
                            <CardDescription>Absolute limits that no tenant can exceed</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label>Global Max File Size (MB)</Label>
                                <Input
                                    type="number"
                                    value={localSettings.globalMaxFileSizeBytes / 1048576}
                                    onChange={(e) => handleSettingChange('globalMaxFileSizeBytes', parseInt(e.target.value) * 1048576)}
                                    className="w-40"
                                />
                                <p className="text-xs text-gray-500">Maximum file size allowed across the entire system</p>
                            </div>
                            <div className="space-y-2">
                                <Label>Global Max Storage per Tenant (GB)</Label>
                                <Input
                                    type="number"
                                    value={localSettings.globalMaxStorageSizeBytes / 1073741824}
                                    onChange={(e) => handleSettingChange('globalMaxStorageSizeBytes', parseInt(e.target.value) * 1073741824)}
                                    className="w-40"
                                />
                                <p className="text-xs text-gray-500">Maximum storage allocated to any single tenant</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Feature Toggles</CardTitle>
                            <CardDescription>Enable or disable system-wide modules</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label>Enable Document Management</Label>
                                <Switch
                                    checked={localSettings.enableDocumentManagement}
                                    onCheckedChange={(c) => handleSettingChange('enableDocumentManagement', c)}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label>Enable Bulk Operations</Label>
                                <Switch
                                    checked={localSettings.enableBulkOperations}
                                    onCheckedChange={(c) => handleSettingChange('enableBulkOperations', c)}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <div className="mt-6 flex justify-end">
                        <Button onClick={handleSave} disabled={isUpdating} className="gap-2">
                            <Save className="h-4 w-4" />
                            {isUpdating ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </TabsContent>

                <TabsContent value="defaults" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>New Tenant Defaults</CardTitle>
                            <CardDescription>Default settings applied when a new tenant is created</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label>Default Max File Size (MB)</Label>
                                <Input
                                    type="number"
                                    value={localSettings.defaultTenantMaxFileSizeBytes / 1048576}
                                    onChange={(e) => handleSettingChange('defaultTenantMaxFileSizeBytes', parseInt(e.target.value) * 1048576)}
                                    className="w-40"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Default Storage Quota (GB)</Label>
                                <Input
                                    type="number"
                                    value={localSettings.defaultTenantMaxStorageBytes / 1073741824}
                                    onChange={(e) => handleSettingChange('defaultTenantMaxStorageBytes', parseInt(e.target.value) * 1073741824)}
                                    className="w-40"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Default Daily Upload Limit (files)</Label>
                                <Input
                                    type="number"
                                    value={localSettings.defaultDailyUploadLimit}
                                    onChange={(e) => handleSettingChange('defaultDailyUploadLimit', parseInt(e.target.value))}
                                    className="w-40"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Default Monthly Upload Limit (files)</Label>
                                <Input
                                    type="number"
                                    value={localSettings.defaultMonthlyUploadLimit}
                                    onChange={(e) => handleSettingChange('defaultMonthlyUploadLimit', parseInt(e.target.value))}
                                    className="w-40"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <div className="mt-6 flex justify-end">
                        <Button onClick={handleSave} disabled={isUpdating} className="gap-2">
                            <Save className="h-4 w-4" />
                            {isUpdating ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </TabsContent>

                <TabsContent value="retention" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>System Retention Policy</CardTitle>
                            <CardDescription>Global retention rules and hard delete thresholds</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label>Default Retention Days</Label>
                                <Input
                                    type="number"
                                    value={localSettings.defaultRetentionDays}
                                    onChange={(e) => handleSettingChange('defaultRetentionDays', parseInt(e.target.value))}
                                    className="w-40"
                                />
                                <p className="text-xs text-gray-500">Default retention period for new tenants</p>
                            </div>
                            <div className="space-y-2">
                                <Label>Hard Delete After (Days)</Label>
                                <Input
                                    type="number"
                                    value={localSettings.hardDeleteAfterDays}
                                    onChange={(e) => handleSettingChange('hardDeleteAfterDays', parseInt(e.target.value))}
                                    className="w-40"
                                />
                                <p className="text-xs text-gray-500">Days after soft-deletion to permanently remove files (0 = never)</p>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="mt-6 flex justify-end">
                        <Button onClick={handleSave} disabled={isUpdating} className="gap-2">
                            <Save className="h-4 w-4" />
                            {isUpdating ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </TabsContent>

                <TabsContent value="overrides" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Tenant Configuration Selection</CardTitle>
                            <CardDescription>Select a tenant to override their specific settings</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col gap-4">
                                <div className="space-y-2">
                                    <Label>Select Tenant</Label>
                                    <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                                        <SelectTrigger className="w-[300px]">
                                            <SelectValue placeholder="Search or select a tenant..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {tenantList?.tenants?.map((tenant) => (
                                                <SelectItem key={tenant.id} value={tenant.id}>
                                                    {tenant.name} ({tenant.slug})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {selectedTenantId && (
                        <>
                            {isOverrideLoading ? (
                                <div className="text-sm text-gray-500">Loading tenant settings...</div>
                            ) : tenantSettings ? (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Override Settings</CardTitle>
                                        <CardDescription>
                                            These settings will take precedence over system defaults but cannot exceed hard limits.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="space-y-2">
                                            <Label>Max File Size (MB)</Label>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="number"
                                                    value={tenantSettings.maxFileSizeBytes / 1048576}
                                                    onChange={(e) => handleTenantSettingChange('maxFileSizeBytes', parseInt(e.target.value) * 1048576)}
                                                    className="w-40"
                                                />
                                                <span className="text-sm text-gray-500">
                                                    (Limit: {localSettings.globalMaxFileSizeBytes / 1048576} MB)
                                                </span>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Max Storage Quota (GB)</Label>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="number"
                                                    value={tenantSettings.maxStorageSizeBytes / 1073741824}
                                                    onChange={(e) => handleTenantSettingChange('maxStorageSizeBytes', parseInt(e.target.value) * 1073741824)}
                                                    className="w-40"
                                                />
                                                <span className="text-sm text-gray-500">
                                                    (Limit: {localSettings.globalMaxStorageSizeBytes / 1073741824} GB)
                                                </span>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Daily Upload Limit</Label>
                                            <Input
                                                type="number"
                                                value={tenantSettings.dailyUploadLimit}
                                                onChange={(e) => handleTenantSettingChange('dailyUploadLimit', parseInt(e.target.value))}
                                                className="w-40"
                                            />
                                        </div>

                                        <div className="space-y-4 pt-4 border-t">
                                            <div className="space-y-2">
                                                <Label htmlFor="override-mime-types">Allowed File Types</Label>
                                                <Select
                                                    value={
                                                        tenantSettings.acceptedMimeTypes?.length === 1 && tenantSettings.acceptedMimeTypes[0] === '*/*'
                                                            ? 'all'
                                                            : 'custom'
                                                    }
                                                    onValueChange={(value) => {
                                                        if (value === 'all') {
                                                            handleTenantSettingChange('acceptedMimeTypes', ['*/*']);
                                                        } else if (value === 'custom') {
                                                            if (tenantSettings.acceptedMimeTypes?.[0] === '*/*') {
                                                                handleTenantSettingChange('acceptedMimeTypes', []);
                                                            }
                                                        }
                                                    }}
                                                >
                                                    <SelectTrigger id="override-mime-types" className="w-[300px]">
                                                        <SelectValue placeholder="Select file types" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">All file types</SelectItem>
                                                        <SelectItem value="custom">Custom</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {(tenantSettings.acceptedMimeTypes?.length !== 1 || tenantSettings.acceptedMimeTypes[0] !== '*/*') && (
                                                <div className="space-y-2 pl-4 border-l-2 border-slate-200">
                                                    <Label htmlFor="override-custom-mime-types">Custom Extensions / MIME Types</Label>
                                                    <Input
                                                        id="override-custom-mime-types"
                                                        value={tenantSettings.acceptedMimeTypes?.join(', ') || ''}
                                                        onChange={(e) => {
                                                            const value = e.target.value;
                                                            const types = value.split(',' as any).map((t) => t.trim()).filter(Boolean);
                                                            handleTenantSettingChange('acceptedMimeTypes', types);
                                                        }}
                                                        placeholder="e.g. .pdf, .docx, image/*, application/json"
                                                        className="max-w-md"
                                                    />
                                                    <p className="text-xs text-gray-500">
                                                        Enter comma-separated file extensions (e.g. .pdf) or MIME types (e.g. image/png).
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="text-sm text-red-500">Failed to load settings or none found.</div>
                            )}

                            <div className="mt-6 flex justify-end">
                                <Button onClick={handleSaveOverride} disabled={isOverrideSaving} className="gap-2">
                                    <Save className="h-4 w-4" />
                                    {isOverrideSaving ? 'Saving...' : 'Save Override'}
                                </Button>
                            </div>
                        </>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
