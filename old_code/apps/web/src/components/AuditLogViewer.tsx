import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import { trackException, trackTrace } from '@/lib/monitoring/app-insights';
import {
  Search,
  FileText,
  Download,
  Filter,
  ChevronDown,
  Eye,
  Calendar,
  User,
  AlertCircle,
} from 'lucide-react';

interface AuditLog {
  id: string;
  action: string;
  resource: string;
  resourceId: string;
  userId: string;
  userName: string;
  timestamp: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  changes?: {
    field: string;
    before: unknown;
    after: unknown;
  }[];
  details?: Record<string, unknown>;
}

interface FilterOptions {
  action?: string;
  resource?: string;
  userId?: string;
  severity?: string;
  startDate?: string;
  endDate?: string;
}

const AuditLogViewer: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const [filters, setFilters] = useState<FilterOptions>({
    severity: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  // Fetch audit logs
  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (filters.action) params.action = filters.action;
      if (filters.resource) params.resource = filters.resource;
      if (filters.userId) params.userId = filters.userId;
      if (filters.severity) params.severity = filters.severity;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const response = await apiClient.get('/api/v1/enterprise/audit/logs/query', { params });
      setLogs(response.data.data || []);
      setCurrentPage(1);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      trackException(errorObj, 3)
      trackTrace('Failed to fetch audit logs', 3, {
        errorMessage: errorObj.message,
      })
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Filter and search
  useEffect(() => {
    let result = logs;

    if (searchTerm) {
      result = result.filter(
        (log) =>
          log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.userName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredLogs(result);
  }, [logs, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Export logs
  const exportLogs = async (format: 'csv' | 'pdf') => {
    try {
      const response = await apiClient.get('/api/v1/enterprise/audit/export', {
        params: { format },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(response.data);
      const a = document.createElement('a' as any);
      a.href = url;
      a.download = `audit-logs.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      trackException(errorObj, 3)
      trackTrace('Failed to export logs', 3, {
        errorMessage: errorObj.message,
        format,
      })
    }
  };

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // Get action icon
  const getActionIcon = (action: string) => {
    if (action.includes('DELETE')) return '🗑️';
    if (action.includes('CREATE')) return '✨';
    if (action.includes('UPDATE')) return '✏️';
    if (action.includes('SHARE')) return '👥';
    return '📝';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-gray-700" />
            <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition"
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
            <div className="relative group">
              <button className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition">
                <Download className="w-4 h-4" />
                Export
              </button>
              <div className="absolute right-0 mt-2 w-32 bg-white rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition pointer-events-none group-hover:pointer-events-auto">
                <button
                  onClick={() => exportLogs('csv')}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100"
                >
                  Export CSV
                </button>
                <button
                  onClick={() => exportLogs('pdf')}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100"
                >
                  Export PDF
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by action, resource, or user..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Action</label>
                <select
                  value={filters.action || ''}
                  onChange={(e) => setFilters({ ...filters, action: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">All Actions</option>
                  <option value="CREATE">Create</option>
                  <option value="UPDATE">Update</option>
                  <option value="DELETE">Delete</option>
                  <option value="SHARE">Share</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Resource</label>
                <select
                  value={filters.resource || ''}
                  onChange={(e) =>
                    setFilters({ ...filters, resource: e.target.value || undefined })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">All Resources</option>
                  <option value="PROJECT">Project</option>
                  <option value="VERSION">Version</option>
                  <option value="SHARE">Share</option>
                  <option value="TEMPLATE">Template</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Severity</label>
                <select
                  value={filters.severity || ''}
                  onChange={(e) =>
                    setFilters({ ...filters, severity: e.target.value || undefined })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">All Severities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                  <option value="info">Info</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={filters.startDate || ''}
                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value || undefined })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <input
                    type="date"
                    value={filters.endDate || ''}
                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value || undefined })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setFilters({ severity: '' });
                fetchLogs();
              }}
              className="mt-4 text-sm text-blue-500 hover:text-blue-700"
            >
              Clear Filters
            </button>
          </div>
        )}

        {/* Results Summary */}
        <div className="mb-4 text-sm text-gray-600">
          Showing {paginatedLogs.length} of {filteredLogs.length} logs
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-gray-600">Loading audit logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No audit logs found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {paginatedLogs.map((log) => (
              <div
                key={log.id}
                className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition"
              >
                {/* Log Row */}
                <button
                  onClick={() =>
                    setExpandedId(expandedId === log.id ? null : log.id)
                  }
                  className="w-full p-4 flex items-center gap-4 hover:bg-gray-50 transition text-left"
                >
                  <div className="flex-shrink-0 text-xl">{getActionIcon(log.action)}</div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{log.action}</span>
                      <span className="text-gray-600">{log.resource}</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${getSeverityColor(log.severity)}`}>
                        {log.severity.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {log.userName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <ChevronDown
                    className={`w-5 h-5 text-gray-400 transition ${
                      expandedId === log.id ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Expanded Details */}
                {expandedId === log.id && (
                  <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-gray-600">Resource ID</p>
                        <p className="text-sm text-gray-900 font-mono break-all">{log.resourceId}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-600">User ID</p>
                        <p className="text-sm text-gray-900 font-mono break-all">{log.userId}</p>
                      </div>
                    </div>

                    {log.changes && log.changes.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-2">Changes</p>
                        <div className="space-y-2">
                          {log.changes.map((change, idx) => (
                            <div key={idx} className="bg-white p-3 rounded border border-gray-200">
                              <p className="font-medium text-gray-900">{change.field}</p>
                              <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                                <div>
                                  <p className="text-gray-600">Before</p>
                                  <p className="font-mono text-gray-900 break-all">
                                    {JSON.stringify(change.before)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-gray-600">After</p>
                                  <p className="font-mono text-gray-900 break-all">
                                    {JSON.stringify(change.after)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {log.details && (
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-2">Details</p>
                        <pre className="bg-white p-3 rounded border border-gray-200 text-xs overflow-x-auto">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>

            <div className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </div>

            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogViewer;
