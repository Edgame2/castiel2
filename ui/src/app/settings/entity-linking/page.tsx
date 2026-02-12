/**
 * Tenant Admin: Entity Linking Configuration
 * Configure auto-link thresholds, review suggested links, manage linking rules
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { GENERIC_ERROR_MESSAGE } from '@/lib/api';

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
    value: string | number | boolean;
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
      if (typeof process !== "undefined" && process.env.NODE_ENV === "development") console.error(e);
      setError(GENERIC_ERROR_MESSAGE);
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
      if (typeof process !== "undefined" && process.env.NODE_ENV === "development") console.error(e);
      setError(GENERIC_ERROR_MESSAGE);
      alert(GENERIC_ERROR_MESSAGE);
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
      alert(GENERIC_ERROR_MESSAGE);
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
      alert(GENERIC_ERROR_MESSAGE);
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
      alert(GENERIC_ERROR_MESSAGE);
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab('settings')}
              className={`rounded-none border-b-2 ${
                activeTab === 'settings'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Auto-Link Settings
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab('suggested')}
              className={`rounded-none border-b-2 ${
                activeTab === 'suggested'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Suggested Links ({suggestedLinks.length})
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab('rules')}
              className={`rounded-none border-b-2 ${
                activeTab === 'rules'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Manual Rules
            </Button>
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
        <Label className="block mb-2">
          Auto-Link Threshold: {(settings.autoLinkThreshold * 100).toFixed(0)}%
        </Label>
        <Input
          type="range"
          min="0.6"
          max="1.0"
          step="0.05"
          value={settings.autoLinkThreshold}
          onChange={(e) => onChange({ ...settings, autoLinkThreshold: parseFloat(e.target.value) })}
          className="w-full h-2"
        />
        <p className="text-xs text-gray-500 mt-1">
          Links with confidence above this threshold will be automatically created (60-100%)
        </p>
      </div>

      <div>
        <Label className="block mb-2">
          Suggested Link Threshold: {(settings.suggestedLinkThreshold * 100).toFixed(0)}%
        </Label>
        <Input
          type="range"
          min="0.4"
          max="0.8"
          step="0.05"
          value={settings.suggestedLinkThreshold}
          onChange={(e) => onChange({ ...settings, suggestedLinkThreshold: parseFloat(e.target.value) })}
          className="w-full h-2"
        />
        <p className="text-xs text-gray-500 mt-1">
          Links with confidence above this threshold will be suggested for review (40-80%)
        </p>
      </div>

      <div>
        <Label className="block mb-4">Linking Strategies</Label>
        <div className="space-y-2">
          <div className="flex items-center p-3 border rounded">
            <Checkbox id="strat-explicit" checked={settings.enabledStrategies.explicitReference} disabled className="mr-3" />
            <div className="flex-1">
              <Label htmlFor="strat-explicit" className="text-sm font-medium cursor-default">Explicit Reference (Always Enabled)</Label>
              <p className="text-xs text-muted-foreground">Links entities when explicit references are found</p>
            </div>
          </div>
          <div className="flex items-center p-3 border rounded">
            <Checkbox
              id="strat-participant"
              checked={settings.enabledStrategies.participantMatching}
              onCheckedChange={(c) =>
                onChange({
                  ...settings,
                  enabledStrategies: { ...settings.enabledStrategies, participantMatching: !!c },
                })
              }
              className="mr-3"
            />
            <div className="flex-1">
              <Label htmlFor="strat-participant" className="text-sm font-medium cursor-pointer">Participant Matching</Label>
              <p className="text-xs text-muted-foreground">Links based on participant/contact matching</p>
            </div>
          </div>
          <div className="flex items-center p-3 border rounded">
            <Checkbox
              id="strat-content"
              checked={settings.enabledStrategies.contentAnalysis}
              onCheckedChange={(c) =>
                onChange({
                  ...settings,
                  enabledStrategies: { ...settings.enabledStrategies, contentAnalysis: !!c },
                })
              }
              className="mr-3"
            />
            <div className="flex-1">
              <Label htmlFor="strat-content" className="text-sm font-medium cursor-pointer">Content Analysis (LLM)</Label>
              <p className="text-xs text-muted-foreground">Uses AI to analyze content and find relationships</p>
            </div>
          </div>
          <div className="flex items-center p-3 border rounded">
            <Checkbox
              id="strat-temporal"
              checked={settings.enabledStrategies.temporalCorrelation}
              onCheckedChange={(c) =>
                onChange({
                  ...settings,
                  enabledStrategies: { ...settings.enabledStrategies, temporalCorrelation: !!c },
                })
              }
              className="mr-3"
            />
            <div className="flex-1">
              <Label htmlFor="strat-temporal" className="text-sm font-medium cursor-pointer">Temporal Correlation</Label>
              <p className="text-xs text-muted-foreground">Links entities based on time-based patterns</p>
            </div>
          </div>
          <div className="flex items-center p-3 border rounded">
            <Checkbox
              id="strat-vector"
              checked={settings.enabledStrategies.vectorSimilarity}
              onCheckedChange={(c) =>
                onChange({
                  ...settings,
                  enabledStrategies: { ...settings.enabledStrategies, vectorSimilarity: !!c },
                })
              }
              className="mr-3"
            />
            <div className="flex-1">
              <Label htmlFor="strat-vector" className="text-sm font-medium cursor-pointer">Vector Similarity</Label>
              <p className="text-xs text-muted-foreground">Links entities based on semantic similarity</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={onSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
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
          <Button onClick={onApproveAll} size="sm">
            Approve All
          </Button>
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
                  <Button size="sm" variant="secondary" className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800" onClick={() => onApprove(link.id)}>
                    Approve
                  </Button>
                  <Button size="sm" variant="destructive" className="text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800" onClick={() => onReject(link.id)}>
                    Reject
                  </Button>
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
        <Button onClick={() => setShowEditor(true)} size="sm">
          Add Rule
        </Button>
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
            <Button variant="secondary" onClick={() => setShowEditor(false)}>
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
