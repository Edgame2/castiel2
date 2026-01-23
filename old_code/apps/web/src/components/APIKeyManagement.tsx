import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import { trackException, trackTrace } from '@/lib/monitoring/app-insights';
import {
  Key,
  Plus,
  Copy,
  Eye,
  EyeOff,
  Trash2,
  Clock,
  AlertCircle,
  CheckCircle,
  X,
} from 'lucide-react';

interface APIKey {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt?: string;
  expiresAt?: string;
  permissions: string[];
  rateLimit: {
    hourly: number;
    daily: number;
    concurrent: number;
  };
  usageStats: {
    requests: number;
    lastRequest?: string;
  };
}

interface CreateKeyForm {
  name: string;
  permissions: string[];
  expiresIn?: 'never' | '90days' | '1year';
  rateLimit: {
    hourly: number;
    daily: number;
    concurrent: number;
  };
}

const AVAILABLE_PERMISSIONS = [
  'projects:read',
  'projects:create',
  'projects:update',
  'projects:delete',
  'versions:read',
  'versions:create',
  'versions:publish',
  'analytics:read',
  'webhooks:manage',
  'audit:read',
];

const APIKeyManagement: React.FC = () => {
  const [keys, setKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<{ id: string; secret: string } | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [visibleKeyId, setVisibleKeyId] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState<CreateKeyForm>({
    name: '',
    permissions: [],
    expiresIn: '90days',
    rateLimit: {
      hourly: 1000,
      daily: 10000,
      concurrent: 100,
    },
  });

  // Fetch API keys
  const fetchKeys = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/v1/enterprise/api-keys' as any);
      setKeys(response.data.data || []);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      trackException(errorObj, 3)
      trackTrace('Failed to fetch API keys', 3, {
        errorMessage: errorObj.message,
      })
      setMessage({ type: 'error', text: 'Failed to load API keys' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  // Generate new API key
  const generateKey = async () => {
    if (!createForm.name.trim()) {
      setMessage({ type: 'error', text: 'Key name is required' });
      return;
    }

    if (createForm.permissions.length === 0) {
      setMessage({ type: 'error', text: 'Select at least one permission' });
      return;
    }

    try {
      const response = await apiClient.post('/api/v1/enterprise/api-keys', createForm);
      setGeneratedKey(response.data.data);
      setMessage({ type: 'success', text: 'API key generated successfully' });
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      trackException(errorObj, 3)
      trackTrace('Failed to generate API key', 3, {
        errorMessage: errorObj.message,
        keyName: createForm.name,
      })
      setMessage({ type: 'error', text: 'Failed to generate API key' });
    }
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setMessage({ type: 'success', text: 'Copied to clipboard!' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to copy' });
    }
  };

  // Revoke API key
  const revokeKey = async (keyId: string) => {
    if (!window.confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return;
    }

    try {
      await apiClient.delete(`/api/v1/enterprise/api-keys/${keyId}`);
      setKeys((prev) => prev.filter((k) => k.id !== keyId));
      setMessage({ type: 'success', text: 'API key revoked successfully' });
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      trackException(errorObj, 3)
      trackTrace('Failed to revoke API key', 3, {
        errorMessage: errorObj.message,
        keyId,
      })
      setMessage({ type: 'error', text: 'Failed to revoke API key' });
    }
  };

  // Toggle permission
  const togglePermission = (permission: string) => {
    setCreateForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((p) => p !== permission)
        : [...prev.permissions, permission],
    }));
  };

  // Close modal
  const closeModal = () => {
    setShowCreateModal(false);
    setGeneratedKey(null);
    setCreateForm({
      name: '',
      permissions: [],
      expiresIn: '90days',
      rateLimit: {
        hourly: 1000,
        daily: 10000,
        concurrent: 100,
      },
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Key className="w-8 h-8 text-gray-700" />
            <h1 className="text-3xl font-bold text-gray-900">API Keys</h1>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition"
          >
            <Plus className="w-4 h-4" />
            Create API Key
          </button>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
              message.type === 'success'
                ? 'bg-green-100 border border-green-400 text-green-700'
                : 'bg-red-100 border border-red-400 text-red-700'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            {message.text}
          </div>
        )}

        {/* Info Card */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-900 text-sm">
            <strong>Note:</strong> API keys are displayed only once when created. Store them
            securely and never share them.
          </p>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-gray-600">Loading API keys...</p>
          </div>
        ) : keys.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <Key className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No API keys yet</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 text-blue-500 hover:text-blue-700"
            >
              Create your first API key
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {keys.map((key) => (
              <div key={key.id} className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{key.name}</h3>
                    <p className="text-sm text-gray-600 font-mono">
                      Prefix: <span className="bg-gray-100 px-2 py-1 rounded">{key.prefix}...</span>
                    </p>
                  </div>
                  <button
                    onClick={() => revokeKey(key.id)}
                    className="text-red-500 hover:text-red-700 p-2"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                {/* Key Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-600">Created</p>
                    <p className="text-sm text-gray-900">
                      {new Date(key.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {key.lastUsedAt && (
                    <div>
                      <p className="text-xs text-gray-600">Last Used</p>
                      <p className="text-sm text-gray-900">
                        {new Date(key.lastUsedAt).toLocaleString()}
                      </p>
                    </div>
                  )}
                  {key.expiresAt && (
                    <div>
                      <p className="text-xs text-gray-600">Expires</p>
                      <p className="text-sm text-gray-900">
                        {new Date(key.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>

                {/* Permissions */}
                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-600 mb-2">Permissions</p>
                  <div className="flex flex-wrap gap-2">
                    {key.permissions.map((perm) => (
                      <span
                        key={perm}
                        className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                      >
                        {perm}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Rate Limits */}
                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-600 mb-2">Rate Limits</p>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="bg-gray-50 p-2 rounded">
                      <p className="text-gray-600">Hourly: {key.rateLimit.hourly} req/hr</p>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <p className="text-gray-600">Daily: {key.rateLimit.daily} req/day</p>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <p className="text-gray-600">Concurrent: {key.rateLimit.concurrent}</p>
                    </div>
                  </div>
                </div>

                {/* Usage Stats */}
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{key.usageStats.requests} requests total</span>
                  </div>
                  {key.usageStats.lastRequest && (
                    <span>Last used: {new Date(key.usageStats.lastRequest).toLocaleString()}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create API Key Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-gray-900">
                {generatedKey ? 'API Key Generated' : 'Create New API Key'}
              </h2>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {generatedKey ? (
              // Display Generated Key
              <div className="p-6 space-y-6">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-900 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Your API key has been created successfully!
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Your API Key</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={generatedKey.secret}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
                    />
                    <button
                      onClick={() => copyToClipboard(generatedKey.secret)}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-600">
                    Save this key securely. You won't be able to see it again.
                  </p>
                </div>

                <button
                  onClick={closeModal}
                  className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
                >
                  Done
                </button>
              </div>
            ) : (
              // Create Form
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Key Name
                  </label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    placeholder="e.g., Production API Key"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expiration
                  </label>
                  <select
                    value={createForm.expiresIn}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, expiresIn: e.target.value as any })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="never">Never</option>
                    <option value="90days">90 Days</option>
                    <option value="1year">1 Year</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Permissions
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {AVAILABLE_PERMISSIONS.map((perm) => (
                      <label key={perm} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={createForm.permissions.includes(perm)}
                          onChange={() => togglePermission(perm)}
                          className="w-4 h-4 rounded"
                        />
                        <span className="text-sm text-gray-700">{perm}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Rate Limits
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Hourly</p>
                      <input
                        type="number"
                        value={createForm.rateLimit.hourly}
                        onChange={(e) =>
                          setCreateForm({
                            ...createForm,
                            rateLimit: {
                              ...createForm.rateLimit,
                              hourly: parseInt(e.target.value),
                            },
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Daily</p>
                      <input
                        type="number"
                        value={createForm.rateLimit.daily}
                        onChange={(e) =>
                          setCreateForm({
                            ...createForm,
                            rateLimit: {
                              ...createForm.rateLimit,
                              daily: parseInt(e.target.value),
                            },
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Concurrent</p>
                      <input
                        type="number"
                        value={createForm.rateLimit.concurrent}
                        onChange={(e) =>
                          setCreateForm({
                            ...createForm,
                            rateLimit: {
                              ...createForm.rateLimit,
                              concurrent: parseInt(e.target.value),
                            },
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={closeModal}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={generateKey}
                    className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
                  >
                    Generate Key
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default APIKeyManagement;
