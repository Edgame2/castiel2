/**
 * Sharing & Collaboration Component
 * Share projects with collaborators, manage permissions, and handle invitations
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { XIcon, UserPlus, Shield, Clock, Mail } from 'lucide-react';
import { getAuthTokenForRequest } from '@/lib/auth-utils';
import { trackException, trackTrace } from '@/lib/monitoring/app-insights';

interface Collaborator {
  id: string;
  email: string;
  name: string;
  role: 'viewer' | 'editor' | 'admin';
  status: 'active' | 'pending';
  joinedAt?: Date;
  invitedAt?: Date;
}

interface SharePayload {
  emails: string[];
  role: 'viewer' | 'editor' | 'admin';
  message?: string;
}

interface SharingProps {
  projectId: string;
}

export const Sharing: React.FC<SharingProps> = ({ projectId }) => {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [emails, setEmails] = useState('');
  const [selectedRole, setSelectedRole] = useState<'viewer' | 'editor' | 'admin'>('editor');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadCollaborators();
  }, [projectId]);

  const loadCollaborators = async () => {
    try {
      setLoading(true);
      const token = await getAuthTokenForRequest();
      const response = await axios.get(`/api/v1/projects/${projectId}/collaborators`, {
        headers: { Authorization: `Bearer ${token || ''}` },
        withCredentials: true,
      });
      setCollaborators(response.data.collaborators);
      setError(null);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      trackException(errorObj, 3)
      trackTrace('Failed to load collaborators', 3, {
        errorMessage: errorObj.message,
        projectId,
      })
      setError('Failed to load collaborators');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const emailList = emails
      .split(',' as any)
      .map((email) => email.trim())
      .filter((email) => email.length > 0);

    if (emailList.length === 0) {
      setError('Please enter at least one email address');
      return;
    }

    try {
      const token = await getAuthTokenForRequest();
      await axios.post(
        `/api/v1/projects/${projectId}/share`,
        {
          emails: emailList,
          role: selectedRole,
          message,
        } as SharePayload,
        {
          headers: { Authorization: `Bearer ${token || ''}` },
          withCredentials: true,
        }
      );

      setSuccess(`Project shared with ${emailList.length} recipient(s)`);
      setEmails('');
      setMessage('');
      setShowShareModal(false);
      loadCollaborators();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      trackException(errorObj, 3)
      trackTrace('Failed to share project', 3, {
        errorMessage: errorObj.message,
        projectId,
        recipientCount: emailList.length,
      })
      setError('Failed to share project');
    }
  };

  const handleRemoveCollaborator = async (collaboratorId: string) => {
    if (!confirm('Remove this collaborator?')) return;

    try {
      const token = await getAuthTokenForRequest();
      await axios.delete(`/api/v1/projects/${projectId}/collaborators/${collaboratorId}`, {
        headers: { Authorization: `Bearer ${token || ''}` },
        withCredentials: true,
      });

      setCollaborators(collaborators.filter((c) => c.id !== collaboratorId));
      setSuccess('Collaborator removed');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      trackException(errorObj, 3)
      trackTrace('Failed to remove collaborator', 3, {
        errorMessage: errorObj.message,
        projectId,
        collaboratorId,
      })
      setError('Failed to remove collaborator');
    }
  };

  const handleChangeRole = async (collaboratorId: string, newRole: 'viewer' | 'editor' | 'admin') => {
    try {
      const token = await getAuthTokenForRequest();
      await axios.patch(
        `/api/v1/projects/${projectId}/collaborators/${collaboratorId}`,
        { role: newRole },
        {
          headers: { Authorization: `Bearer ${token || ''}` },
          withCredentials: true,
        }
      );

      setCollaborators(
        collaborators.map((c) => (c.id === collaboratorId ? { ...c, role: newRole } : c))
      );
      setSuccess('Role updated');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      trackException(errorObj, 3)
      trackTrace('Failed to change role', 3, {
        errorMessage: errorObj.message,
        projectId,
        collaboratorId,
        newRole,
      })
      setError('Failed to change role');
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'editor':
        return 'bg-blue-100 text-blue-800';
      case 'viewer':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    return status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Collaborators</h2>
          <p className="text-slate-600 mt-1">Manage who has access to this project</p>
        </div>
        <button
          onClick={() => setShowShareModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          <UserPlus size={20} />
          Share
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">{error}</div>
      )}
      {success && (
        <div className="p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">{success}</div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-slate-900">Share Project</h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <XIcon size={24} />
              </button>
            </div>

            <form onSubmit={handleShare}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">Email Addresses</label>
                <textarea
                  value={emails}
                  onChange={(e) => setEmails(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter email addresses (comma-separated)"
                  rows={3}
                />
                <p className="text-xs text-slate-500 mt-1">You can invite multiple people at once</p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">Permission Level</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as any)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="viewer">Viewer (read-only)</option>
                  <option value="editor">Editor (can modify)</option>
                  <option value="admin">Admin (full access)</option>
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">Message (optional)</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add a personal message to the invitation"
                  rows={2}
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowShareModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-200 text-slate-900 rounded-lg font-medium hover:bg-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Send Invites
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Collaborators List */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">Loading collaborators...</div>
        ) : collaborators.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-slate-600 text-lg">No collaborators yet</p>
            <p className="text-slate-500 mt-2">Share this project to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Email</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Role</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Joined</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {collaborators.map((collab) => (
                  <tr key={collab.id} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{collab.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{collab.email}</td>
                    <td className="px-6 py-4 text-sm">
                      <select
                        value={collab.role}
                        onChange={(e) => handleChangeRole(collab.id, e.target.value as any)}
                        className={`px-3 py-1 rounded text-xs font-semibold border-0 ${getRoleBadgeColor(
                          collab.role
                        )}`}
                      >
                        <option value="viewer">Viewer</option>
                        <option value="editor">Editor</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(collab.status)}`}>
                        {collab.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {collab.status === 'active' && collab.joinedAt
                        ? new Date(collab.joinedAt).toLocaleDateString()
                        : collab.invitedAt
                        ? `Invited ${new Date(collab.invitedAt).toLocaleDateString()}`
                        : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={() => handleRemoveCollaborator(collab.id)}
                        className="text-red-600 hover:text-red-800 font-medium"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Permission Guide */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Shield size={16} />
          Permission Levels
        </h3>
        <div className="space-y-3 text-sm text-slate-700">
          <div>
            <p className="font-semibold text-slate-900">Viewer</p>
            <p>Can view project, activity, and versions. Cannot make changes.</p>
          </div>
          <div>
            <p className="font-semibold text-slate-900">Editor</p>
            <p>Can modify content, create versions, and manage shards. Cannot change sharing or delete.</p>
          </div>
          <div>
            <p className="font-semibold text-slate-900">Admin</p>
            <p>Full access including sharing, deletion, and all settings.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sharing;
