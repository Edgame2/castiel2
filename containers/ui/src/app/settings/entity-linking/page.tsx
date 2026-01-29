/**
 * Tenant Admin: Entity Linking Configuration
 * Configure auto-link thresholds, review suggested links, manage linking rules
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';

interface EntityLinkingSettings {
  tenantId: string;
  autoLinkThreshold: number;
  suggestedLinkThreshold: number;
  enabledStrategies: {
    explicitReference: boolean;
    participantMatching: boolean;
    contentAnalysis: boolean;
    temporalCorrelation: boolean;
    vectorSimilarity: boolean;
  };
  createdAt?: string;
  updatedAt?: string;
}

interface SuggestedLink {
  id: string;
  tenantId: string;
  sourceShardId: string;
  sourceShardType: string;
  targetShardId: string;
  targetShardType: string;
  targetShardTypeName?: string;
  confidence: number;
  strategy: string;
  linkingReason: string;
  status: 'pending_review' | 'approved' | 'rejected' | 'expired';
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt?: string;
}

interface LinkingRule {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  condition: {
    sourceShardType: string;
    field: string;
    operator: 'equals' | 'contains' | 'matches' | 'startsWith' | 'endsWith';
    value: any;
  };
  action: {
    targetShardType: string;
    linkType: string;
    confidence: number;
  };
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export default function EntityLinkingPage() {
  const [settings, setSettings] = useState<EntityLinkingSettings | null>(null);
  const [suggestedLinks, setSuggestedLinks] = useState<SuggestedLink[]>([]);
  const [linkingRules, setLinkingRules] = useState<LinkingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'settings' | 'suggested' | 'rules'>('settings');

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/entity-linking/settings`, {
        credentials: 'include',
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setSettings(json?.settings || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const fetchSuggestedLinks = useCallback(async () => {
    try {
      const res = await fetch(
        `${apiBaseUrl}/api/v1/entity-linking/suggested-links?status=pending_review&limit=50`,
        {
          credentials: 'include',
        }
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setSuggestedLinks(Array.isArray(json?.suggestedLinks) ? json.suggestedLinks : []);
    } catch (e) {
      setSuggestedLinks([]);
    }
  }, []);

  const fetchLinkingRules = useCallback(async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/entity-linking/rules`, {
        credentials: 'include',
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setLinkingRules(Array.isArray(json?.rules) ? json.rules : []);
    } catch (e) {
      setLinkingRules([]);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchSettings(), fetchSuggestedLinks(), fetchLinkingRules()]).finally(() => {
      setLoading(false);
    });
  }, [fetchSettings, fetchSuggestedLinks, fetchLinkingRules]);

  const handleSaveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/entity-linking/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          autoLinkThreshold: settings.autoLinkThreshold,
          suggestedLinkThreshold: settings.suggestedLinkThreshold,
          enabledStrategies: settings.enabledStrategies,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      await fetchSettings();
      alert('Settings saved successfully');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      alert(`Failed to save: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSaving(false);
    }
  };

  const handleApproveLink = async (id: string) => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/entity-linking/suggested-links/${id}/approve`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      await fetchSuggestedLinks();
    } catch (e) {
      alert(`Failed to approve: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handleRejectLink = async (id: string) => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/entity-linking/suggested-links/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: 'Rejected by user' }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      await fetchSuggestedLinks();
    } catch (e) {
      alert(`Failed to reject: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handleApproveAll = async () => {
    if (!confirm('Are you sure you want to approve all pending suggested links?')) {
      return;
    }
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/entity-linking/suggested-links/approve-all`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      const json = await res.json();
      alert(`Approved ${json.approved} links. ${json.failed} failed.`);
      await fetchSuggestedLinks();
    } catch (e) {
      alert(`Failed to approve all: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-500">Loading entity linking configuration…</p>
      </div>
    );
  }

  const defaultSettings: EntityLinkingSettings = {
    tenantId: '',
    autoLinkThreshold: 0.8,
    suggestedLinkThreshold: 0.6,
    enabledStrategies: {
      explicitReference: true,
      participantMatching: true,
      contentAnalysis: true,
      temporalCorrelation: true,
      vectorSimilarity: true,
    },
  };

  const currentSettings = settings || defaultSettings;

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/settings/integrations" className="text-sm font-medium hover:underline">
          ← Integrations
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-2">Entity Linking Configuration</h1>
      <p className="text-muted-foreground mb-6">
        Configure how entities are automatically linked together
      </p>

      {error && (
        <div className="rounded-lg border p-4 bg-red-50 dark:bg-red-900/20 mb-4">
          <p className="text-sm text-red-600 dark:text-red-400">Error: {error}</p>
        </div>
      )}

      <div className="rounded-lg border bg-white dark:bg-gray-900">
        <div className="border-b">
          <nav className="flex gap-4 px-4">
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'settings'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Auto-Link Settings
            </button>
            <button
              onClick={() => setActiveTab('suggested')}
              className={`px-4 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'suggested'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Suggested Links ({suggestedLinks.length})
            </button>
            <button
              onClick={() => setActiveTab('rules')}
              className={`px-4 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'rules'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Manual Rules
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'settings' && (
            <AutoLinkSettingsTab
              settings={currentSettings}
              onChange={setSettings}
              onSave={handleSaveSettings}
              saving={saving}
            />
          )}

          {activeTab === 'suggested' && (
            <SuggestedLinksReviewTab
              links={suggestedLinks}
              onApprove={handleApproveLink}
              onReject={handleRejectLink}
              onApproveAll={handleApproveAll}
            />
          )}

          {activeTab === 'rules' && (
            <ManualLinkingRulesTab
              rules={linkingRules}
              onRefresh={fetchLinkingRules}
            />
          )}
        </div>
      </div>
    </div>
  );
}

interface AutoLinkSettingsTabProps {
  settings: EntityLinkingSettings;
  onChange: (settings: EntityLinkingSettings) => void;
  onSave: () => void;
  saving: boolean;
}

function AutoLinkSettingsTab({ settings, onChange, onSave, saving }: AutoLinkSettingsTabProps) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">Auto-Link Settings</h3>

      <div>
        <label className="block text-sm font-medium mb-2">
          Auto-Link Threshold: {(settings.autoLinkThreshold * 100).toFixed(0)}%
        </label>
        <input
          type="range"
          min="0.6"
          max="1.0"
          step="0.05"
          value={settings.autoLinkThreshold}
          onChange={(e) => onChange({ ...settings, autoLinkThreshold: parseFloat(e.target.value) })}
          className="w-full"
        />
        <p className="text-xs text-gray-500 mt-1">
          Links with confidence above this threshold will be automatically created (60-100%)
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Suggested Link Threshold: {(settings.suggestedLinkThreshold * 100).toFixed(0)}%
        </label>
        <input
          type="range"
          min="0.4"
          max="0.8"
          step="0.05"
          value={settings.suggestedLinkThreshold}
          onChange={(e) => onChange({ ...settings, suggestedLinkThreshold: parseFloat(e.target.value) })}
          className="w-full"
        />
        <p className="text-xs text-gray-500 mt-1">
          Links with confidence above this threshold will be suggested for review (40-80%)
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-4">Linking Strategies</label>
        <div className="space-y-2">
          <label className="flex items-center p-3 border rounded">
            <input
              type="checkbox"
              checked={settings.enabledStrategies.explicitReference}
              disabled
              className="mr-3"
            />
            <div>
              <span className="text-sm font-medium">Explicit Reference (Always Enabled)</span>
              <p className="text-xs text-gray-500">Links entities when explicit references are found</p>
            </div>
          </label>
          <label className="flex items-center p-3 border rounded">
            <input
              type="checkbox"
              checked={settings.enabledStrategies.participantMatching}
              onChange={(e) =>
                onChange({
                  ...settings,
                  enabledStrategies: {
                    ...settings.enabledStrategies,
                    participantMatching: e.target.checked,
                  },
                })
              }
              className="mr-3"
            />
            <div>
              <span className="text-sm font-medium">Participant Matching</span>
              <p className="text-xs text-gray-500">Links based on participant/contact matching</p>
            </div>
          </label>
          <label className="flex items-center p-3 border rounded">
            <input
              type="checkbox"
              checked={settings.enabledStrategies.contentAnalysis}
              onChange={(e) =>
                onChange({
                  ...settings,
                  enabledStrategies: {
                    ...settings.enabledStrategies,
                    contentAnalysis: e.target.checked,
                  },
                })
              }
              className="mr-3"
            />
            <div>
              <span className="text-sm font-medium">Content Analysis (LLM)</span>
              <p className="text-xs text-gray-500">Uses AI to analyze content and find relationships</p>
            </div>
          </label>
          <label className="flex items-center p-3 border rounded">
            <input
              type="checkbox"
              checked={settings.enabledStrategies.temporalCorrelation}
              onChange={(e) =>
                onChange({
                  ...settings,
                  enabledStrategies: {
                    ...settings.enabledStrategies,
                    temporalCorrelation: e.target.checked,
                  },
                })
              }
              className="mr-3"
            />
            <div>
              <span className="text-sm font-medium">Temporal Correlation</span>
              <p className="text-xs text-gray-500">Links entities based on time-based patterns</p>
            </div>
          </label>
          <label className="flex items-center p-3 border rounded">
            <input
              type="checkbox"
              checked={settings.enabledStrategies.vectorSimilarity}
              onChange={(e) =>
                onChange({
                  ...settings,
                  enabledStrategies: {
                    ...settings.enabledStrategies,
                    vectorSimilarity: e.target.checked,
                  },
                })
              }
              className="mr-3"
            />
            <div>
              <span className="text-sm font-medium">Vector Similarity</span>
              <p className="text-xs text-gray-500">Links entities based on semantic similarity</p>
            </div>
          </label>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={onSave}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}

interface SuggestedLinksReviewTabProps {
  links: SuggestedLink[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onApproveAll: () => void;
}

function SuggestedLinksReviewTab({ links, onApprove, onReject, onApproveAll }: SuggestedLinksReviewTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Suggested Links Review</h3>
        {links.length > 0 && (
          <button
            onClick={onApproveAll}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            Approve All
          </button>
        )}
      </div>

      {links.length === 0 ? (
        <p className="text-sm text-gray-500">No pending suggested links</p>
      ) : (
        <div className="space-y-4">
          {links.map((link) => (
            <div key={link.id} className="p-4 border rounded">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium">
                      {link.sourceShardType} → {link.targetShardTypeName || link.targetShardType}
                    </span>
                    <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      {(link.confidence * 100).toFixed(0)}% confidence
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">Strategy: {link.strategy}</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{link.linkingReason}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onApprove(link.id)}
                    className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded text-xs hover:bg-green-200 dark:hover:bg-green-800"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => onReject(link.id)}
                    className="px-3 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded text-xs hover:bg-red-200 dark:hover:bg-red-800"
                  >
                    Reject
                  </button>
                </div>
              </div>
              <div className="text-xs text-gray-500">
                Source: {link.sourceShardId} | Target: {link.targetShardId}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface ManualLinkingRulesTabProps {
  rules: LinkingRule[];
  onRefresh: () => void;
}

function ManualLinkingRulesTab({ rules, onRefresh }: ManualLinkingRulesTabProps) {
  const [showEditor, setShowEditor] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Manual Linking Rules</h3>
        <button
          onClick={() => setShowEditor(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
        >
          Add Rule
        </button>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        Create custom rules to automatically link entities based on specific conditions
      </p>

      {rules.length === 0 ? (
        <p className="text-sm text-gray-500">No linking rules configured</p>
      ) : (
        <div className="space-y-4">
          {rules.map((rule) => (
            <div key={rule.id} className="p-4 border rounded">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="font-medium mb-1">{rule.name}</h4>
                  {rule.description && <p className="text-sm text-gray-500 mb-2">{rule.description}</p>}
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    <p>
                      If {rule.condition.sourceShardType}.{rule.condition.field}{' '}
                      {rule.condition.operator} "{rule.condition.value}"
                    </p>
                    <p>
                      Then link to {rule.action.targetShardType} with {rule.action.linkType} (
                      {(rule.action.confidence * 100).toFixed(0)}% confidence)
                    </p>
                  </div>
                </div>
                <span
                  className={`px-2 py-1 rounded text-xs ${
                    rule.enabled
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                  }`}
                >
                  {rule.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showEditor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4">
            <h4 className="text-lg font-semibold mb-4">Create Linking Rule</h4>
            <p className="text-sm text-gray-500 mb-4">
              Manual rule creation UI to be implemented. For now, use the API directly.
            </p>
            <button
              onClick={() => setShowEditor(false)}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
