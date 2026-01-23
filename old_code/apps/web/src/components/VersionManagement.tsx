/**
 * Version Management Component
 * Create, compare, rollback, and publish project versions
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { GitBranch, Copy, Trash2, Check, ArrowLeft } from 'lucide-react';
import { getAuthTokenForRequest } from '@/lib/auth-utils';
import { trackException, trackTrace } from '@/lib/monitoring/app-insights';

interface Version {
  id: string;
  number: number;
  name: string;
  description: string;
  createdBy: string;
  createdAt: Date;
  status: 'draft' | 'published' | 'archived';
  changesSummary: string;
  size: number;
  tags?: string[];
}

interface VersionManagementProps {
  projectId: string;
}

export const VersionManagement: React.FC<VersionManagementProps> = ({ projectId }) => {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [compareWith, setCompareWith] = useState<Version | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadVersions();
  }, [projectId]);

  const loadVersions = async () => {
    try {
      setLoading(true);
      const token = await getAuthTokenForRequest();
      const response = await axios.get(`/api/v1/projects/${projectId}/versions`, {
        headers: { Authorization: `Bearer ${token || ''}` },
        withCredentials: true,
      });
      setVersions(response.data.versions);
      setError(null);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      trackException(errorObj, 3)
      trackTrace('Failed to load versions', 3, {
        errorMessage: errorObj.message,
        projectId,
      })
      setError('Failed to load versions');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = await getAuthTokenForRequest();
      const response = await axios.post(
        `/api/v1/projects/${projectId}/versions`,
        {
          name: formData.name,
          description: formData.description,
        },
        {
          headers: { Authorization: `Bearer ${token || ''}` },
          withCredentials: true,
        }
      );

      setVersions([response.data, ...versions]);
      setShowCreateModal(false);
      setFormData({ name: '', description: '' });
      setError(null);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      trackException(errorObj, 3)
      trackTrace('Failed to create version', 3, {
        errorMessage: errorObj.message,
        projectId,
        versionName: formData.name,
      })
      setError('Failed to create version');
    }
  };

  const handlePublishVersion = async (versionId: string) => {
    try {
      const token = await getAuthTokenForRequest();
      await axios.post(
        `/api/v1/projects/${projectId}/versions/${versionId}/publish`,
        {},
        {
          headers: { Authorization: `Bearer ${token || ''}` },
          withCredentials: true,
        }
      );

      loadVersions();
      setError(null);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      trackException(errorObj, 3)
      trackTrace('Failed to publish version', 3, {
        errorMessage: errorObj.message,
        projectId,
        versionId,
      })
      setError('Failed to publish version');
    }
  };

  const handleRollback = async (versionId: string) => {
    if (!confirm('Rollback to this version? Current changes will be archived.')) return;

    try {
      const token = await getAuthTokenForRequest();
      await axios.post(
        `/api/v1/projects/${projectId}/versions/${versionId}/rollback`,
        {},
        {
          headers: { Authorization: `Bearer ${token || ''}` },
          withCredentials: true,
        }
      );

      loadVersions();
      setError(null);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      trackException(errorObj, 3)
      trackTrace('Failed to rollback version', 3, {
        errorMessage: errorObj.message,
        projectId,
        versionId,
      })
      setError('Failed to rollback version');
    }
  };

  const handleDeleteVersion = async (versionId: string) => {
    if (!confirm('Delete this version? This action cannot be undone.')) return;

    try {
      const token = await getAuthTokenForRequest();
      await axios.delete(`/api/v1/projects/${projectId}/versions/${versionId}`, {
        headers: { Authorization: `Bearer ${token || ''}` },
        withCredentials: true,
      });

      setVersions(versions.filter((v) => v.id !== versionId));
      setSelectedVersion(null);
      setError(null);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      trackException(errorObj, 3)
      trackTrace('Failed to delete version', 3, {
        errorMessage: errorObj.message,
        projectId,
        versionId,
      })
      setError('Failed to delete version');
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-blue-100 text-blue-800';
      case 'archived':
        return 'bg-slate-100 text-slate-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Versions</h2>
          <p className="text-slate-600 mt-1">Manage project versions and history</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          <GitBranch size={20} />
          Create Version
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">{error}</div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 w-full max-w-md">
            <h3 className="text-2xl font-bold text-slate-900 mb-6">Create New Version</h3>

            <form onSubmit={handleCreateVersion}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">Version Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Release 1.0"
                  required
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe what changed in this version"
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-200 text-slate-900 rounded-lg font-medium hover:bg-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Version Details */}
      {selectedVersion && (
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <button
            onClick={() => setSelectedVersion(null)}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft size={18} />
            Back to list
          </button>

          <div className="mb-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-2xl font-bold text-slate-900">{selectedVersion.name}</h3>
                <p className="text-slate-600 mt-1">v{selectedVersion.number}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusBadgeColor(selectedVersion.status)}`}>
                {selectedVersion.status}
              </span>
            </div>

            <p className="text-slate-700">{selectedVersion.description}</p>

            <div className="grid grid-cols-3 gap-4 mt-6 p-4 bg-slate-50 rounded-lg">
              <div>
                <p className="text-sm text-slate-600">Created By</p>
                <p className="text-lg font-semibold text-slate-900">{selectedVersion.createdBy}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Created At</p>
                <p className="text-lg font-semibold text-slate-900">
                  {new Date(selectedVersion.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Size</p>
                <p className="text-lg font-semibold text-slate-900">{(selectedVersion.size / 1024).toFixed(2)} KB</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            {selectedVersion.status === 'draft' && (
              <button
                onClick={() => handlePublishVersion(selectedVersion.id)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                <Check size={18} />
                Publish
              </button>
            )}

            <button
              onClick={() => handleRollback(selectedVersion.id)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <ArrowLeft size={18} />
              Rollback
            </button>

            <button
              onClick={() => handleDeleteVersion(selectedVersion.id)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
            >
              <Trash2 size={18} />
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Versions List */}
      {!selectedVersion && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">Loading versions...</div>
          ) : versions.length === 0 ? (
            <div className="bg-white rounded-lg p-12 text-center">
              <p className="text-slate-600 text-lg">No versions yet</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Create First Version
              </button>
            </div>
          ) : (
            versions.map((version) => (
              <div
                key={version.id}
                onClick={() => setSelectedVersion(version)}
                className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-900">{version.name}</h3>
                    <p className="text-slate-600 mt-1">v{version.number}</p>
                    <p className="text-slate-600 text-sm mt-2">{version.changesSummary}</p>
                    {version.tags && version.tags.length > 0 && (
                      <div className="flex gap-2 mt-3">
                        {version.tags.map((tag) => (
                          <span key={tag} className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusBadgeColor(version.status)}`}>
                      {version.status}
                    </span>
                    <p className="text-slate-600 text-sm mt-3">{new Date(version.createdAt).toLocaleDateString()}</p>
                    <p className="text-slate-500 text-xs mt-1">by {version.createdBy}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default VersionManagement;
