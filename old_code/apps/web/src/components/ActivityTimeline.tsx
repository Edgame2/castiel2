/**
 * Activity Timeline Component
 * Display project activity with filtering, export, and detailed event information
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Download, Filter, Clock, User } from 'lucide-react';
import { getAuthTokenForRequest } from '@/lib/auth-utils';
import { trackException, trackTrace } from '@/lib/monitoring/app-insights';

interface ActivityEvent {
  id: string;
  eventType: string;
  action: string;
  resourceType: string;
  resourceName: string;
  userId: string;
  userName: string;
  timestamp: Date;
  details?: Record<string, any>;
  changes?: Array<{
    field: string;
    oldValue: any;
    newValue: any;
  }>;
}

interface ActivityTimelineProps {
  projectId: string;
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ projectId }) => {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  useEffect(() => {
    loadActivity();
  }, [projectId, filterType, startDate, endDate]);

  const loadActivity = async () => {
    try {
      setLoading(true);
      const token = await getAuthTokenForRequest();
      const response = await axios.get(`/api/v1/projects/${projectId}/activity`, {
        params: {
          eventType: filterType === 'all' ? undefined : filterType,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          limit: 100,
        },
        headers: { Authorization: `Bearer ${token || ''}` },
        withCredentials: true,
      });
      setEvents(response.data.events);
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 3)
      trackTrace('Failed to load activity', 3, {
        errorMessage: errorObj.message,
        projectId,
      })
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'json' | 'csv' | 'pdf') => {
    try {
      const token = await getAuthTokenForRequest();
      const response = await axios.get(`/api/v1/projects/${projectId}/activity/export`, {
        params: {
          format,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        },
        headers: { Authorization: `Bearer ${token || ''}` },
        withCredentials: true,
      });

      // Create download link
      const element = document.createElement('a' as any);
      element.setAttribute('href', `data:text/plain;charset=utf-8,${encodeURIComponent(response.data.content)}`);
      element.setAttribute('download', `activity.${format}`);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 3)
      trackTrace('Failed to export activity', 3, {
        errorMessage: errorObj.message,
        projectId,
        format,
      })
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'CREATE':
        return '✨';
      case 'UPDATE':
        return '✏️';
      case 'DELETE':
        return '🗑️';
      case 'SHARE':
        return '👥';
      case 'COMMENT':
        return '💬';
      default:
        return '📝';
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'CREATE':
        return 'from-green-500 to-green-600';
      case 'UPDATE':
        return 'from-blue-500 to-blue-600';
      case 'DELETE':
        return 'from-red-500 to-red-600';
      case 'SHARE':
        return 'from-purple-500 to-purple-600';
      default:
        return 'from-slate-500 to-slate-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Activity Timeline</h2>
          <p className="text-slate-600 mt-1">Track all changes to this project</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleExport('json' as any)}
            className="flex items-center gap-2 px-4 py-2 bg-white text-slate-600 rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors"
          >
            <Download size={18} />
            JSON
          </button>
          <button
            onClick={() => handleExport('csv' as any)}
            className="flex items-center gap-2 px-4 py-2 bg-white text-slate-600 rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors"
          >
            <Download size={18} />
            CSV
          </button>
          <button
            onClick={() => handleExport('pdf' as any)}
            className="flex items-center gap-2 px-4 py-2 bg-white text-slate-600 rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors"
          >
            <Download size={18} />
            PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Event Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Events</option>
              <option value="CREATE">Created</option>
              <option value="UPDATE">Updated</option>
              <option value="DELETE">Deleted</option>
              <option value="SHARE">Shared</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setFilterType('all');
                setStartDate('');
                setEndDate('');
              }}
              className="w-full px-4 py-2 bg-slate-200 text-slate-900 rounded-lg font-medium hover:bg-slate-300 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">Loading activity...</div>
        ) : events.length === 0 ? (
          <div className="bg-white rounded-lg p-12 text-center">
            <Clock size={48} className="mx-auto text-slate-400 mb-4" />
            <p className="text-slate-600 text-lg">No activity found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <div
                key={event.id}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                {/* Main Event */}
                <div
                  className="p-4 flex items-start gap-4 cursor-pointer hover:bg-slate-50"
                  onClick={() => setExpandedEvent(expandedEvent === event.id ? null : event.id)}
                >
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getEventColor(event.eventType)} flex items-center justify-center text-white text-lg flex-shrink-0`}>
                    {getEventIcon(event.eventType)}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {event.action} <span className="text-slate-600">{event.resourceType}</span>
                        </p>
                        <p className="text-sm text-slate-600 mt-1">{event.resourceName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-slate-900 flex items-center gap-1">
                          <User size={14} />
                          {event.userName}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(event.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Expand indicator */}
                  <div
                    className={`text-slate-400 transition-transform ${
                      expandedEvent === event.id ? 'rotate-180' : ''
                    }`}
                  >
                    ▼
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedEvent === event.id && (
                  <div className="px-4 pb-4 border-t border-slate-200 bg-slate-50">
                    {event.changes && event.changes.length > 0 && (
                      <div>
                        <p className="font-semibold text-slate-900 mb-3">Changes</p>
                        <div className="space-y-2">
                          {event.changes.map((change, idx) => (
                            <div key={idx} className="text-sm bg-white p-2 rounded border border-slate-200">
                              <p className="font-medium text-slate-900">{change.field}</p>
                              <div className="flex gap-2 mt-1">
                                <span className="text-red-600 line-through">{String(change.oldValue)}</span>
                                <span className="text-green-600">{String(change.newValue)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {event.details && Object.keys(event.details).length > 0 && (
                      <div className="mt-4">
                        <p className="font-semibold text-slate-900 mb-2">Details</p>
                        <pre className="text-xs bg-white p-2 rounded border border-slate-200 overflow-x-auto">
                          {JSON.stringify(event.details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
        <p className="text-sm text-slate-600">
          Showing {events.length} event{events.length !== 1 ? 's' : ''} in the selected timeframe
        </p>
      </div>
    </div>
  );
};

export default ActivityTimeline;
