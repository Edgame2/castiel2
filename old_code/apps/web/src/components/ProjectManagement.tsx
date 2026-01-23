/**
 * Project Management Component
 * Create, edit, delete, and manage projects with full CRUD operations
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ChevronDownIcon, PlusIcon, EyeIcon, TrashIcon, ShareIcon, ArchiveIcon } from 'lucide-react';
import { getAuthTokenForRequest } from '@/lib/auth-utils';
import { trackException, trackTrace } from '@/lib/monitoring/app-insights';

interface Project {
  id: string;
  name: string;
  description: string;
  category: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'archived';
  owner: string;
  collaboratorCount: number;
  shardCount: number;
}

interface CreateProjectPayload {
  name: string;
  description: string;
  category: string;
  templateId?: string;
}

export const ProjectManagement: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'archived'>('active');
  const [sortBy, setSortBy] = useState<'created' | 'name' | 'updated'>('created');
  const [formData, setFormData] = useState<CreateProjectPayload>({
    name: '',
    description: '',
    category: 'general',
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
  }, [filterStatus, sortBy]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const token = await getAuthTokenForRequest();
      const response = await axios.get('/api/v1/projects', {
        params: {
          status: filterStatus === 'all' ? undefined : filterStatus,
          sortBy,
          limit: 100,
        },
        headers: { Authorization: `Bearer ${token || ''}` },
        withCredentials: true,
      });
      setProjects(response.data.items);
      setError(null);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      trackException(errorObj, 3)
      trackTrace('Failed to load projects', 3, {
        errorMessage: errorObj.message,
      })
      setError('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = await getAuthTokenForRequest();
      const response = await axios.post('/api/v1/projects', formData, {
        headers: { Authorization: `Bearer ${token || ''}` },
        withCredentials: true,
      });
      setProjects([response.data, ...projects]);
      setShowCreateModal(false);
      setFormData({ name: '', description: '', category: 'general' });
      setError(null);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      trackException(errorObj, 3)
      trackTrace('Failed to create project', 3, {
        errorMessage: errorObj.message,
        projectName: formData.name,
      })
      setError('Failed to create project');
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      const token = await getAuthTokenForRequest();
      await axios.delete(`/api/v1/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token || ''}` },
        withCredentials: true,
      });
      setProjects(projects.filter((p) => p.id !== projectId));
      setError(null);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      trackException(errorObj, 3)
      trackTrace('Failed to delete project', 3, {
        errorMessage: errorObj.message,
        projectId,
      })
      setError('Failed to delete project');
    }
  };

  const handleArchiveProject = async (projectId: string) => {
    try {
      const token = await getAuthTokenForRequest();
      await axios.put(
        `/api/v1/projects/${projectId}`,
        { status: 'archived' },
        {
          headers: { Authorization: `Bearer ${token || ''}` },
          withCredentials: true,
        }
      );
      loadProjects();
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      trackException(errorObj, 3)
      trackTrace('Failed to archive project', 3, {
        errorMessage: errorObj.message,
        projectId,
      })
      setError('Failed to archive project');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-slate-900">Projects</h1>
          <p className="text-slate-600 mt-1">Manage all your projects in one place</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          <PlusIcon size={20} />
          New Project
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">{error}</div>
      )}

      {/* Filters & Sort */}
      <div className="flex gap-4 mb-6">
        <div className="flex gap-2">
          {(['all', 'active', 'archived'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterStatus === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 font-medium"
        >
          <option value="created">Recently Created</option>
          <option value="updated">Recently Updated</option>
          <option value="name">Name (A-Z)</option>
        </select>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 w-full max-w-md">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Create New Project</h2>
            <form onSubmit={handleCreateProject}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">Project Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter project name"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter project description"
                  rows={4}
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="general">General</option>
                  <option value="business">Business</option>
                  <option value="personal">Personal</option>
                  <option value="research">Research</option>
                </select>
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

      {/* Projects List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">Loading projects...</div>
        ) : projects.length === 0 ? (
          <div className="bg-white rounded-lg p-12 text-center">
            <p className="text-slate-600 text-lg">No projects found</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Create Your First Project
            </button>
          </div>
        ) : (
          projects.map((project) => (
            <div key={project.id} className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-900">{project.name}</h3>
                  <p className="text-slate-600 mt-1">{project.description}</p>
                  <div className="flex gap-4 mt-4 text-sm text-slate-600">
                    <span>👥 {project.collaboratorCount} collaborators</span>
                    <span>📊 {project.shardCount} shards</span>
                    <span>📅 {new Date(project.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    title="View"
                    className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <EyeIcon size={20} />
                  </button>
                  <button
                    title="Share"
                    className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <ShareIcon size={20} />
                  </button>
                  <button
                    onClick={() => handleArchiveProject(project.id)}
                    title="Archive"
                    className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <ArchiveIcon size={20} />
                  </button>
                  <button
                    onClick={() => handleDeleteProject(project.id)}
                    title="Delete"
                    className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                  >
                    <TrashIcon size={20} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ProjectManagement;
