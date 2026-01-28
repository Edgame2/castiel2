/**
 * Tenant Admin: Field Mapping Configuration
 * Map external fields to internal fields, configure transforms, test mappings
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

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
    default?: any;
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
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-sm"
          >
            Export
          </button>
          <button
            onClick={handleImport}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-sm"
          >
            Import
          </button>
          <button
            onClick={() => setShowTester(true)}
            className="px-4 py-2 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800 text-sm"
          >
            Test
          </button>
          <button
            onClick={() => {
              setEditingIndex(null);
              setShowEditor(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            Add Mapping
          </button>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Entity Type</label>
        <select
          value={selectedEntityType}
          onChange={(e) => setSelectedEntityType(e.target.value)}
          className="px-3 py-2 border rounded"
        >
          {availableEntityTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
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
                      <button
                        onClick={() => {
                          setEditingIndex(index);
                          setShowEditor(true);
                        }}
                        className="text-blue-600 hover:underline mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(index)}
                        className="text-red-600 hover:underline"
                      >
                        Delete
                      </button>
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
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Mappings'}
          </button>
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
          <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">External Field *</label>
            <select
              value={externalField}
              onChange={(e) => setExternalField(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="">Select external field</option>
              {externalFields.map((field) => (
                <option key={field.name} value={field.name}>
                  {field.label} ({field.name})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Internal Field *</label>
            <select
              value={shardField}
              onChange={(e) => setShardField(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="">Select internal field</option>
              {internalFields.map((field) => (
                <option key={field.name} value={field.name}>
                  {field.label} ({field.name})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Transform Function (optional)</label>
            <select
              value={transform}
              onChange={(e) => setTransform(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="">None</option>
              {transforms.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.name} - {t.description}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={required}
                onChange={(e) => setRequired(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">Required field</span>
            </label>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:underline"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Save
          </button>
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
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ×
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Test Data (JSON)</label>
            <textarea
              value={testData}
              onChange={(e) => setTestData(e.target.value)}
              className="w-full px-3 py-2 border rounded font-mono text-sm"
              rows={15}
              placeholder='{"Id": "123", "Name": "Test Opportunity", ...}'
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Transformed Data</label>
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
                  {result.errors.map((err: any, i: number) => (
                    <li key={i}>{err.message || JSON.stringify(err)}</li>
                  ))}
                </ul>
              </div>
            )}
            {result?.warnings && result.warnings.length > 0 && (
              <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Warnings:</p>
                <ul className="text-xs text-yellow-700 dark:text-yellow-300 list-disc list-inside">
                  {result.warnings.map((warn: any, i: number) => (
                    <li key={i}>{warn.message || JSON.stringify(warn)}</li>
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
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:underline"
          >
            Close
          </button>
          <button
            onClick={handleTest}
            disabled={testing}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {testing ? 'Testing...' : 'Test'}
          </button>
        </div>
      </div>
    </div>
  );
}
