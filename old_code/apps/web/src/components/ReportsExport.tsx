import React, { useState, useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import { trackException, trackTrace } from '@/lib/monitoring/app-insights';
import {
  BarChart3,
  Plus,
  Download,
  Trash2,
  Calendar,
  Clock,
  Mail,
  AlertCircle,
  CheckCircle,
  X,
} from 'lucide-react';

interface Report {
  id: string;
  name: string;
  type: 'dashboard' | 'analytics' | 'audit' | 'custom';
  schedule: {
    frequency: 'once' | 'daily' | 'weekly' | 'monthly';
    timezone: string;
    dayOfWeek?: number;
    time?: string;
    recipients?: string[];
  };
  format: 'pdf' | 'csv' | 'excel' | 'json' | 'parquet';
  deliveryMethod: 'email' | 'download' | 'webhook';
  filters?: Record<string, unknown>;
  createdAt: string;
  nextRun?: string;
  lastRun?: string;
}

interface CreateReportForm {
  name: string;
  type: 'dashboard' | 'analytics' | 'audit' | 'custom';
  metrics: string[];
  dateRange: {
    start: string;
    end: string;
  };
  schedule: {
    frequency: 'once' | 'daily' | 'weekly' | 'monthly';
    timezone: string;
    dayOfWeek?: number;
    time?: string;
  };
  format: 'pdf' | 'csv' | 'excel' | 'json' | 'parquet';
  deliveryMethod: 'email' | 'download' | 'webhook';
  recipients: string[];
}

const REPORT_TYPES = [
  { id: 'dashboard', label: 'Dashboard Report', icon: '📊' },
  { id: 'analytics', label: 'Analytics Report', icon: '📈' },
  { id: 'audit', label: 'Audit Report', icon: '📋' },
  { id: 'custom', label: 'Custom Report', icon: '⚙️' },
];

const AVAILABLE_METRICS = [
  'Active Projects',
  'Total Users',
  'API Calls',
  'Storage Used',
  'User Growth',
  'Feature Adoption',
  'System Uptime',
  'Response Time',
  'Error Rate',
  'Audit Events',
];

const ReportsExport: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState<CreateReportForm>({
    name: '',
    type: 'dashboard',
    metrics: [],
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T' as any)[0],
      end: new Date().toISOString().split('T' as any)[0],
    },
    schedule: {
      frequency: 'once',
      timezone: 'UTC',
      time: '09:00',
    },
    format: 'pdf',
    deliveryMethod: 'download',
    recipients: [],
  });

  // Fetch reports
  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/v1/reports' as any);
      setReports(response.data.data || []);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      trackException(errorObj, 3)
      trackTrace('Failed to fetch reports', 3, {
        errorMessage: errorObj.message,
      })
      setMessage({ type: 'error', text: 'Failed to load reports' });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Create report
  const createReport = async () => {
    if (!createForm.name.trim()) {
      setMessage({ type: 'error', text: 'Report name is required' });
      return;
    }

    if (createForm.metrics.length === 0 && createForm.type !== 'custom') {
      setMessage({ type: 'error', text: 'Select at least one metric' });
      return;
    }

    try {
      const payload = {
        ...createForm,
        recipients:
          createForm.deliveryMethod === 'email'
            ? createForm.recipients.filter((r) => r.trim())
            : [],
      };

      await apiClient.post('/api/v1/reports', payload);

      setMessage({ type: 'success', text: 'Report created successfully' });
      fetchReports();
      closeModal();
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      trackException(errorObj, 3)
      trackTrace('Failed to create report', 3, {
        errorMessage: errorObj.message,
        reportName: createForm.name,
        reportType: createForm.type,
      })
      setMessage({ type: 'error', text: 'Failed to create report' });
    }
  };

  // Download report
  const downloadReport = async (reportId: string, format: string) => {
    try {
      setDownloadingId(reportId);
      const response = await apiClient.get(`/api/v1/reports/${reportId}/export`, {
        params: { format },
        responseType: 'blob',
        timeout: 30000,
      });

      const url = window.URL.createObjectURL(response.data);
      const a = document.createElement('a' as any);
      a.href = url;
      a.download = `report.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);

      setMessage({ type: 'success', text: 'Report downloaded successfully' });
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      trackException(errorObj, 3)
      trackTrace('Failed to download report', 3, {
        errorMessage: errorObj.message,
        reportId,
        format,
      })
      setMessage({ type: 'error', text: 'Failed to download report' });
    } finally {
      setDownloadingId(null);
    }
  };

  // Delete report
  const deleteReport = async (reportId: string) => {
    if (!window.confirm('Are you sure you want to delete this report?')) return;

    try {
      await apiClient.delete(`/api/v1/reports/${reportId}`);
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      setMessage({ type: 'success', text: 'Report deleted successfully' });
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      trackException(errorObj, 3)
      trackTrace('Failed to delete report', 3, {
        errorMessage: errorObj.message,
        reportId,
      })
      setMessage({ type: 'error', text: 'Failed to delete report' });
    }
  };

  // Toggle metric selection
  const toggleMetric = (metric: string) => {
    setCreateForm((prev) => ({
      ...prev,
      metrics: prev.metrics.includes(metric)
        ? prev.metrics.filter((m) => m !== metric)
        : [...prev.metrics, metric],
    }));
  };

  // Add recipient
  const addRecipient = () => {
    setCreateForm((prev) => ({
      ...prev,
      recipients: [...prev.recipients, ''],
    }));
  };

  // Remove recipient
  const removeRecipient = (index: number) => {
    setCreateForm((prev) => ({
      ...prev,
      recipients: prev.recipients.filter((_, i) => i !== index),
    }));
  };

  // Close modal
  const closeModal = () => {
    setShowCreateModal(false);
    setCreateForm({
      name: '',
      type: 'dashboard',
      metrics: [],
      dateRange: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T' as any)[0],
        end: new Date().toISOString().split('T' as any)[0],
      },
      schedule: {
        frequency: 'once',
        timezone: 'UTC',
        time: '09:00',
      },
      format: 'pdf',
      deliveryMethod: 'download',
      recipients: [],
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-gray-700" />
            <h1 className="text-3xl font-bold text-gray-900">Reports & Export</h1>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition"
          >
            <Plus className="w-4 h-4" />
            Create Report
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
            <p className="mt-2 text-gray-600">Loading reports...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No reports created yet</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 text-blue-500 hover:text-blue-700"
            >
              Create your first report
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reports.map((report) => (
              <div key={report.id} className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{report.name}</h3>
                    <p className="text-sm text-gray-600">
                      {REPORT_TYPES.find((t) => t.id === report.type)?.label}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteReport(report.id)}
                    className="text-red-500 hover:text-red-700 p-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Report Details */}
                <div className="space-y-3 mb-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{report.format.toUpperCase()} Format</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span className="capitalize">{report.schedule.frequency} schedule</span>
                  </div>
                  {report.schedule.frequency !== 'once' && report.nextRun && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>Next run: {new Date(report.nextRun).toLocaleString()}</span>
                    </div>
                  )}
                  {report.lastRun && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>Last run: {new Date(report.lastRun).toLocaleString()}</span>
                    </div>
                  )}
                  {report.schedule.recipients && report.schedule.recipients.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      <span>{report.schedule.recipients.length} recipient(s)</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => downloadReport(report.id, report.format)}
                    disabled={downloadingId === report.id}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    {downloadingId === report.id ? 'Downloading...' : 'Download'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Report Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-gray-900">Create New Report</h2>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Report Name
                </label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="e.g., Monthly Analytics Report"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              {/* Report Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Report Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {REPORT_TYPES.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setCreateForm({ ...createForm, type: type.id as any })}
                      className={`p-3 rounded-lg border-2 transition text-left ${
                        createForm.type === type.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-2xl">{type.icon}</span>
                      <p className="font-medium text-gray-900 mt-1">{type.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Metrics Selection */}
              {createForm.type !== 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Select Metrics
                  </label>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                    {AVAILABLE_METRICS.map((metric) => (
                      <label key={metric} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={createForm.metrics.includes(metric)}
                          onChange={() => toggleMetric(metric)}
                          className="w-4 h-4 rounded"
                        />
                        <span className="text-sm text-gray-700">{metric}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Range
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    value={createForm.dateRange.start}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        dateRange: { ...createForm.dateRange, start: e.target.value },
                      })
                    }
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="date"
                    value={createForm.dateRange.end}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        dateRange: { ...createForm.dateRange, end: e.target.value },
                      })
                    }
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Format */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Export Format
                </label>
                <select
                  value={createForm.format}
                  onChange={(e) => setCreateForm({ ...createForm, format: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="pdf">PDF</option>
                  <option value="csv">CSV</option>
                  <option value="excel">Excel</option>
                  <option value="json">JSON</option>
                  <option value="parquet">Parquet</option>
                </select>
              </div>

              {/* Schedule */}
              <div className="border-t pt-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Schedule
                </label>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Frequency</label>
                    <select
                      value={createForm.schedule.frequency}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          schedule: {
                            ...createForm.schedule,
                            frequency: e.target.value as any,
                          },
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="once">One-time</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Timezone</label>
                    <select
                      value={createForm.schedule.timezone}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          schedule: {
                            ...createForm.schedule,
                            timezone: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option>UTC</option>
                      <option>EST</option>
                      <option>CST</option>
                      <option>PST</option>
                    </select>
                  </div>
                </div>

                {createForm.schedule.frequency !== 'once' && (
                  <input
                    type="time"
                    value={createForm.schedule.time}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        schedule: {
                          ...createForm.schedule,
                          time: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-4"
                  />
                )}
              </div>

              {/* Delivery Method */}
              <div className="border-t pt-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Delivery Method
                </label>
                <select
                  value={createForm.deliveryMethod}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      deliveryMethod: e.target.value as any,
                      recipients:
                        e.target.value === 'email' ? createForm.recipients : [],
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4"
                >
                  <option value="download">Download</option>
                  <option value="email">Email</option>
                  <option value="webhook">Webhook</option>
                </select>

                {createForm.deliveryMethod === 'email' && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs text-gray-600">Recipients</label>
                      <button
                        onClick={addRecipient}
                        className="text-xs text-blue-500 hover:text-blue-700"
                      >
                        + Add
                      </button>
                    </div>
                    <div className="space-y-2">
                      {createForm.recipients.map((recipient, idx) => (
                        <div key={idx} className="flex gap-2">
                          <input
                            type="email"
                            value={recipient}
                            onChange={(e) => {
                              const newRecipients = [...createForm.recipients];
                              newRecipients[idx] = e.target.value;
                              setCreateForm({
                                ...createForm,
                                recipients: newRecipients,
                              });
                            }}
                            placeholder="email@example.com"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                          {createForm.recipients.length > 1 && (
                            <button
                              onClick={() => removeRecipient(idx)}
                              className="p-2 text-red-500 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
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
                  onClick={createReport}
                  className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
                >
                  Create Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsExport;
