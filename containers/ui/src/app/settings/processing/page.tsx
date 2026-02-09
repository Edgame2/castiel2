/**
 * Tenant Admin: Data Processing Settings
 * Configure document, email, and meeting processing settings
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';

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
    value: string | number | boolean;
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
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

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
              className={`rounded-none border-b-2 -mb-px ${
                activeSection === 'documents'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveSection('documents')}
            >
              Document Processing
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`rounded-none border-b-2 -mb-px ${
                activeSection === 'emails'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveSection('emails')}
            >
              Email Processing
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`rounded-none border-b-2 -mb-px ${
                activeSection === 'meetings'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveSection('meetings')}
            >
              Meeting Processing
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`rounded-none border-b-2 -mb-px ${
                activeSection === 'priorities'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveSection('priorities')}
            >
              Processing Priorities
            </Button>
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
        <div className="flex items-start gap-3 p-3 border rounded">
          <Checkbox
            id="doc-enabled"
            checked={config.enabled}
            onCheckedChange={(c) => onChange({ ...config, enabled: !!c })}
          />
          <div className="grid gap-1.5 leading-none">
            <Label htmlFor="doc-enabled" className="text-sm font-medium cursor-pointer">
              Enable Document Processing
            </Label>
            <p className="text-xs text-muted-foreground">Process and extract data from documents</p>
          </div>
        </div>

        {config.enabled && (
          <>
            <div className="flex items-center gap-3 p-3 border rounded">
              <Checkbox
                id="doc-text"
                checked={config.textExtraction}
                onCheckedChange={(c) => onChange({ ...config, textExtraction: !!c })}
              />
              <Label htmlFor="doc-text" className="text-sm font-medium cursor-pointer">Enable Text Extraction</Label>
            </div>

            <div className="flex items-center gap-3 p-3 border rounded">
              <Checkbox
                id="doc-ocr"
                checked={config.ocrForImages}
                onCheckedChange={(c) => onChange({ ...config, ocrForImages: !!c })}
              />
              <Label htmlFor="doc-ocr" className="text-sm font-medium cursor-pointer">Enable OCR for Images</Label>
            </div>

            <div className="flex items-center gap-3 p-3 border rounded">
              <Checkbox
                id="doc-content"
                checked={config.contentAnalysis}
                onCheckedChange={(c) => onChange({ ...config, contentAnalysis: !!c })}
              />
              <Label htmlFor="doc-content" className="text-sm font-medium cursor-pointer">Enable Content Analysis (LLM)</Label>
            </div>

            <div className="flex items-center gap-3 p-3 border rounded">
              <Checkbox
                id="doc-entity"
                checked={config.entityExtraction}
                onCheckedChange={(c) => onChange({ ...config, entityExtraction: !!c })}
              />
              <Label htmlFor="doc-entity" className="text-sm font-medium cursor-pointer">Enable Entity Extraction</Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="doc-max-mb">Maximum Document Size (MB)</Label>
              <Input
                id="doc-max-mb"
                type="number"
                value={config.maxDocumentSizeMB}
                onChange={(e) => onChange({ ...config, maxDocumentSizeMB: parseInt(e.target.value) || 50 })}
                min={1}
                max={500}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label>Supported File Types</Label>
              <div className="grid grid-cols-4 gap-2">
                {DEFAULT_FILE_TYPES.map((fileType) => (
                  <div key={fileType} className="flex items-center gap-2 p-2 border rounded">
                    <Checkbox
                      id={`file-${fileType}`}
                      checked={config.supportedFileTypes.includes(fileType)}
                      onCheckedChange={() => toggleFileType(fileType)}
                    />
                    <Label htmlFor={`file-${fileType}`} className="text-xs cursor-pointer">{fileType.toUpperCase()}</Label>
                  </div>
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
        <div className="flex items-start gap-3 p-3 border rounded">
          <Checkbox
            id="email-enabled"
            checked={config.enabled}
            onCheckedChange={(c) => onChange({ ...config, enabled: !!c })}
          />
          <div className="grid gap-1.5 leading-none">
            <Label htmlFor="email-enabled" className="text-sm font-medium cursor-pointer">Enable Email Processing</Label>
            <p className="text-xs text-muted-foreground">Process and analyze email content</p>
          </div>
        </div>

        {config.enabled && (
          <>
            <div className="flex items-center gap-3 p-3 border rounded">
              <Checkbox
                id="email-sentiment"
                checked={config.sentimentAnalysis}
                onCheckedChange={(c) => onChange({ ...config, sentimentAnalysis: !!c })}
              />
              <Label htmlFor="email-sentiment" className="text-sm font-medium cursor-pointer">Enable Sentiment Analysis</Label>
            </div>

            <div className="flex items-center gap-3 p-3 border rounded">
              <Checkbox
                id="email-action"
                checked={config.actionItemExtraction}
                onCheckedChange={(c) => onChange({ ...config, actionItemExtraction: !!c })}
              />
              <Label htmlFor="email-action" className="text-sm font-medium cursor-pointer">Enable Action Item Extraction</Label>
            </div>

            <div className="flex items-center gap-3 p-3 border rounded">
              <Checkbox
                id="email-attachments"
                checked={config.processAttachments}
                onCheckedChange={(c) => onChange({ ...config, processAttachments: !!c })}
              />
              <Label htmlFor="email-attachments" className="text-sm font-medium cursor-pointer">Process Attachments</Label>
            </div>

            <div className="flex items-center gap-3 p-3 border rounded">
              <Checkbox
                id="email-spam"
                checked={config.filterSpam}
                onCheckedChange={(c) => onChange({ ...config, filterSpam: !!c })}
              />
              <Label htmlFor="email-spam" className="text-sm font-medium cursor-pointer">Filter Spam</Label>
            </div>
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
        <div className="flex items-start gap-3 p-3 border rounded">
          <Checkbox
            id="meeting-enabled"
            checked={config.enabled}
            onCheckedChange={(c) => onChange({ ...config, enabled: !!c })}
          />
          <div className="grid gap-1.5 leading-none">
            <Label htmlFor="meeting-enabled" className="text-sm font-medium cursor-pointer">Enable Meeting Transcription</Label>
            <p className="text-xs text-muted-foreground">Transcribe and analyze meeting recordings</p>
          </div>
        </div>

        {config.enabled && (
          <>
            <div className="flex items-center gap-3 p-3 border rounded">
              <Checkbox
                id="meeting-trans"
                checked={config.transcription}
                onCheckedChange={(c) => onChange({ ...config, transcription: !!c })}
              />
              <Label htmlFor="meeting-trans" className="text-sm font-medium cursor-pointer">Enable Transcription</Label>
            </div>

            <div className="flex items-center gap-3 p-3 border rounded">
              <Checkbox
                id="meeting-diar"
                checked={config.speakerDiarization}
                onCheckedChange={(c) => onChange({ ...config, speakerDiarization: !!c })}
              />
              <Label htmlFor="meeting-diar" className="text-sm font-medium cursor-pointer">Enable Speaker Diarization</Label>
            </div>

            <div className="flex items-center gap-3 p-3 border rounded">
              <Checkbox
                id="meeting-key"
                checked={config.keyMomentDetection}
                onCheckedChange={(c) => onChange({ ...config, keyMomentDetection: !!c })}
              />
              <Label htmlFor="meeting-key" className="text-sm font-medium cursor-pointer">Enable Key Moment Detection</Label>
            </div>

            <div className="flex items-center gap-3 p-3 border rounded">
              <Checkbox
                id="meeting-action"
                checked={config.actionItemExtraction}
                onCheckedChange={(c) => onChange({ ...config, actionItemExtraction: !!c })}
              />
              <Label htmlFor="meeting-action" className="text-sm font-medium cursor-pointer">Enable Action Item Extraction</Label>
            </div>

            <div className="flex items-center gap-3 p-3 border rounded">
              <Checkbox
                id="meeting-deal"
                checked={config.dealSignalDetection}
                onCheckedChange={(c) => onChange({ ...config, dealSignalDetection: !!c })}
              />
              <Label htmlFor="meeting-deal" className="text-sm font-medium cursor-pointer">Enable Deal Signal Detection</Label>
            </div>

            <div className="space-y-2">
              <Label>Transcription Quality</Label>
              <Select
                value={config.transcriptionQuality}
                onValueChange={(v) => onChange({ ...config, transcriptionQuality: v as 'standard' | 'high' })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="meeting-max-min">Maximum Recording Duration (minutes)</Label>
              <Input
                id="meeting-max-min"
                type="number"
                value={config.maxRecordingDurationMinutes}
                onChange={(e) =>
                  onChange({
                    ...config,
                    maxRecordingDurationMinutes: parseInt(e.target.value) || 120,
                  })
                }
                min={1}
                max={480}
                className="w-full"
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => moveUp(index)}
                disabled={index === 0}
                className="px-2 text-xs"
              >
                ↑
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => moveDown(index)}
                disabled={index === priorities.length - 1}
                className="px-2 text-xs"
              >
                ↓
              </Button>
            </div>
          ))}
      </div>
    </div>
  );
}
