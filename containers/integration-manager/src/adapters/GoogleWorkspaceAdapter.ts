/**
 * Google Workspace adapter (domain-wide delegation, service account).
 * Fetches Calendar events, Drive files, and Gmail messages via impersonation.
 */

import { JWT } from 'google-auth-library';
import type {
  IntegrationAdapter,
  FetchOptions,
  FetchResult,
  ConnectionTestResult,
  SearchOptions,
  SearchResult,
} from '../types/adapter.types';

const GOOGLE_APIS_BASE = process.env.GOOGLE_APIS_BASE_URL || 'https://www.googleapis.com';

export class GoogleWorkspaceAdapter implements IntegrationAdapter {
  readonly providerId = 'google_workspace';
  readonly providerName = 'google_workspace';
  private credentials: Record<string, unknown> | null = null;
  private connected = false;

  constructor(
    private _monitoring: unknown,
    private connectionService: { getCredentialsForConnection: (connectionId: string, integrationId: string, tenantId: string) => Promise<Record<string, unknown> | null> },
    private tenantId: string,
    private connectionId: string
  ) {}

  async connect(credentials?: Record<string, unknown>): Promise<void> {
    if (credentials?.type === 'service_account' && credentials?.data) {
      this.credentials = credentials.data as Record<string, unknown>;
      this.connected = true;
      return;
    }
    const creds = await this.connectionService.getCredentialsForConnection(
      this.connectionId,
      this.connectionId,
      this.tenantId
    );
    if (creds?.type === 'service_account' && creds?.data) {
      this.credentials = creds.data as Record<string, unknown>;
      this.connected = true;
    }
  }

  async disconnect(): Promise<void> {
    this.credentials = null;
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected && this.credentials !== null;
  }

  async testConnection(): Promise<ConnectionTestResult> {
    try {
      await this.connect();
      if (!this.credentials) {
        return { success: false, error: 'No credentials' };
      }
      const creds = this.credentials as any;
      const jwt = new JWT({
        email: creds.client_email,
        key: creds.private_key,
        scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
      });
      const token = await jwt.getAccessToken();
      return { success: !!token.token };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Connection test failed' };
    }
  }

  async fetchRecords(entity: string, options: FetchOptions): Promise<FetchResult> {
    await this.connect();
    if (!this.credentials) {
      return { records: [], total: 0, hasMore: false };
    }
    const entityLower = entity?.toLowerCase() || '';
    const settings = (options.filters as Record<string, any>)?._integrationSettings || {};
    const userList: string[] = Array.isArray(settings.userList) ? settings.userList : [];
    const pullFilters = (options.filters as Record<string, any>)?._pullFilters as Array<{ field: string; operator: string; value: any }> | undefined;

    const usersToSync = userList.length > 0 ? userList : [];
    if (usersToSync.length === 0) {
      return { records: [], total: 0, hasMore: false };
    }

    const limit = options.limit ?? 100;
    const allRecords: Record<string, any>[] = [];

    for (const userEmail of usersToSync) {
      try {
        if (['event', 'calendar'].includes(entityLower)) {
          const events = await this.fetchCalendarEvents(userEmail, limit, pullFilters);
          events.forEach((e) => {
            allRecords.push({ ...e, ownerEmail: userEmail });
          });
        } else if (['document', 'file'].includes(entityLower)) {
          const files = await this.fetchDriveFiles(userEmail, limit, pullFilters);
          files.forEach((f) => {
            allRecords.push({ ...f, ownerEmail: userEmail });
          });
        } else if (['email', 'message'].includes(entityLower)) {
          const messages = await this.fetchGmailMessages(userEmail, limit, pullFilters);
          messages.forEach((m) => {
            allRecords.push({ ...m, ownerEmail: userEmail });
          });
        }
      } catch (err) {
        continue;
      }
      if (allRecords.length >= limit) break;
    }

    return {
      records: allRecords.slice(0, limit),
      total: allRecords.length,
      hasMore: allRecords.length >= limit,
    };
  }

  private getJwtClient(subject: string, scope: string): JWT {
    const creds = this.credentials as any;
    return new JWT({
      email: creds.client_email,
      key: creds.private_key,
      subject,
      scopes: [scope],
    });
  }

  private async fetchCalendarEvents(
    userEmail: string,
    limit: number,
    pullFilters?: Array<{ field: string; operator: string; value: any }>
  ): Promise<Record<string, any>[]> {
    const jwt = this.getJwtClient(userEmail, 'https://www.googleapis.com/auth/calendar.readonly');
    const tokenRes = await jwt.getAccessToken();
    const token = tokenRes?.token;
    if (!token) return [];

    const calendarId = pullFilters?.find((f) => f.field === 'calendarId')?.value ?? 'primary';
    const timeMin = pullFilters?.find((f) => f.field === 'timeMin')?.value;
    const timeMax = pullFilters?.find((f) => f.field === 'timeMax')?.value;
    const params = new URLSearchParams({
      maxResults: String(Math.min(limit, 250)),
      singleEvents: 'true',
    });
    if (timeMin) params.set('timeMin', timeMin);
    if (timeMax) params.set('timeMax', timeMax);

    const url = `${GOOGLE_APIS_BASE}/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { items?: any[] };
    const items = data.items || [];
    return items.map((e: any) => ({
      id: e.id,
      summary: e.summary,
      start: e.start?.dateTime || e.start?.date,
      end: e.end?.dateTime || e.end?.date,
      htmlLink: e.htmlLink,
      status: e.status,
    }));
  }

  private async fetchDriveFiles(
    userEmail: string,
    limit: number,
    pullFilters?: Array<{ field: string; operator: string; value: any }>
  ): Promise<Record<string, any>[]> {
    const jwt = this.getJwtClient(userEmail, 'https://www.googleapis.com/auth/drive.readonly');
    const tokenRes = await jwt.getAccessToken();
    const token = tokenRes?.token;
    if (!token) return [];

    const pageSize = Math.min(limit, 100);
    const q = pullFilters?.find((f) => f.field === 'q')?.value;
    const params = new URLSearchParams({
      pageSize: String(pageSize),
      fields: 'nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink)',
    });
    if (q) params.set('q', q);

    const url = `${GOOGLE_APIS_BASE}/drive/v3/files?${params}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { files?: any[] };
    const files = data.files || [];
    return files.map((f: any) => ({
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
      size: f.size ? parseInt(f.size, 10) : 0,
      createdTime: f.createdTime,
      modifiedTime: f.modifiedTime,
      webViewLink: f.webViewLink,
    }));
  }

  private async fetchGmailMessages(
    userEmail: string,
    limit: number,
    pullFilters?: Array<{ field: string; operator: string; value: any }>
  ): Promise<Record<string, any>[]> {
    const jwt = this.getJwtClient(userEmail, 'https://www.googleapis.com/auth/gmail.readonly');
    const tokenRes = await jwt.getAccessToken();
    const token = tokenRes?.token;
    if (!token) return [];

    const labelIds = pullFilters?.find((f) => f.field === 'labelIds')?.value;
    const params = new URLSearchParams({ maxResults: String(Math.min(limit, 100)) });
    if (labelIds && Array.isArray(labelIds)) {
      labelIds.forEach((id: string) => params.append('labelIds', id));
    }

    const url = `${GOOGLE_APIS_BASE}/gmail/v1/users/me/messages?${params}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { messages?: { id: string }[] };
    const messages = data.messages || [];
    const results: Record<string, any>[] = [];
    for (const m of messages.slice(0, limit)) {
      const getRes = await fetch(`${GOOGLE_APIS_BASE}/gmail/v1/users/me/messages/${m.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!getRes.ok) continue;
      const msg = (await getRes.json()) as { id?: string; threadId?: string; snippet?: string; payload?: { headers?: { name?: string; value?: string }[] } };
      const payload = msg.payload || {};
      const headers = (payload.headers || []).reduce((acc: Record<string, string>, h: any) => {
        acc[h.name?.toLowerCase()] = h.value;
        return acc;
      }, {});
      results.push({
        id: msg.id,
        threadId: msg.threadId,
        subject: headers.subject,
        from: headers.from,
        to: headers.to,
        date: headers.date,
        snippet: msg.snippet,
      });
    }
    return results;
  }

  async search(options: SearchOptions): Promise<SearchResult> {
    const entity = options.entity || 'Event';
    const result = await this.fetchRecords(entity, {
      tenantId: this.tenantId,
      limit: options.limit ?? 20,
      offset: options.offset ?? 0,
      filters: options.filters,
    });
    return {
      results: result.records,
      total: result.total,
      hasMore: result.hasMore,
    };
  }
}

export function createGoogleWorkspaceAdapter(
  _monitoring: unknown,
  connectionService: any,
  tenantId: string,
  connectionId: string
): IntegrationAdapter {
  return new GoogleWorkspaceAdapter(_monitoring, connectionService, tenantId, connectionId);
}
