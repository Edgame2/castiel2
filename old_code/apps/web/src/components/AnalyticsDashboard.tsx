/**
 * Analytics Dashboard Component
 * Display project metrics, trends, user behavior, feature adoption, and custom reports
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getAuthTokenForRequest } from '@/lib/auth-utils';
import { trackException, trackTrace } from '@/lib/monitoring/app-insights';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { TrendingUp, TrendingDown, Download, Filter } from 'lucide-react';

interface Metric {
  name: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
}

interface AnalyticsDashboardProps {
  projectId: string;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ projectId }) => {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [userBehavior, setUserBehavior] = useState<any>(null);
  const [featureAdoption, setFeatureAdoption] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('7d');
  const [customReport, setCustomReport] = useState<any>(null);
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, [projectId, period]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const token = await getAuthTokenForRequest();
      const authHeaders = { Authorization: `Bearer ${token || ''}` };

      // Load metrics
      const metricsResponse = await axios.get(`/api/v1/analytics/metrics/${projectId}`, {
        params: { period },
        headers: authHeaders,
        withCredentials: true,
      });
      setMetrics(metricsResponse.data.metrics);

      // Load trends
      const trendsResponse = await axios.get(`/api/v1/analytics/trends`, {
        params: { projectId, period },
        headers: authHeaders,
        withCredentials: true,
      });
      setTrendData(trendsResponse.data.data);

      // Load user behavior
      const behaviorResponse = await axios.get(`/api/v1/analytics/user-behavior`, {
        params: { projectId },
        headers: authHeaders,
        withCredentials: true,
      });
      setUserBehavior(behaviorResponse.data);

      // Load feature adoption
      const adoptionResponse = await axios.get(`/api/v1/analytics/feature-adoption`, {
        params: { projectId },
        headers: authHeaders,
        withCredentials: true,
      });
      setFeatureAdoption(adoptionResponse.data.features);
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 3)
      trackTrace('Failed to load analytics', 3, {
        errorMessage: errorObj.message,
        projectId,
      })
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async (reportType: string) => {
    try {
      const token = await getAuthTokenForRequest();
      const response = await axios.post(
        `/api/v1/analytics/reports`,
        {
          projectId,
          reportType,
          period,
          includeCharts: true,
          includeMetrics: true,
        },
        {
          headers: { Authorization: `Bearer ${token || ''}` },
          withCredentials: true,
        }
      );
      setCustomReport(response.data);
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 3)
      trackTrace('Failed to generate report', 3, {
        errorMessage: errorObj.message,
        projectId,
        reportType,
      })
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Analytics</h2>
          <p className="text-slate-600 mt-1">Track project metrics and user engagement</p>
        </div>

        <div className="flex gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 font-medium"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>

          <button
            onClick={() => setShowReportModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            <Download size={18} />
            Generate Report
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => (
          <div key={metric.name} className="bg-white rounded-lg p-6 shadow-sm">
            <p className="text-slate-600 text-sm font-medium">{metric.name}</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{metric.value}</p>
            <div className="flex items-center gap-1 mt-2">
              {metric.trend === 'up' ? (
                <>
                  <TrendingUp size={16} className="text-green-600" />
                  <span className="text-green-600 text-sm font-semibold">{Math.abs(metric.change)}%</span>
                </>
              ) : metric.trend === 'down' ? (
                <>
                  <TrendingDown size={16} className="text-red-600" />
                  <span className="text-red-600 text-sm font-semibold">{Math.abs(metric.change)}%</span>
                </>
              ) : (
                <span className="text-slate-500 text-sm font-semibold">Stable</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trends */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip />
              <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="#93c5fd" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Feature Adoption */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Top Features</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={featureAdoption.slice(0, 6)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip />
              <Bar dataKey="usage" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* User Behavior */}
      {userBehavior && (
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-4">User Behavior</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-slate-600">Total Sessions</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{userBehavior.totalSessions}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Avg Session Duration</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{userBehavior.avgSessionDuration}m</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Engagement Score</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{userBehavior.engagementScore}/100</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Churn Risk</p>
              <p
                className={`text-2xl font-bold mt-1 ${
                  userBehavior.churnRisk === 'high'
                    ? 'text-red-600'
                    : userBehavior.churnRisk === 'medium'
                    ? 'text-yellow-600'
                    : 'text-green-600'
                }`}
              >
                {userBehavior.churnRisk}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 w-full max-w-md">
            <h3 className="text-2xl font-bold text-slate-900 mb-6">Generate Report</h3>

            <div className="space-y-3 mb-6">
              {[
                { type: 'summary', label: 'Summary Report' },
                { type: 'detailed', label: 'Detailed Report' },
                { type: 'trends', label: 'Trends Analysis' },
                { type: 'user_behavior', label: 'User Behavior Report' },
              ].map((report) => (
                <button
                  key={report.type}
                  onClick={() => {
                    handleGenerateReport(report.type);
                    setShowReportModal(false);
                  }}
                  className="w-full text-left px-4 py-3 bg-slate-50 hover:bg-blue-50 rounded-lg border border-slate-200 hover:border-blue-300 transition-colors"
                >
                  <p className="font-medium text-slate-900">{report.label}</p>
                  <p className="text-sm text-slate-600 mt-1">PDF export included</p>
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowReportModal(false)}
              className="w-full px-4 py-2 bg-slate-200 text-slate-900 rounded-lg font-medium hover:bg-slate-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
