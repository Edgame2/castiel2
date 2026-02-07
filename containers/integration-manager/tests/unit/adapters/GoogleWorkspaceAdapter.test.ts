/**
 * Google Workspace adapter unit tests.
 * Mocks google-auth-library JWT and global fetch for Calendar/Drive/Gmail APIs.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('google-auth-library', () => ({
  JWT: class MockJWT {
    getAccessToken = () => Promise.resolve({ token: 'mock-token' });
  },
}));

import { GoogleWorkspaceAdapter, createGoogleWorkspaceAdapter } from '../../../src/adapters/GoogleWorkspaceAdapter';

describe('GoogleWorkspaceAdapter', () => {
  const mockConnectionService = {
    getCredentialsForConnection: vi.fn(),
  };
  const tenantId = 'tenant-1';
  const connectionId = 'conn-1';
  const saCredentials = {
    type: 'service_account',
    data: {
      client_email: 'sa@project.iam.gserviceaccount.com',
      private_key: '-----BEGIN PRIVATE KEY-----\nMOCK\n-----END PRIVATE KEY-----\n',
    },
  };

  let adapter: GoogleWorkspaceAdapter;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    adapter = new GoogleWorkspaceAdapter(
      null,
      mockConnectionService as any,
      tenantId,
      connectionId
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('connect', () => {
    it('should set credentials when given service_account with data', async () => {
      await adapter.connect(saCredentials as any);
      expect(adapter.isConnected()).toBe(true);
    });

    it('should load credentials from connectionService when no credentials passed', async () => {
      mockConnectionService.getCredentialsForConnection.mockResolvedValue(saCredentials);
      await adapter.connect();
      expect(adapter.isConnected()).toBe(true);
      expect(mockConnectionService.getCredentialsForConnection).toHaveBeenCalledWith(connectionId, connectionId, tenantId);
    });

    it('should stay disconnected when connectionService returns no SA data', async () => {
      mockConnectionService.getCredentialsForConnection.mockResolvedValue({ type: 'oauth', data: {} });
      await adapter.connect();
      expect(adapter.isConnected()).toBe(false);
    });
  });

  describe('disconnect', () => {
    it('should clear credentials', async () => {
      await adapter.connect(saCredentials as any);
      adapter.disconnect();
      expect(adapter.isConnected()).toBe(false);
    });
  });

  describe('testConnection', () => {
    it('should return success when JWT token is obtained', async () => {
      await adapter.connect(saCredentials as any);
      const result = await adapter.testConnection();
      expect(result.success).toBe(true);
    });

    it('should return failure when no credentials', async () => {
      mockConnectionService.getCredentialsForConnection.mockResolvedValue(null);
      await adapter.connect();
      const result = await adapter.testConnection();
      expect(result.success).toBe(false);
      expect(result.error).toBe('No credentials');
    });
  });

  describe('fetchRecords', () => {
    it('should return empty when no credentials', async () => {
      mockConnectionService.getCredentialsForConnection.mockResolvedValue(null);
      const result = await adapter.fetchRecords('Event', {
        tenantId,
        limit: 10,
        offset: 0,
        filters: { _integrationSettings: { userList: ['u@example.com'] } },
      });
      expect(result.records).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should return empty when userList is empty', async () => {
      await adapter.connect(saCredentials as any);
      const result = await adapter.fetchRecords('Event', {
        tenantId,
        limit: 10,
        offset: 0,
        filters: {},
      });
      expect(result.records).toEqual([]);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('should fetch Calendar events and tag ownerEmail', async () => {
      await adapter.connect(saCredentials as any);
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            { id: 'e1', summary: 'Meet', start: { dateTime: '2025-02-01T10:00:00Z' }, end: { dateTime: '2025-02-01T11:00:00Z' }, htmlLink: 'https://calendar.google.com/event?eid=e1', status: 'confirmed' },
          ],
        }),
      });
      const result = await adapter.fetchRecords('Event', {
        tenantId,
        limit: 10,
        offset: 0,
        filters: { _integrationSettings: { userList: ['user@example.com'] } },
      });
      expect(result.records).toHaveLength(1);
      expect(result.records[0]).toMatchObject({ id: 'e1', summary: 'Meet', ownerEmail: 'user@example.com' });
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/calendar/v3/calendars/primary/events'),
        expect.any(Object)
      );
    });

    it('should apply calendarId and timeMin from pullFilters', async () => {
      await adapter.connect(saCredentials as any);
      fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ items: [] }) });
      await adapter.fetchRecords('Calendar', {
        tenantId,
        limit: 5,
        offset: 0,
        filters: {
          _integrationSettings: { userList: ['u@x.com'] },
          _pullFilters: [
            { field: 'calendarId', operator: 'equals', value: 'custom@group.calendar.google.com' },
            { field: 'timeMin', operator: 'equals', value: '2025-02-01T00:00:00Z' },
          ],
        },
      });
      const callUrl = fetchMock.mock.calls[0][0];
      expect(callUrl).toContain('calendars/custom%40group.calendar.google.com');
      expect(callUrl).toContain('timeMin=2025-02-01T00%3A00%3A00Z');
    });

    it('should fetch Drive files when entity is Document', async () => {
      await adapter.connect(saCredentials as any);
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          files: [
            { id: 'f1', name: 'Doc.pdf', mimeType: 'application/pdf', size: '1024', createdTime: '2025-01-01T00:00:00Z', modifiedTime: '2025-01-02T00:00:00Z', webViewLink: 'https://drive.google.com/file/d/f1' },
          ],
        }),
      });
      const result = await adapter.fetchRecords('Document', {
        tenantId,
        limit: 10,
        offset: 0,
        filters: { _integrationSettings: { userList: ['user@example.com'] } },
      });
      expect(result.records).toHaveLength(1);
      expect(result.records[0]).toMatchObject({ id: 'f1', name: 'Doc.pdf', ownerEmail: 'user@example.com' });
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/drive/v3/files'), expect.any(Object));
    });

    it('should apply Drive q from pullFilters', async () => {
      await adapter.connect(saCredentials as any);
      fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ files: [] }) });
      await adapter.fetchRecords('File', {
        tenantId,
        limit: 5,
        offset: 0,
        filters: {
          _integrationSettings: { userList: ['u@x.com'] },
          _pullFilters: [{ field: 'q', operator: 'equals', value: "'folderId' in parents" }],
        },
      });
      const callUrl = fetchMock.mock.calls[0][0];
      expect(callUrl).toContain("q=%27folderId%27+in+parents");
    });

    it('should fetch Gmail messages when entity is Email', async () => {
      await adapter.connect(saCredentials as any);
      fetchMock
        .mockResolvedValueOnce({ ok: true, json: async () => ({ messages: [{ id: 'm1' }] }) })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'm1',
            threadId: 't1',
            snippet: 'Hello',
            payload: {
              headers: [
                { name: 'Subject', value: 'Test' },
                { name: 'From', value: 'a@b.com' },
                { name: 'To', value: 'c@d.com' },
                { name: 'Date', value: 'Mon, 1 Jan 2025 00:00:00 +0000' },
              ],
            },
          }),
        });
      const result = await adapter.fetchRecords('Email', {
        tenantId,
        limit: 10,
        offset: 0,
        filters: { _integrationSettings: { userList: ['user@example.com'] } },
      });
      expect(result.records).toHaveLength(1);
      expect(result.records[0]).toMatchObject({ id: 'm1', subject: 'Test', ownerEmail: 'user@example.com' });
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/gmail/v1/users/me/messages'), expect.any(Object));
    });

    it('should apply labelIds for Gmail', async () => {
      await adapter.connect(saCredentials as any);
      fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ messages: [] }) });
      await adapter.fetchRecords('Message', {
        tenantId,
        limit: 5,
        offset: 0,
        filters: {
          _integrationSettings: { userList: ['u@x.com'] },
          _pullFilters: [{ field: 'labelIds', operator: 'equals', value: ['INBOX', 'IMPORTANT'] }],
        },
      });
      const callUrl = fetchMock.mock.calls[0][0];
      expect(callUrl).toContain('labelIds=INBOX');
      expect(callUrl).toContain('labelIds=IMPORTANT');
    });
  });

  describe('createGoogleWorkspaceAdapter', () => {
    it('should return an instance of GoogleWorkspaceAdapter', () => {
      const instance = createGoogleWorkspaceAdapter(null, mockConnectionService as any, tenantId, connectionId);
      expect(instance).toBeInstanceOf(GoogleWorkspaceAdapter);
      expect(instance.providerName).toBe('google_workspace');
    });
  });
});
