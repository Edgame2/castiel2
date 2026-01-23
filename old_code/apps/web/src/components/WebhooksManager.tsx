import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import { trackException, trackTrace } from '@/lib/monitoring/app-insights';
import {
  Webhook,
  Plus,
  Edit2,
  Trash2,
  Send,
  Eye,
  EyeOff,
  X,
  AlertCircle,
  CheckCircle,
  Clock,
  Activity,
} from 'lucide-react';

interface WebhookConfig {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  headers?: Record<string, string>;
  secret?: string;
  retryPolicy: {
    enabled: boolean;
    maxAttempts: number;
    backoffMultiplier: number;
  };
  createdAt: string;
  lastTriggeredAt?: string;
  deliveryStats: {
    total: number;
    successful: number;
    failed: number;
  };
}

interface CreateWebhookForm {
  url: string;
  events: string[];
  headers: { key: string; value: string }[];
  retryPolicy: {
    enabled: boolean;
    maxAttempts: number;
    backoffMultiplier: number;
  };
}

const AVAILABLE_EVENTS = [
  { id: 'project.created', label: 'Project Created' },
  { id: 'project.updated', label: 'Project Updated' },
  { id: 'project.deleted', label: 'Project Deleted' },
  { id: 'version.published', label: 'Version Published' },
  { id: 'version.rollback', label: 'Version Rollback' },
  { id: 'share.created', label: 'Share Created' },
  { id: 'share.updated', label: 'Share Updated' },
  { id: 'share.removed', label: 'Share Removed' },
  { id: 'analytics.event', label: 'Analytics Event' },
  { id: 'audit.event', label: 'Audit Event' },
];

const WebhooksManager: React.FC = () => {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showDeliveryLogs, setShowDeliveryLogs] = useState<string | null>(null);
  const [testingWebhookId, setTestingWebhookId] = useState<string | null>(null);
  const [deliveryLogs, setDeliveryLogs] = useState<any[]>([]);

  const [createForm, setCreateForm] = useState<CreateWebhookForm>({
    url: '',
    events: [],
    headers: [{ key: '', value: '' }],
    retryPolicy: {
      enabled: true,
      maxAttempts: 3,
      backoffMultiplier: 2,
    },
  });

  // Fetch webhooks
  const fetchWebhooks = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/v1/enterprise/webhooks' as any);
      setWebhooks(response.data.data || []);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      trackException(errorObj, 3)
      trackTrace('Failed to fetch webhooks', 3, {
        errorMessage: errorObj.message,
      })
      setMessage({ type: 'error', text: 'Failed to load webhooks' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  // Create/Update webhook
  const saveWebhook = async () => {
    if (!createForm.url.trim()) {
      setMessage({ type: 'error', text: 'URL is required' });
      return;
    }

    if (createForm.events.length === 0) {
      setMessage({ type: 'error', text: 'Select at least one event' });
      return;
    }

    try {
      const cleanHeaders = createForm.headers.reduce(
        (acc, h) => {
          if (h.key && h.value) acc[h.key] = h.value;
          return acc;
        },
        {} as Record<string, string>
      );

      const payload = {
        ...createForm,
        headers: cleanHeaders,
      };

      if (editingId) {
        await apiClient.put(`/api/v1/enterprise/webhooks/${editingId}`, payload);
        setMessage({ type: 'success', text: 'Webhook updated successfully' });
      } else {
        await apiClient.post('/api/v1/enterprise/webhooks', payload);
        setMessage({ type: 'success', text: 'Webhook created successfully' });
      }

      fetchWebhooks();
      closeModal();
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      trackException(errorObj, 3)
      trackTrace('Failed to save webhook', 3, {
        errorMessage: errorObj.message,
        webhookId: editingId,
        webhookUrl: createForm.url,
      })
      setMessage({ type: 'error', text: 'Failed to save webhook' });
    }
  };

  // Delete webhook
  const deleteWebhook = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this webhook?')) return;

    try {
      await apiClient.delete(`/api/v1/enterprise/webhooks/${id}`);
      setWebhooks((prev) => prev.filter((w) => w.id !== id));
      setMessage({ type: 'success', text: 'Webhook deleted successfully' });
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      trackException(errorObj, 3)
      trackTrace('Failed to delete webhook', 3, {
        errorMessage: errorObj.message,
        webhookId: id,
      })
      setMessage({ type: 'error', text: 'Failed to delete webhook' });
    }
  };

  // Test webhook
  const testWebhook = async (id: string) => {
    try {
      setTestingWebhookId(id);
      await apiClient.post(`/api/v1/enterprise/webhooks/${id}/test`, {});
      setMessage({ type: 'success', text: 'Test webhook sent successfully' });
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      trackException(errorObj, 3)
      trackTrace('Failed to test webhook', 3, {
        errorMessage: errorObj.message,
        webhookId: id,
      })
      setMessage({ type: 'error', text: 'Failed to test webhook' });
    } finally {
      setTestingWebhookId(null);
    }
  };

  // Fetch delivery logs
  const fetchDeliveryLogs = async (id: string) => {
    try {
      const response = await apiClient.get(`/api/v1/enterprise/webhooks/${id}/logs`);
      setDeliveryLogs(response.data.data || []);
      setShowDeliveryLogs(id);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      trackException(errorObj, 3)
      trackTrace('Failed to fetch delivery logs', 3, {
        errorMessage: errorObj.message,
        webhookId: id,
      })
      setMessage({ type: 'error', text: 'Failed to load delivery logs' });
    }
  };

  // Close modal
  const closeModal = () => {
    setShowCreateModal(false);
    setEditingId(null);
    setCreateForm({
      url: '',
      events: [],
      headers: [{ key: '', value: '' }],
      retryPolicy: {
        enabled: true,
        maxAttempts: 3,
        backoffMultiplier: 2,
      },
    });
  };

  // Toggle event
  const toggleEvent = (eventId: string) => {
    setCreateForm((prev) => ({
      ...prev,
      events: prev.events.includes(eventId)
        ? prev.events.filter((e) => e !== eventId)
        : [...prev.events, eventId],
    }));
  };

  // Add header
  const addHeader = () => {
    setCreateForm((prev) => ({
      ...prev,
      headers: [...prev.headers, { key: '', value: '' }],
    }));
  };

  // Remove header
  const removeHeader = (index: number) => {
    setCreateForm((prev) => ({
      ...prev,
      headers: prev.headers.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Webhook className="w-8 h-8 text-gray-700" />
            <h1 className="text-3xl font-bold text-gray-900">Webhooks</h1>
          </div>
          <button
            onClick={() => {
              setEditingId(null);
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition"
          >
            <Plus className="w-4 h-4" />
            Create Webhook
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

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-gray-600">Loading webhooks...</p>
          </div>
        ) : webhooks.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <Webhook className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No webhooks configured</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 text-blue-500 hover:text-blue-700"
            >
              Create your first webhook
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {webhooks.map((webhook) => (
              <div key={webhook.id} className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900 font-mono text-sm break-all">
                        {webhook.url}
                      </h3>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          webhook.active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {webhook.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      Created {new Date(webhook.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingId(webhook.id);
                        setShowCreateModal(true);
                      }}
                      className="p-2 text-gray-600 hover:text-gray-900"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteWebhook(webhook.id)}
                      className="p-2 text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Events */}
                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-600 mb-2">Subscribed Events</p>
                  <div className="flex flex-wrap gap-2">
                    {webhook.events.map((event) => (
                      <span
                        key={event}
                        className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                      >
                        {event}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Delivery Stats */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-xs text-gray-600">Total Deliveries</p>
                    <p className="text-lg font-bold text-gray-900">{webhook.deliveryStats.total}</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded">
                    <p className="text-xs text-gray-600">Successful</p>
                    <p className="text-lg font-bold text-green-900">
                      {webhook.deliveryStats.successful}
                    </p>
                  </div>
                  <div className="bg-red-50 p-3 rounded">
                    <p className="text-xs text-gray-600">Failed</p>
                    <p className="text-lg font-bold text-red-900">{webhook.deliveryStats.failed}</p>
                  </div>
                </div>

                {/* Retry Policy */}
                {webhook.retryPolicy.enabled && (
                  <div className="mb-4 text-sm text-gray-600">
                    <p>
                      Retry Policy: Max {webhook.retryPolicy.maxAttempts} attempts with{' '}
                      {webhook.retryPolicy.backoffMultiplier}x backoff
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => testWebhook(webhook.id)}
                    disabled={testingWebhookId === webhook.id}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    {testingWebhookId === webhook.id ? 'Testing...' : 'Test'}
                  </button>
                  <button
                    onClick={() => fetchDeliveryLogs(webhook.id)}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  >
                    <Activity className="w-4 h-4" />
                    Logs
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Webhook Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-gray-900">
                {editingId ? 'Edit Webhook' : 'Create New Webhook'}
              </h2>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Webhook URL
                </label>
                <input
                  type="url"
                  value={createForm.url}
                  onChange={(e) => setCreateForm({ ...createForm, url: e.target.value })}
                  placeholder="https://example.com/webhook"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              {/* Events */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Subscribe to Events
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto">
                  {AVAILABLE_EVENTS.map((event) => (
                    <label key={event.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={createForm.events.includes(event.id)}
                        onChange={() => toggleEvent(event.id)}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-sm text-gray-700">{event.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Custom Headers */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Custom Headers
                  </label>
                  <button
                    onClick={addHeader}
                    className="text-sm text-blue-500 hover:text-blue-700"
                  >
                    + Add Header
                  </button>
                </div>
                <div className="space-y-2">
                  {createForm.headers.map((header, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        value={header.key}
                        onChange={(e) => {
                          const newHeaders = [...createForm.headers];
                          newHeaders[idx].key = e.target.value;
                          setCreateForm({ ...createForm, headers: newHeaders });
                        }}
                        placeholder="Header name"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                      <input
                        type="text"
                        value={header.value}
                        onChange={(e) => {
                          const newHeaders = [...createForm.headers];
                          newHeaders[idx].value = e.target.value;
                          setCreateForm({ ...createForm, headers: newHeaders });
                        }}
                        placeholder="Header value"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                      {createForm.headers.length > 1 && (
                        <button
                          onClick={() => removeHeader(idx)}
                          className="p-2 text-red-500 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Retry Policy */}
              <div className="border-t pt-6">
                <label className="flex items-center gap-2 mb-4">
                  <input
                    type="checkbox"
                    checked={createForm.retryPolicy.enabled}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        retryPolicy: {
                          ...createForm.retryPolicy,
                          enabled: e.target.checked,
                        },
                      })
                    }
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Enable Retry Policy</span>
                </label>

                {createForm.retryPolicy.enabled && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-700 mb-2">Max Attempts</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={createForm.retryPolicy.maxAttempts}
                        onChange={(e) =>
                          setCreateForm({
                            ...createForm,
                            retryPolicy: {
                              ...createForm.retryPolicy,
                              maxAttempts: parseInt(e.target.value),
                            },
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-2">Backoff Multiplier</label>
                      <input
                        type="number"
                        min="1"
                        step="0.5"
                        value={createForm.retryPolicy.backoffMultiplier}
                        onChange={(e) =>
                          setCreateForm({
                            ...createForm,
                            retryPolicy: {
                              ...createForm.retryPolicy,
                              backoffMultiplier: parseFloat(e.target.value),
                            },
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveWebhook}
                  className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
                >
                  {editingId ? 'Update' : 'Create'} Webhook
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Logs Modal */}
      {showDeliveryLogs && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-gray-900">Delivery Logs</h2>
              <button
                onClick={() => setShowDeliveryLogs(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3">
              {deliveryLogs.length === 0 ? (
                <p className="text-gray-600 text-center py-8">No delivery logs yet</p>
              ) : (
                deliveryLogs.map((log, idx) => (
                  <div key={idx} className="border border-gray-200 rounded p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          log.status === 'success'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {log.status.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-600">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">HTTP {log.statusCode}</p>
                    {log.error && (
                      <p className="text-xs text-red-600 mt-1">{log.error}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebhooksManager;
