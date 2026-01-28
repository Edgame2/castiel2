/**
 * Tenant Admin: Integration Connections Management
 * List connected integrations, connect new ones, disconnect, test connections
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

interface IntegrationType {
  id: string;
  integrationId: string;
  displayName: string;
  description?: string;
  category: string;
  provider: string;
  authMethods: string[];
  logoUrl?: string;
}

interface TenantIntegration {
  id: string;
  name: string;
  integrationType: string;
  status: 'connected' | 'disconnected' | 'error' | 'syncing';
  connectionStatus: 'active' | 'inactive' | 'error';
  lastSyncAt?: string;
  createdAt: string;
  updatedAt: string;
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<TenantIntegration[]>([]);
  const [availableTypes, setAvailableTypes] = useState<IntegrationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [selectedType, setSelectedType] = useState<IntegrationType | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  const fetchIntegrations = useCallback(async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/integrations`, {
        credentials: 'include',
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setIntegrations(Array.isArray(json?.items) ? json.items : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const fetchAvailableTypes = useCallback(async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/integrations/available`, {
        credentials: 'include',
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setAvailableTypes(Array.isArray(json?.integrationTypes) ? json.integrationTypes : []);
    } catch (e) {
      // Non-critical error, just log it
      console.error('Failed to fetch available integration types', e);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchIntegrations(), fetchAvailableTypes()]).finally(() => {
      setLoading(false);
    });
  }, [fetchIntegrations, fetchAvailableTypes]);

  const handleConnect = async (type: IntegrationType) => {
    setSelectedType(type);
    setShowConnectModal(true);
  };

  const handleOAuthConnect = async (type: IntegrationType) => {
    try {
      const res = await fetch(
        `${apiBaseUrl}/api/v1/integrations/oauth-url/${encodeURIComponent(type.integrationId)}?redirectUri=${encodeURIComponent(window.location.href)}`,
        {
          credentials: 'include',
        }
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      const json = await res.json();
      if (json.authorizationUrl) {
        // Redirect to OAuth authorization URL
        window.location.href = json.authorizationUrl;
      }
    } catch (e) {
      alert(`Failed to start OAuth flow: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handleApiKeyConnect = async (type: IntegrationType, apiKey: string, apiSecret?: string, instanceUrl?: string) => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/integrations/connect-api-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          integrationType: type.integrationId,
          apiKey,
          apiSecret,
          instanceUrl,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      await fetchIntegrations();
      setShowConnectModal(false);
      setSelectedType(null);
    } catch (e) {
      alert(`Failed to connect: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handleDisconnect = async (id: string) => {
    if (!confirm('Are you sure you want to disconnect this integration?')) {
      return;
    }
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/integrations/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      await fetchIntegrations();
    } catch (e) {
      alert(`Failed to disconnect: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handleTestConnection = async (id: string) => {
    setTestingId(id);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/integrations/${id}/test`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      const json = await res.json();
      alert(json.success ? `Connection test successful! ${json.message || ''}` : `Connection test failed: ${json.message || ''}`);
    } catch (e) {
      alert(`Connection test failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/dashboard" className="text-sm font-medium hover:underline">
          ← Dashboard
        </Link>
        <span className="text-sm text-gray-500">/</span>
        <Link href="/settings" className="text-sm font-medium hover:underline">
          Settings
        </Link>
      </div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Integration Connections</h1>
          <p className="text-muted-foreground">
            Manage your connected integrations and connect new ones
          </p>
        </div>
        <button
          onClick={() => setShowConnectModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
        >
          Connect Integration
        </button>
      </div>

      {loading && (
        <div className="rounded-lg border p-6 bg-white dark:bg-gray-900">
          <p className="text-sm text-gray-500">Loading integrations…</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border p-6 bg-white dark:bg-gray-900">
          <p className="text-sm text-red-600 dark:text-red-400">Error: {error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Connected Integrations */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Connected Integrations</h2>
            {integrations.length === 0 ? (
              <div className="rounded-lg border p-6 bg-white dark:bg-gray-900 text-center">
                <p className="text-sm text-gray-500 mb-4">No integrations connected yet</p>
                <button
                  onClick={() => setShowConnectModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                >
                  Connect Your First Integration
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {integrations.map((integration) => (
                  <div
                    key={integration.id}
                    className="rounded-lg border p-4 bg-white dark:bg-gray-900 hover:border-blue-500 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-sm">{integration.name}</h3>
                        <p className="text-xs text-gray-500">{integration.integrationType}</p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          integration.status === 'connected' && integration.connectionStatus === 'active'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : integration.status === 'error' || integration.connectionStatus === 'error'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                        }`}
                      >
                        {integration.status === 'connected' && integration.connectionStatus === 'active'
                          ? 'Connected'
                          : integration.status === 'error' || integration.connectionStatus === 'error'
                            ? 'Error'
                            : 'Disconnected'}
                      </span>
                    </div>
                    {integration.lastSyncAt && (
                      <p className="text-xs text-gray-500 mb-3">
                        Last sync: {new Date(integration.lastSyncAt).toLocaleString()}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Link
                        href={`/settings/integrations/${integration.id}`}
                        className="flex-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded text-xs hover:bg-gray-200 dark:hover:bg-gray-700 text-center"
                      >
                        Configure
                      </Link>
                      <button
                        onClick={() => handleTestConnection(integration.id)}
                        disabled={testingId === integration.id}
                        className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded text-xs hover:bg-blue-200 dark:hover:bg-blue-800 disabled:opacity-50"
                      >
                        {testingId === integration.id ? 'Testing...' : 'Test'}
                      </button>
                      <button
                        onClick={() => handleDisconnect(integration.id)}
                        className="px-3 py-1.5 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded text-xs hover:bg-red-200 dark:hover:bg-red-800"
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Available Integration Types */}
          {availableTypes.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Available Integrations</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableTypes.map((type) => (
                  <div
                    key={type.id}
                    className="rounded-lg border p-4 bg-white dark:bg-gray-900 hover:border-blue-500 transition-colors cursor-pointer"
                    onClick={() => handleConnect(type)}
                  >
                    <h3 className="font-semibold text-sm mb-1">{type.displayName}</h3>
                    <p className="text-xs text-gray-500 mb-3">{type.description || type.category}</p>
                    <div className="flex gap-2">
                      {type.authMethods.map((method) => (
                        <span
                          key={method}
                          className="px-2 py-1 rounded text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                        >
                          {method === 'oauth' ? 'OAuth' : method === 'apikey' ? 'API Key' : method}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Connect Modal */}
      {showConnectModal && (
        <ConnectIntegrationModal
          availableTypes={availableTypes}
          selectedType={selectedType}
          onOAuthConnect={handleOAuthConnect}
          onApiKeyConnect={handleApiKeyConnect}
          onClose={() => {
            setShowConnectModal(false);
            setSelectedType(null);
          }}
        />
      )}
    </div>
  );
}

interface ConnectIntegrationModalProps {
  availableTypes: IntegrationType[];
  selectedType: IntegrationType | null;
  onOAuthConnect: (type: IntegrationType) => void;
  onApiKeyConnect: (type: IntegrationType, apiKey: string, apiSecret?: string, instanceUrl?: string) => void;
  onClose: () => void;
}

function ConnectIntegrationModal({
  availableTypes,
  selectedType: initialSelectedType,
  onOAuthConnect,
  onApiKeyConnect,
  onClose,
}: ConnectIntegrationModalProps) {
  const [selectedType, setSelectedType] = useState<IntegrationType | null>(initialSelectedType);
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [instanceUrl, setInstanceUrl] = useState('');
  const [authMethod, setAuthMethod] = useState<'oauth' | 'apikey'>('oauth');

  const type = selectedType || (availableTypes.length > 0 ? availableTypes[0] : null);

  if (!type) {
    return null;
  }

  const supportsOAuth = type.authMethods.includes('oauth');
  const supportsApiKey = type.authMethods.includes('apikey') || type.authMethods.includes('api_key');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Connect Integration</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ×
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Integration Type</label>
          <select
            value={type.id}
            onChange={(e) => {
              const newType = availableTypes.find((t) => t.id === e.target.value);
              if (newType) setSelectedType(newType);
            }}
            className="w-full px-3 py-2 border rounded"
          >
            {availableTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.displayName}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Authentication Method</label>
          <div className="flex gap-4">
            {supportsOAuth && (
              <label className="flex items-center">
                <input
                  type="radio"
                  name="authMethod"
                  value="oauth"
                  checked={authMethod === 'oauth'}
                  onChange={() => setAuthMethod('oauth')}
                  className="mr-2"
                />
                OAuth 2.0
              </label>
            )}
            {supportsApiKey && (
              <label className="flex items-center">
                <input
                  type="radio"
                  name="authMethod"
                  value="apikey"
                  checked={authMethod === 'apikey'}
                  onChange={() => setAuthMethod('apikey')}
                  className="mr-2"
                />
                API Key
              </label>
            )}
          </div>
        </div>

        {authMethod === 'oauth' && supportsOAuth && (
          <div className="mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Click the button below to authorize this integration with OAuth 2.0. You will be redirected to the
              integration provider to grant permissions.
            </p>
            <button
              onClick={() => onOAuthConnect(type)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Connect with {type.displayName}
            </button>
          </div>
        )}

        {authMethod === 'apikey' && supportsApiKey && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">API Key *</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-3 py-2 border rounded"
                placeholder="Enter your API key"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">API Secret (optional)</label>
              <input
                type="password"
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
                className="w-full px-3 py-2 border rounded"
                placeholder="Enter your API secret"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Instance URL (optional)</label>
              <input
                type="url"
                value={instanceUrl}
                onChange={(e) => setInstanceUrl(e.target.value)}
                className="w-full px-3 py-2 border rounded"
                placeholder="https://your-instance.com"
              />
            </div>
            <button
              onClick={() => onApiKeyConnect(type, apiKey, apiSecret || undefined, instanceUrl || undefined)}
              disabled={!apiKey}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Connect
            </button>
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:underline">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
