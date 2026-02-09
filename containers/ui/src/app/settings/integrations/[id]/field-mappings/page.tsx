/**
 * Tenant Admin: Field Mapping Configuration
 * Map external fields to internal fields, configure transforms, test mappings
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';

interface FieldMapping {
  externalField: string;
  shardField: string;
  transform?: string;
  required?: boolean;
}

interface Field {
  name: string;
  label: string;
  type: string;
  required: boolean;
  description?: string;
}

interface Transform {
  name: string;
  description: string;
  parameters: Array<{
    name: string;
    type: string;
    required: boolean;
    default?: string | number | boolean | null;
  }>;
}

interface Integration {
  id: string;
  name: string;
  integrationType: string;
  syncConfig?: {
    entityMappings?: Array<{
      externalEntity: string;
      fieldMappings: FieldMapping[];
    }>;
  };
}

export default function FieldMappingsPage() {
  const params = useParams();
  const router = useRouter();
  const integrationId = params.id as string;

  const [integration, setIntegration] = useState<Integration | null>(null);
  const [selectedEntityType, setSelectedEntityType] = useState<string>('Opportunity');
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [externalFields, setExternalFields] = useState<Field[]>([]);
  const [internalFields, setInternalFields] = useState<Field[]>([]);
  const [transforms, setTransforms] = useState<Transform[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showTester, setShowTester] = useState(false);

  const availableEntityTypes = ['Opportunity', 'Account', 'Contact', 'Lead', 'Case', 'Task', 'Event'];

  const fetchIntegration = useCallback(async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/integrations/${integrationId}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setIntegration(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [integrationId]);

  const fetchFieldMappings = useCallback(async () => {
    try {
      const res = await fetch(
        `${apiBaseUrl}/api/v1/integrations/${integrationId}/field-mappings/${selectedEntityType}`,
        {
          credentials: 'include',
        }
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setFieldMappings(Array.isArray(json?.fieldMappings) ? json.fieldMappings : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setFieldMappings([]);
    }
  }, [integrationId, selectedEntityType]);

  const fetchExternalFields = useCallback(async () => {
    try {
      const res = await fetch(
        `${apiBaseUrl}/api/v1/integrations/${integrationId}/external-fields/${selectedEntityType}`,
        {
          credentials: 'include',
        }
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setExternalFields(Array.isArray(json?.fields) ? json.fields : []);
    } catch (e) {
      setExternalFields([]);
    }
  }, [integrationId, selectedEntityType]);

  const fetchInternalFields = useCallback(async () => {
    try {
      const res = await fetch(
        `${apiBaseUrl}/api/v1/integrations/${integrationId}/internal-fields/${selectedEntityType}`,
        {
          credentials: 'include',
        }
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setInternalFields(Array.isArray(json?.fields) ? json.fields : []);
    } catch (e) {
      setInternalFields([]);
    }
  }, [integrationId, selectedEntityType]);

  const fetchTransforms = useCallback(async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/integrations/transform-functions`, {
        credentials: 'include',
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setTransforms(Array.isArray(json?.transforms) ? json.transforms : []);
    } catch (e) {
      setTransforms([]);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchIntegration(),
      fetchTransforms(),
    ]).finally(() => {
      setLoading(false);
    });
  }, [fetchIntegration, fetchTransforms]);

  useEffect(() => {
    if (selectedEntityType) {
      Promise.all([
        fetchFieldMappings(),
        fetchExternalFields(),
        fetchInternalFields(),
      ]);
    }
  }, [selectedEntityType, fetchFieldMappings, fetchExternalFields, fetchInternalFields]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `${apiBaseUrl}/api/v1/integrations/${integrationId}/field-mappings/${selectedEntityType}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ fieldMappings }),
        }
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      await fetchFieldMappings();
      setShowEditor(false);
      setEditingIndex(null);
      alert('Field mappings saved successfully');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      alert(`Failed to save: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (index: number) => {
    if (confirm('Are you sure you want to delete this field mapping?')) {
      setFieldMappings(fieldMappings.filter((_, i) => i !== index));
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetch(
        `${apiBaseUrl}/api/v1/integrations/${integrationId}/field-mappings/${selectedEntityType}/export`,
        {
          credentials: 'include',
        }
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      const json = await res.json();
      const dataStr = JSON.stringify(json.fieldMappings || fieldMappings, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `field-mappings-${selectedEntityType}-${new Date().toISOString()}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(`Failed to export: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const mappings = Array.isArray(data) ? data : data.fieldMappings || [];
        
        const res = await fetch(
          `${apiBaseUrl}/api/v1/integrations/${integrationId}/field-mappings/${selectedEntityType}/import`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ fieldMappings: mappings }),
          }
        );
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
        }
        await fetchFieldMappings();
        alert('Field mappings imported successfully');
      } catch (e) {
        alert(`Failed to import: ${e instanceof Error ? e.message : String(e)}`);
      }
    };
    input.click();
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-500">Loading field mappings…</p>
      </div>
    );
  }

  if (error && !integration) {
    return (
      <div className="p-6">
        <div className="rounded-lg border p-6 bg-white dark:bg-gray-900">
          <p className="text-sm text-red-600 dark:text-red-400">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/settings/integrations" className="text-sm font-medium hover:underline">
          ← Integrations
        </Link>
        <span className="text-sm text-gray-500">/</span>
        <Link href={`/settings/integrations/${integrationId}`} className="text-sm font-medium hover:underline">
          {integration?.name || 'Integration'}
        </Link>
      </div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Field Mappings</h1>
          <p className="text-muted-foreground">
            Map external fields to internal fields for {integration?.name || 'integration'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={handleExport}>Export</Button>
          <Button variant="secondary" size="sm" onClick={handleImport}>Import</Button>
          <Button variant="outline" size="sm" className="text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800" onClick={() => setShowTester(true)}>Test</Button>
          <Button size="sm" onClick={() => { setEditingIndex(null); setShowEditor(true); }}>Add Mapping</Button>
        </div>
      </div>

      <div className="mb-4 space-y-2">
        <Label>Entity Type</Label>
        <Select value={selectedEntityType} onValueChange={setSelectedEntityType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableEntityTypes.map((type) => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="rounded-lg border p-4 bg-red-50 dark:bg-red-900/20 mb-4">
          <p className="text-sm text-red-600 dark:text-red-400">Error: {error}</p>
        </div>
      )}

      <div className="rounded-lg border bg-white dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">External Field</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Internal Field</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transform</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Required</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {fieldMappings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                    No field mappings configured. Click "Add Mapping" to create one.
                  </td>
                </tr>
              ) : (
                fieldMappings.map((mapping, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-4 py-3 text-sm">{mapping.externalField}</td>
                    <td className="px-4 py-3 text-sm">{mapping.shardField}</td>
                    <td className="px-4 py-3 text-sm">{mapping.transform || '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      {mapping.required ? (
                        <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          Required
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                          Optional
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Button variant="link" size="sm" className="p-0 h-auto text-primary mr-3" onClick={() => { setEditingIndex(index); setShowEditor(true); }}>Edit</Button>
                      <Button variant="link" size="sm" className="p-0 h-auto text-destructive" onClick={() => handleDelete(index)}>Delete</Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showEditor && (
        <FieldMappingEditor
          mapping={editingIndex !== null ? fieldMappings[editingIndex] : undefined}
          externalFields={externalFields}
          internalFields={internalFields}
          transforms={transforms}
          onSave={(mapping) => {
            if (editingIndex !== null) {
              const newMappings = [...fieldMappings];
              newMappings[editingIndex] = mapping;
              setFieldMappings(newMappings);
            } else {
              setFieldMappings([...fieldMappings, mapping]);
            }
            setShowEditor(false);
            setEditingIndex(null);
          }}
          onCancel={() => {
            setShowEditor(false);
            setEditingIndex(null);
          }}
        />
      )}

      {showTester && (
        <FieldMappingTester
          mappings={fieldMappings}
          entityType={selectedEntityType}
          integrationId={integrationId}
          onClose={() => setShowTester(false)}
        />
      )}

      {fieldMappings.length > 0 && (
        <div className="mt-4 flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Mappings'}
          </Button>
        </div>
      )}
    </div>
  );
}

interface FieldMappingEditorProps {
  mapping?: FieldMapping;
  externalFields: Field[];
  internalFields: Field[];
  transforms: Transform[];
  onSave: (mapping: FieldMapping) => void;
  onCancel: () => void;
}

function FieldMappingEditor({
  mapping,
  externalFields,
  internalFields,
  transforms,
  onSave,
  onCancel,
}: FieldMappingEditorProps) {
  const [externalField, setExternalField] = useState(mapping?.externalField || '');
  const [shardField, setShardField] = useState(mapping?.shardField || '');
  const [transform, setTransform] = useState(mapping?.transform || '');
  const [required, setRequired] = useState(mapping?.required || false);

  const handleSave = () => {
    if (!externalField || !shardField) {
      alert('External field and internal field are required');
      return;
    }
    onSave({
      externalField,
      shardField,
      transform: transform || undefined,
      required,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">{mapping ? 'Edit' : 'Add'} Field Mapping</h2>
          <Button variant="ghost" size="icon" onClick={onCancel} aria-label="Close">×</Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>External Field *</Label>
            <Select value={externalField || '_none'} onValueChange={(v) => setExternalField(v === '_none' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select external field" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Select external field</SelectItem>
                {externalFields.map((field) => (
                  <SelectItem key={field.name} value={field.name}>{field.label} ({field.name})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Internal Field *</Label>
            <Select value={shardField || '_none'} onValueChange={(v) => setShardField(v === '_none' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select internal field" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Select internal field</SelectItem>
                {internalFields.map((field) => (
                  <SelectItem key={field.name} value={field.name}>{field.label} ({field.name})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Transform Function (optional)</Label>
            <Select value={transform || '_none'} onValueChange={(v) => setTransform(v === '_none' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">None</SelectItem>
                {transforms.map((t) => (
                  <SelectItem key={t.name} value={t.name}>{t.name} - {t.description}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="req-field" checked={required} onCheckedChange={(c) => setRequired(!!c)} />
            <Label htmlFor="req-field" className="text-sm cursor-pointer">Required field</Label>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </div>
      </div>
    </div>
  );
}

interface FieldMappingTesterProps {
  mappings: FieldMapping[];
  entityType: string;
  integrationId: string;
  onClose: () => void;
}

function FieldMappingTester({ mappings, entityType, integrationId, onClose }: FieldMappingTesterProps) {
  const [testData, setTestData] = useState('{}');
  const [result, setResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTest = async () => {
    setTesting(true);
    setError(null);
    try {
      const parsedData = JSON.parse(testData);
      const res = await fetch(
        `${apiBaseUrl}/api/v1/integrations/${integrationId}/field-mappings/${entityType}/test`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            testData: parsedData,
            fieldMappings: mappings,
          }),
        }
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setResult(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Test Field Mappings</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">×</Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Test Data (JSON)</Label>
            <Textarea
              value={testData}
              onChange={(e) => setTestData(e.target.value)}
              className="font-mono text-sm"
              rows={15}
              placeholder='{"Id": "123", "Name": "Test Opportunity", ...}'
            />
          </div>
          <div>
            <Label className="mb-2 block text-sm font-medium">Transformed Data</Label>
            <div className="w-full px-3 py-2 border rounded bg-gray-50 dark:bg-gray-800 font-mono text-sm min-h-[200px]">
              {result ? (
                <pre className="whitespace-pre-wrap">{JSON.stringify(result.transformedData || result, null, 2)}</pre>
              ) : (
                <p className="text-gray-500">Click "Test" to see transformed data</p>
              )}
            </div>
            {result?.errors && result.errors.length > 0 && (
              <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded">
                <p className="text-sm font-medium text-red-800 dark:text-red-200">Errors:</p>
                <ul className="text-xs text-red-700 dark:text-red-300 list-disc list-inside">
                  {result.errors.map((err: { message?: string } | string, i: number) => (
                    <li key={i}>{typeof err === 'string' ? err : (typeof err === 'object' && err && 'message' in err ? (err as { message?: string }).message : undefined) ?? JSON.stringify(err)}</li>
                  ))}
                </ul>
              </div>
            )}
            {result?.warnings && result.warnings.length > 0 && (
              <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Warnings:</p>
                <ul className="text-xs text-yellow-700 dark:text-yellow-300 list-disc list-inside">
                  {result.warnings.map((warn: { message?: string } | string, i: number) => (
                    <li key={i}>{typeof warn === 'string' ? warn : (typeof warn === 'object' && warn && 'message' in warn ? (warn as { message?: string }).message : undefined) ?? JSON.stringify(warn)}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4 p-2 bg-red-50 dark:bg-red-900/20 rounded">
            <p className="text-sm text-red-600 dark:text-red-400">Error: {error}</p>
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Close</Button>
          <Button onClick={handleTest} disabled={testing}>
            {testing ? 'Testing...' : 'Test'}
          </Button>
        </div>
      </div>
    </div>
  );
}
