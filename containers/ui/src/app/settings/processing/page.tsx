/**
 * Tenant Admin: Data Processing Settings
 * Configure document, email, and meeting processing settings
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

interface DocumentProcessingConfig {
  enabled: boolean;
  textExtraction: boolean;
  ocrForImages: boolean;
  contentAnalysis: boolean;
  entityExtraction: boolean;
  maxDocumentSizeMB: number;
  supportedFileTypes: string[];
}

interface EmailProcessingConfig {
  enabled: boolean;
  sentimentAnalysis: boolean;
  actionItemExtraction: boolean;
  processAttachments: boolean;
  filterSpam: boolean;
  filters?: Array<{
    field: string;
    operator: 'equals' | 'contains' | 'matches';
    value: any;
  }>;
}

interface MeetingProcessingConfig {
  enabled: boolean;
  transcription: boolean;
  speakerDiarization: boolean;
  keyMomentDetection: boolean;
  actionItemExtraction: boolean;
  dealSignalDetection: boolean;
  transcriptionQuality: 'standard' | 'high';
  maxRecordingDurationMinutes: number;
}

interface ProcessingPriority {
  dataType: 'opportunities' | 'documents' | 'emails' | 'meetings' | 'messages';
  priority: number;
}

interface DataProcessingSettings {
  tenantId: string;
  documentProcessing: DocumentProcessingConfig;
  emailProcessing: EmailProcessingConfig;
  meetingProcessing: MeetingProcessingConfig;
  priorities: ProcessingPriority[];
  createdAt?: string;
  updatedAt?: string;
}

const DEFAULT_FILE_TYPES = [
  'pdf',
  'doc',
  'docx',
  'txt',
  'rtf',
  'odt',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'jpg',
  'jpeg',
  'png',
  'gif',
  'tiff',
];

export default function ProcessingSettingsPage() {
  const [settings, setSettings] = useState<DataProcessingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'documents' | 'emails' | 'meetings' | 'priorities'>('documents');

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/processing/settings`, {
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
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/processing/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          documentProcessing: settings.documentProcessing,
          emailProcessing: settings.emailProcessing,
          meetingProcessing: settings.meetingProcessing,
          priorities: settings.priorities,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j?.error?.message as string) || `HTTP ${res.status}`);
      }
      await fetchSettings();
      alert('Processing settings saved successfully');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      alert(`Failed to save: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-500">Loading processing settings…</p>
      </div>
    );
  }

  if (error && !settings) {
    return (
      <div className="p-6">
        <div className="rounded-lg border p-6 bg-white dark:bg-gray-900">
          <p className="text-sm text-red-600 dark:text-red-400">Error: {error}</p>
        </div>
      </div>
    );
  }

  const defaultSettings: DataProcessingSettings = {
    tenantId: '',
    documentProcessing: {
      enabled: true,
      textExtraction: true,
      ocrForImages: true,
      contentAnalysis: true,
      entityExtraction: true,
      maxDocumentSizeMB: 50,
      supportedFileTypes: DEFAULT_FILE_TYPES,
    },
    emailProcessing: {
      enabled: true,
      sentimentAnalysis: true,
      actionItemExtraction: true,
      processAttachments: true,
      filterSpam: true,
      filters: [],
    },
    meetingProcessing: {
      enabled: true,
      transcription: true,
      speakerDiarization: true,
      keyMomentDetection: true,
      actionItemExtraction: true,
      dealSignalDetection: true,
      transcriptionQuality: 'standard',
      maxRecordingDurationMinutes: 120,
    },
    priorities: [
      { dataType: 'opportunities', priority: 1 },
      { dataType: 'documents', priority: 2 },
      { dataType: 'emails', priority: 3 },
      { dataType: 'meetings', priority: 4 },
      { dataType: 'messages', priority: 5 },
    ],
  };

  const currentSettings = settings || defaultSettings;

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/settings/integrations" className="text-sm font-medium hover:underline">
          ← Integrations
        </Link>
      </div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Data Processing Settings</h1>
          <p className="text-muted-foreground">
            Configure how documents, emails, and meetings are processed
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border p-4 bg-red-50 dark:bg-red-900/20 mb-4">
          <p className="text-sm text-red-600 dark:text-red-400">Error: {error}</p>
        </div>
      )}

      <div className="rounded-lg border bg-white dark:bg-gray-900">
        <div className="border-b">
          <nav className="flex gap-4 px-4">
            <button
              onClick={() => setActiveSection('documents')}
              className={`px-4 py-3 text-sm font-medium border-b-2 ${
                activeSection === 'documents'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Document Processing
            </button>
            <button
              onClick={() => setActiveSection('emails')}
              className={`px-4 py-3 text-sm font-medium border-b-2 ${
                activeSection === 'emails'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Email Processing
            </button>
            <button
              onClick={() => setActiveSection('meetings')}
              className={`px-4 py-3 text-sm font-medium border-b-2 ${
                activeSection === 'meetings'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Meeting Processing
            </button>
            <button
              onClick={() => setActiveSection('priorities')}
              className={`px-4 py-3 text-sm font-medium border-b-2 ${
                activeSection === 'priorities'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Processing Priorities
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeSection === 'documents' && (
            <DocumentProcessingSettings
              config={currentSettings.documentProcessing}
              onChange={(config) =>
                setSettings({
                  ...currentSettings,
                  documentProcessing: config,
                })
              }
            />
          )}

          {activeSection === 'emails' && (
            <EmailProcessingSettings
              config={currentSettings.emailProcessing}
              onChange={(config) =>
                setSettings({
                  ...currentSettings,
                  emailProcessing: config,
                })
              }
            />
          )}

          {activeSection === 'meetings' && (
            <MeetingProcessingSettings
              config={currentSettings.meetingProcessing}
              onChange={(config) =>
                setSettings({
                  ...currentSettings,
                  meetingProcessing: config,
                })
              }
            />
          )}

          {activeSection === 'priorities' && (
            <ProcessingPriorities
              priorities={currentSettings.priorities}
              onChange={(priorities) =>
                setSettings({
                  ...currentSettings,
                  priorities,
                })
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}

interface DocumentProcessingSettingsProps {
  config: DocumentProcessingConfig;
  onChange: (config: DocumentProcessingConfig) => void;
}

function DocumentProcessingSettings({ config, onChange }: DocumentProcessingSettingsProps) {
  const toggleFileType = (fileType: string) => {
    if (config.supportedFileTypes.includes(fileType)) {
      onChange({
        ...config,
        supportedFileTypes: config.supportedFileTypes.filter((t) => t !== fileType),
      });
    } else {
      onChange({
        ...config,
        supportedFileTypes: [...config.supportedFileTypes, fileType],
      });
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">Document Processing Configuration</h3>

      <div className="space-y-4">
        <label className="flex items-center p-3 border rounded">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => onChange({ ...config, enabled: e.target.checked })}
            className="mr-3"
          />
          <div>
            <span className="text-sm font-medium">Enable Document Processing</span>
            <p className="text-xs text-gray-500">Process and extract data from documents</p>
          </div>
        </label>

        {config.enabled && (
          <>
            <label className="flex items-center p-3 border rounded">
              <input
                type="checkbox"
                checked={config.textExtraction}
                onChange={(e) => onChange({ ...config, textExtraction: e.target.checked })}
                className="mr-3"
              />
              <span className="text-sm font-medium">Enable Text Extraction</span>
            </label>

            <label className="flex items-center p-3 border rounded">
              <input
                type="checkbox"
                checked={config.ocrForImages}
                onChange={(e) => onChange({ ...config, ocrForImages: e.target.checked })}
                className="mr-3"
              />
              <span className="text-sm font-medium">Enable OCR for Images</span>
            </label>

            <label className="flex items-center p-3 border rounded">
              <input
                type="checkbox"
                checked={config.contentAnalysis}
                onChange={(e) => onChange({ ...config, contentAnalysis: e.target.checked })}
                className="mr-3"
              />
              <span className="text-sm font-medium">Enable Content Analysis (LLM)</span>
            </label>

            <label className="flex items-center p-3 border rounded">
              <input
                type="checkbox"
                checked={config.entityExtraction}
                onChange={(e) => onChange({ ...config, entityExtraction: e.target.checked })}
                className="mr-3"
              />
              <span className="text-sm font-medium">Enable Entity Extraction</span>
            </label>

            <div>
              <label className="block text-sm font-medium mb-1">Maximum Document Size (MB)</label>
              <input
                type="number"
                value={config.maxDocumentSizeMB}
                onChange={(e) => onChange({ ...config, maxDocumentSizeMB: parseInt(e.target.value) || 50 })}
                className="w-full px-3 py-2 border rounded"
                min="1"
                max="500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Supported File Types</label>
              <div className="grid grid-cols-4 gap-2">
                {DEFAULT_FILE_TYPES.map((fileType) => (
                  <label key={fileType} className="flex items-center p-2 border rounded">
                    <input
                      type="checkbox"
                      checked={config.supportedFileTypes.includes(fileType)}
                      onChange={() => toggleFileType(fileType)}
                      className="mr-2"
                    />
                    <span className="text-xs">{fileType.toUpperCase()}</span>
                  </label>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface EmailProcessingSettingsProps {
  config: EmailProcessingConfig;
  onChange: (config: EmailProcessingConfig) => void;
}

function EmailProcessingSettings({ config, onChange }: EmailProcessingSettingsProps) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">Email Processing Configuration</h3>

      <div className="space-y-4">
        <label className="flex items-center p-3 border rounded">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => onChange({ ...config, enabled: e.target.checked })}
            className="mr-3"
          />
          <div>
            <span className="text-sm font-medium">Enable Email Processing</span>
            <p className="text-xs text-gray-500">Process and analyze email content</p>
          </div>
        </label>

        {config.enabled && (
          <>
            <label className="flex items-center p-3 border rounded">
              <input
                type="checkbox"
                checked={config.sentimentAnalysis}
                onChange={(e) => onChange({ ...config, sentimentAnalysis: e.target.checked })}
                className="mr-3"
              />
              <span className="text-sm font-medium">Enable Sentiment Analysis</span>
            </label>

            <label className="flex items-center p-3 border rounded">
              <input
                type="checkbox"
                checked={config.actionItemExtraction}
                onChange={(e) => onChange({ ...config, actionItemExtraction: e.target.checked })}
                className="mr-3"
              />
              <span className="text-sm font-medium">Enable Action Item Extraction</span>
            </label>

            <label className="flex items-center p-3 border rounded">
              <input
                type="checkbox"
                checked={config.processAttachments}
                onChange={(e) => onChange({ ...config, processAttachments: e.target.checked })}
                className="mr-3"
              />
              <span className="text-sm font-medium">Process Attachments</span>
            </label>

            <label className="flex items-center p-3 border rounded">
              <input
                type="checkbox"
                checked={config.filterSpam}
                onChange={(e) => onChange({ ...config, filterSpam: e.target.checked })}
                className="mr-3"
              />
              <span className="text-sm font-medium">Filter Spam</span>
            </label>
          </>
        )}
      </div>
    </div>
  );
}

interface MeetingProcessingSettingsProps {
  config: MeetingProcessingConfig;
  onChange: (config: MeetingProcessingConfig) => void;
}

function MeetingProcessingSettings({ config, onChange }: MeetingProcessingSettingsProps) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">Meeting Processing Configuration</h3>

      <div className="space-y-4">
        <label className="flex items-center p-3 border rounded">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => onChange({ ...config, enabled: e.target.checked })}
            className="mr-3"
          />
          <div>
            <span className="text-sm font-medium">Enable Meeting Transcription</span>
            <p className="text-xs text-gray-500">Transcribe and analyze meeting recordings</p>
          </div>
        </label>

        {config.enabled && (
          <>
            <label className="flex items-center p-3 border rounded">
              <input
                type="checkbox"
                checked={config.transcription}
                onChange={(e) => onChange({ ...config, transcription: e.target.checked })}
                className="mr-3"
              />
              <span className="text-sm font-medium">Enable Transcription</span>
            </label>

            <label className="flex items-center p-3 border rounded">
              <input
                type="checkbox"
                checked={config.speakerDiarization}
                onChange={(e) => onChange({ ...config, speakerDiarization: e.target.checked })}
                className="mr-3"
              />
              <span className="text-sm font-medium">Enable Speaker Diarization</span>
            </label>

            <label className="flex items-center p-3 border rounded">
              <input
                type="checkbox"
                checked={config.keyMomentDetection}
                onChange={(e) => onChange({ ...config, keyMomentDetection: e.target.checked })}
                className="mr-3"
              />
              <span className="text-sm font-medium">Enable Key Moment Detection</span>
            </label>

            <label className="flex items-center p-3 border rounded">
              <input
                type="checkbox"
                checked={config.actionItemExtraction}
                onChange={(e) => onChange({ ...config, actionItemExtraction: e.target.checked })}
                className="mr-3"
              />
              <span className="text-sm font-medium">Enable Action Item Extraction</span>
            </label>

            <label className="flex items-center p-3 border rounded">
              <input
                type="checkbox"
                checked={config.dealSignalDetection}
                onChange={(e) => onChange({ ...config, dealSignalDetection: e.target.checked })}
                className="mr-3"
              />
              <span className="text-sm font-medium">Enable Deal Signal Detection</span>
            </label>

            <div>
              <label className="block text-sm font-medium mb-1">Transcription Quality</label>
              <select
                value={config.transcriptionQuality}
                onChange={(e) =>
                  onChange({
                    ...config,
                    transcriptionQuality: e.target.value as 'standard' | 'high',
                  })
                }
                className="w-full px-3 py-2 border rounded"
              >
                <option value="standard">Standard</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Maximum Recording Duration (minutes)</label>
              <input
                type="number"
                value={config.maxRecordingDurationMinutes}
                onChange={(e) =>
                  onChange({
                    ...config,
                    maxRecordingDurationMinutes: parseInt(e.target.value) || 120,
                  })
                }
                className="w-full px-3 py-2 border rounded"
                min="1"
                max="480"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface ProcessingPrioritiesProps {
  priorities: ProcessingPriority[];
  onChange: (priorities: ProcessingPriority[]) => void;
}

function ProcessingPriorities({ priorities, onChange }: ProcessingPrioritiesProps) {
  const moveUp = (index: number) => {
    if (index === 0) return;
    const newPriorities = [...priorities];
    [newPriorities[index - 1], newPriorities[index]] = [newPriorities[index], newPriorities[index - 1]];
    // Update priority numbers
    newPriorities.forEach((p, i) => {
      p.priority = i + 1;
    });
    onChange(newPriorities);
  };

  const moveDown = (index: number) => {
    if (index === priorities.length - 1) return;
    const newPriorities = [...priorities];
    [newPriorities[index], newPriorities[index + 1]] = [newPriorities[index + 1], newPriorities[index]];
    // Update priority numbers
    newPriorities.forEach((p, i) => {
      p.priority = i + 1;
    });
    onChange(newPriorities);
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">Processing Priorities</h3>
      <p className="text-sm text-gray-500 mb-4">
        Set the order in which different data types are processed. Lower numbers are processed first.
      </p>

      <div className="space-y-2">
        {priorities
          .sort((a, b) => a.priority - b.priority)
          .map((priority, index) => (
            <div key={priority.dataType} className="flex items-center gap-2 p-3 border rounded">
              <span className="text-sm font-medium w-32">{priority.dataType}</span>
              <span className="text-xs text-gray-500">Priority: {priority.priority}</span>
              <div className="flex-1" />
              <button
                onClick={() => moveUp(index)}
                disabled={index === 0}
                className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded text-xs hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                ↑
              </button>
              <button
                onClick={() => moveDown(index)}
                disabled={index === priorities.length - 1}
                className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded text-xs hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                ↓
              </button>
            </div>
          ))}
      </div>
    </div>
  );
}
