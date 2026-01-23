import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getAuthTokenForRequest } from '@/lib/auth-utils';
import { trackException, trackTrace } from '@/lib/monitoring/app-insights';
import {
  Settings as SettingsIcon,
  Save,
  Lock,
  Mail,
  Globe,
  Clock,
  Eye,
  EyeOff,
  Shield,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  phone?: string;
  timezone: string;
  language: string;
  theme: 'light' | 'dark';
}

interface PasswordChangeForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface TwoFactorSetup {
  enabled: boolean;
  method: 'authenticator' | 'sms';
  phoneNumber?: string;
  qrCode?: string;
}

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'notifications' | '2fa'>(
    'profile'
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [profile, setProfile] = useState<UserProfile>({
    id: '',
    name: '',
    email: '',
    bio: '',
    phone: '',
    timezone: 'UTC',
    language: 'en',
    theme: 'light',
  });

  const [passwordForm, setPasswordForm] = useState<PasswordChangeForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [emailPreferences, setEmailPreferences] = useState({
    projectUpdates: true,
    teamMessages: true,
    weeklyDigest: false,
    monthlyReport: false,
    promotions: false,
  });

  const [twoFactor, setTwoFactor] = useState<TwoFactorSetup>({
    enabled: false,
    method: 'authenticator',
  });

  const [showTwoFactorModal, setShowTwoFactorModal] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const { apiClient } = await import('@/lib/api/client' as any);
        const response = await apiClient.get('/api/v1/user/profile' as any);
        setProfile(response.data.data || profile);
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error(String(err))
        trackException(errorObj, 3)
        trackTrace('Failed to fetch profile', 3, {
          errorMessage: errorObj.message,
        })
        setMessage({ type: 'error', text: 'Failed to load profile' });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [profile]);

  // Save profile
  const saveProfile = async () => {
    try {
      setSaving(true);
      const { apiClient } = await import('@/lib/api/client' as any);
      await apiClient.put('/api/v1/user/profile', profile);
      setMessage({ type: 'success', text: 'Profile updated successfully' });
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      trackException(errorObj, 3)
      trackTrace('Failed to save profile', 3, {
        errorMessage: errorObj.message,
      })
      setMessage({ type: 'error', text: 'Failed to save profile' });
    } finally {
      setSaving(false);
    }
  };

  // Change password
  const changePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters' });
      return;
    }

    try {
      setSaving(true);
      const { apiClient } = await import('@/lib/api/client' as any);
      await apiClient.post('/api/v1/user/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setMessage({ type: 'success', text: 'Password changed successfully' });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      trackException(errorObj, 3)
      trackTrace('Failed to change password', 3, {
        errorMessage: errorObj.message,
      })
      setMessage({ type: 'error', text: 'Failed to change password' });
    } finally {
      setSaving(false);
    }
  };

  // Save email preferences
  const saveEmailPreferences = async () => {
    try {
      setSaving(true);
      const { apiClient } = await import('@/lib/api/client' as any);
      await apiClient.put('/api/v1/user/email-preferences', emailPreferences);
      setMessage({ type: 'success', text: 'Email preferences updated' });
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      trackException(errorObj, 3)
      trackTrace('Failed to save preferences', 3, {
        errorMessage: errorObj.message,
      })
      setMessage({ type: 'error', text: 'Failed to save preferences' });
    } finally {
      setSaving(false);
    }
  };

  // Enable 2FA
  const enableTwoFactor = async () => {
    try {
      setSaving(true);
      const { apiClient } = await import('@/lib/api/client' as any);
      const response = await apiClient.post('/api/v1/user/2fa/setup', {
        method: twoFactor.method,
        phoneNumber: twoFactor.phoneNumber,
      });
      setTwoFactor({
        ...twoFactor,
        qrCode: response.data.data?.qrCode,
      });
      setShowTwoFactorModal(true);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      trackException(errorObj, 3)
      trackTrace('Failed to setup 2FA', 3, {
        errorMessage: errorObj.message,
        method: twoFactor.method,
      })
      setMessage({ type: 'error', text: 'Failed to setup 2FA' });
    } finally {
      setSaving(false);
    }
  };

  // Verify 2FA
  const verifyTwoFactor = async () => {
    try {
      setSaving(true);
      const { apiClient } = await import('@/lib/api/client' as any);
      await apiClient.post('/api/v1/user/2fa/verify', { code: twoFactorCode });
      setTwoFactor({ ...twoFactor, enabled: true });
      setShowTwoFactorModal(false);
      setTwoFactorCode('');
      setMessage({ type: 'success', text: '2FA enabled successfully' });
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      trackException(errorObj, 3)
      trackTrace('Failed to verify 2FA', 3, {
        errorMessage: errorObj.message,
      })
      setMessage({ type: 'error', text: 'Invalid code or 2FA setup failed' });
    } finally {
      setSaving(false);
    }
  };

  // Disable 2FA
  const disableTwoFactor = async () => {
    if (!window.confirm('Are you sure you want to disable 2FA?')) return;

    try {
      setSaving(true);
      const { apiClient } = await import('@/lib/api/client' as any);
      await apiClient.post('/api/v1/user/2fa/disable', {});
      setTwoFactor({ ...twoFactor, enabled: false });
      setMessage({ type: 'success', text: '2FA disabled' });
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      trackException(errorObj, 3)
      trackTrace('Failed to disable 2FA', 3, {
        errorMessage: errorObj.message,
      })
      setMessage({ type: 'error', text: 'Failed to disable 2FA' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <SettingsIcon className="w-8 h-8 text-gray-700" />
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
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
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Sidebar Tabs */}
          <div className="md:col-span-1">
            <nav className="space-y-1">
              {(['profile', 'password', 'notifications', '2fa'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition ${
                    activeTab === tab
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tab === 'profile' && 'Profile'}
                  {tab === 'password' && 'Password'}
                  {tab === 'notifications' && 'Email'}
                  {tab === '2fa' && 'Security'}
                </button>
              ))}
            </nav>
          </div>

          {/* Content Area */}
          <div className="md:col-span-3">
            <div className="bg-white rounded-lg shadow-md p-6">
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-gray-900">User Profile</h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={profile.name}
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={profile.email}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={profile.phone || ''}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Timezone
                      </label>
                      <select
                        value={profile.timezone}
                        onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option>UTC</option>
                        <option>EST</option>
                        <option>CST</option>
                        <option>MST</option>
                        <option>PST</option>
                        <option>GMT</option>
                        <option>CET</option>
                        <option>IST</option>
                        <option>JST</option>
                        <option>AEST</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Language
                      </label>
                      <select
                        value={profile.language}
                        onChange={(e) => setProfile({ ...profile, language: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="en">English</option>
                        <option value="es">Español</option>
                        <option value="fr">Français</option>
                        <option value="de">Deutsch</option>
                        <option value="ja">日本語</option>
                        <option value="zh">中文</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Theme
                      </label>
                      <select
                        value={profile.theme}
                        onChange={(e) =>
                          setProfile({ ...profile, theme: e.target.value as 'light' | 'dark' })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                    <textarea
                      value={profile.bio || ''}
                      onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Tell us about yourself..."
                    />
                  </div>

                  <button
                    onClick={saveProfile}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50 transition"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              )}

              {/* Password Tab */}
              {activeTab === 'password' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-gray-900">Change Password</h2>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Current Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={passwordForm.currentPassword}
                          onChange={(e) =>
                            setPasswordForm({
                              ...passwordForm,
                              currentPassword: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        New Password
                      </label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={passwordForm.newPassword}
                        onChange={(e) =>
                          setPasswordForm({
                            ...passwordForm,
                            newPassword: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-sm text-gray-500 mt-1">Minimum 8 characters</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Confirm Password
                      </label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={passwordForm.confirmPassword}
                        onChange={(e) =>
                          setPasswordForm({
                            ...passwordForm,
                            confirmPassword: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <button
                    onClick={changePassword}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50 transition"
                  >
                    <Lock className="w-4 h-4" />
                    {saving ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              )}

              {/* Email Preferences Tab */}
              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-gray-900">Email Preferences</h2>

                  <div className="space-y-4">
                    {Object.entries(emailPreferences).map(([key, value]) => (
                      <label key={key} className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={(e) =>
                            setEmailPreferences({
                              ...emailPreferences,
                              [key]: e.target.checked,
                            })
                          }
                          className="w-4 h-4 rounded"
                        />
                        <span className="text-gray-700 capitalize">
                          {key.replace(/([A-Z])/g, ' $1')}
                        </span>
                      </label>
                    ))}
                  </div>

                  <button
                    onClick={saveEmailPreferences}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50 transition"
                  >
                    <Mail className="w-4 h-4" />
                    {saving ? 'Saving...' : 'Save Preferences'}
                  </button>
                </div>
              )}

              {/* 2FA Tab */}
              {activeTab === '2fa' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-gray-900">Two-Factor Authentication</h2>

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-blue-900">
                      Two-factor authentication adds an extra layer of security to your account.
                    </p>
                  </div>

                  {twoFactor.enabled ? (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-green-900 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5" />
                        Two-factor authentication is enabled
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-yellow-900">Two-factor authentication is disabled</p>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Authentication Method
                      </label>
                      <select
                        value={twoFactor.method}
                        onChange={(e) =>
                          setTwoFactor({
                            ...twoFactor,
                            method: e.target.value as 'authenticator' | 'sms',
                          })
                        }
                        disabled={twoFactor.enabled}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
                      >
                        <option value="authenticator">Authenticator App</option>
                        <option value="sms">SMS</option>
                      </select>
                    </div>

                    {twoFactor.method === 'sms' && !twoFactor.enabled && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={twoFactor.phoneNumber || ''}
                          onChange={(e) =>
                            setTwoFactor({
                              ...twoFactor,
                              phoneNumber: e.target.value,
                            })
                          }
                          placeholder="+1 (555) 123-4567"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    )}
                  </div>

                  {twoFactor.enabled ? (
                    <button
                      onClick={disableTwoFactor}
                      disabled={saving}
                      className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg disabled:opacity-50 transition"
                    >
                      <Shield className="w-4 h-4" />
                      {saving ? 'Disabling...' : 'Disable 2FA'}
                    </button>
                  ) : (
                    <button
                      onClick={enableTwoFactor}
                      disabled={saving}
                      className="flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50 transition"
                    >
                      <Shield className="w-4 h-4" />
                      {saving ? 'Setting up...' : 'Enable 2FA'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2FA Verification Modal */}
      {showTwoFactorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b">
              <h3 className="text-xl font-bold text-gray-900">Verify Two-Factor Authentication</h3>
            </div>

            <div className="p-6 space-y-4">
              {twoFactor.qrCode && (
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-4">
                    Scan this code with your authenticator app:
                  </p>
                  <div className="bg-gray-100 p-4 rounded-lg inline-block">
                    {/* QR Code would be rendered here */}
                    <div className="w-48 h-48 bg-gray-200 flex items-center justify-center">
                      [QR Code]
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter Code
                </label>
                <input
                  type="text"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.slice(0, 6))}
                  placeholder="000000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center text-lg tracking-widest"
                />
              </div>
            </div>

            <div className="flex gap-2 p-6 border-t">
              <button
                onClick={() => setShowTwoFactorModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={verifyTwoFactor}
                disabled={saving || twoFactorCode.length !== 6}
                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50"
              >
                Verify
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
