/**
 * Google Workspace Integration Adapter
 * Connects to Google Workspace APIs (Gmail, Calendar, Drive, Contacts, Tasks)
 */

import { IMonitoringProvider } from '@castiel/monitoring';
import {
  BaseIntegrationAdapter,
  FetchOptions,
  FetchResult,
  PushOptions,
  PushResult,
  WebhookEvent,
  IntegrationAdapterFactory,
  adapterRegistry,
} from '../base-adapter.js';
import { IntegrationConnectionService } from '../../services/integration-connection.service.js';
import {
  IntegrationDefinition,
  IntegrationCategory,
  IntegrationEntity,
  IntegrationEntityField,
  SearchOptions,
  SearchResult,
  SearchResultItem,
} from '../../types/integration.types.js';
import type { SSOTeam, TeamSyncConfig } from '../../types/team.types.js';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { gmail_v1 } from '@googleapis/gmail';
import { calendar_v3 } from '@googleapis/calendar';
import { drive_v3 } from '@googleapis/drive';
import { people_v1 } from '@googleapis/people';
import { tasks_v1 } from '@googleapis/tasks';
// Note: @googleapis/admin is optional - using googleapis directly for admin SDK
// import { admin_directory_v1 } from '@googleapis/admin';
// Config is optional - for api-core, we use environment variables directly
// If config is needed from apps/api, it should be injected via constructor or method parameters

// ============================================
// Google Workspace API Types
// ============================================

interface GmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  payload: {
    headers: Array<{ name: string; value: string }>;
    body?: {
      data?: string;
      size?: number;
    };
    parts?: Array<{
      mimeType: string;
      body?: { data?: string; size?: number };
      parts?: Array<any>;
    }>;
  };
  labelIds: string[];
  internalDate: string;
  sizeEstimate: number;
}

interface GmailThread {
  id: string;
  snippet: string;
  historyId: string;
  messages: GmailMessage[];
}

interface CalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  start?: { dateTime?: string; date?: string; timeZone?: string };
  end?: { dateTime?: string; date?: string; timeZone?: string };
  location?: string;
  attendees?: Array<{ email: string; responseStatus?: string }>;
  organizer?: { email: string; displayName?: string };
  hangoutLink?: string;
  recurrence?: string[];
  status?: string;
  created?: string;
  updated?: string;
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  webViewLink?: string;
  webContentLink?: string;
  createdTime?: string;
  modifiedTime?: string;
  owners?: Array<{ emailAddress: string }>;
  shared?: boolean;
  parents?: string[];
  capabilities?: {
    canDownload?: boolean;
  };
}

interface Contact {
  resourceName: string;
  names?: Array<{
    givenName?: string;
    familyName?: string;
    displayName?: string;
  }>;
  emailAddresses?: Array<{ value: string; type?: string }>;
  phoneNumbers?: Array<{ value: string; type?: string }>;
  organizations?: Array<{ name?: string; title?: string }>;
  addresses?: Array<any>;
}

interface Task {
  id: string;
  title: string;
  notes?: string;
  status?: string;
  due?: string;
  completed?: string;
  parent?: string;
  position?: string;
}

// ============================================
// Google Workspace Adapter Implementation
// ============================================

/**
 * Google Workspace Integration Adapter
 */
export class GoogleWorkspaceAdapter extends BaseIntegrationAdapter {
  private gmailClient: gmail_v1.Gmail | null = null;
  private calendarClient: calendar_v3.Calendar | null = null;
  private driveClient: drive_v3.Drive | null = null;
  private peopleClient: people_v1.People | null = null;
  private tasksClient: tasks_v1.Tasks | null = null;
  private adminClient: any | null = null; // Admin SDK client (requires @googleapis/admin or use googleapis)
  private oauth2Client: OAuth2Client | null = null;
  private userEmail: string | null = null;

  constructor(
    monitoring: IMonitoringProvider,
    connectionService: IntegrationConnectionService,
    tenantId: string,
    connectionId: string
  ) {
    super(monitoring, connectionService, 'google-workspace', tenantId, connectionId);
  }

  /**
   * Initialize Google API clients
   */
  private async initializeClients(): Promise<void> {
    if (this.oauth2Client) {
      return; // Already initialized
    }

    const accessToken = await this.getAccessToken();
    if (!accessToken) {
      throw new Error('No access token available');
    }

    // Get OAuth config from environment variables
    const clientId = process.env.GOOGLE_WORKSPACE_CLIENT_ID || '';
    const clientSecret = process.env.GOOGLE_WORKSPACE_CLIENT_SECRET || '';

    if (!clientId || !clientSecret) {
      throw new Error('Google Workspace OAuth credentials not configured');
    }

    // Create OAuth2 client
    this.oauth2Client = new OAuth2Client(clientId, clientSecret);

    // Set credentials
    this.oauth2Client.setCredentials({
      access_token: accessToken,
    });

    // Initialize API clients
    // Note: Using type assertions because googleapis and @googleapis/* have slightly different types but are compatible at runtime
    this.gmailClient = google.gmail({ version: 'v1', auth: this.oauth2Client }) as gmail_v1.Gmail;
    this.calendarClient = google.calendar({ version: 'v3', auth: this.oauth2Client }) as calendar_v3.Calendar;
    this.driveClient = google.drive({ version: 'v3', auth: this.oauth2Client }) as drive_v3.Drive;
    this.peopleClient = google.people({ version: 'v1', auth: this.oauth2Client }) as people_v1.People;
    this.tasksClient = google.tasks({ version: 'v1', auth: this.oauth2Client }) as tasks_v1.Tasks;

    // Initialize Admin SDK client (requires domain-wide delegation)
    // Note: This requires special permissions and service account setup
    this.adminClient = google.admin({
      version: 'directory_v1',
      auth: this.oauth2Client,
    });

    // Get user email if not cached
    if (!this.userEmail) {
      try {
        const profile = await this.peopleClient!.people.get({
          resourceName: 'people/me',
          personFields: 'emailAddresses',
        });
        this.userEmail = profile.data.emailAddresses?.[0]?.value || null;
      } catch (error) {
        this.monitoring.trackException(error as Error, {
          operation: 'google-workspace.initialize',
        });
      }
    }
  }

  /**
   * Get Google Workspace integration definition
   */
  getDefinition(): IntegrationDefinition {
    return GOOGLE_WORKSPACE_DEFINITION;
  }

  /**
   * Get current authenticated user's profile
   */
  async getUserProfile(): Promise<{
    id: string;
    email?: string;
    name?: string;
    [key: string]: any;
  }> {
    try {
      await this.initializeClients();

      if (!this.peopleClient) {
        throw new Error('People API client not initialized');
      }

      const profile = await this.peopleClient.people.get({
        resourceName: 'people/me',
        personFields: 'names,emailAddresses,photos',
      });

      const email = profile.data.emailAddresses?.[0]?.value;
      const name = profile.data.names?.[0]?.displayName;
      const resourceName = profile.data.resourceName;

      if (!resourceName) {
        throw new Error('Failed to get user resource name');
      }

      // Extract user ID from resource name (format: "people/1234567890")
      const userId = resourceName.replace('people/', '');

      return {
        id: userId,
        email: email || undefined,
        name: name || undefined,
        resourceName,
        givenName: profile.data.names?.[0]?.givenName || undefined,
        familyName: profile.data.names?.[0]?.familyName || undefined,
        photoUrl: profile.data.photos?.[0]?.url || undefined,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.monitoring.trackException(
        error instanceof Error ? error : new Error(errorMessage),
        {
          operation: 'google-workspace.getUserProfile',
          tenantId: this.tenantId,
        }
      );
      throw new Error(`Failed to get user profile: ${errorMessage}`);
    }
  }

  /**
   * Fetch teams/groups from Google Workspace
   */
  async fetchTeams(config: TeamSyncConfig): Promise<SSOTeam[]> {
    try {
      await this.initializeClients();

      if (!this.adminClient) {
        throw new Error('Admin SDK client not initialized. Requires domain-wide delegation.');
      }

      const teams: SSOTeam[] = [];
      
      // Extract domain from user email
      const domain = this.userEmail?.split('@')[1];
      if (!domain) {
        throw new Error('Unable to determine domain from user email');
      }

      // Fetch all groups from Google Workspace Admin SDK
      let pageToken: string | undefined;
      
      do {
        const groupsResponse = await this.adminClient.groups.list({
          domain,
          pageToken,
          maxResults: 200,
        });

        const groups = groupsResponse.data.groups || [];

        // Process each group
        for (const group of groups) {
          if (!group.id || !group.email) {
            continue;
          }

          // Fetch members for this group
          const membersResponse = await this.adminClient.members.list({
            groupKey: group.id,
          });

          const memberExternalIds: string[] = [];
          if (membersResponse.data.members) {
            memberExternalIds.push(...membersResponse.data.members.map((m: any) => m.id || '').filter(Boolean));
          }

          // Get manager (group admin or first owner)
          // Note: Google Workspace groups don't have a direct "manager" concept
          // We'll use the group admin or first owner if available
          let managerExternalId: string | undefined;
          if (group.adminCreated) {
            // Try to get the admin who created the group
            // This would require additional API call to get group settings
          }

          // Map group name using config if provided
          // Team name mapping - can be configured via environment or passed as parameter
          const nameMapping = process.env.TEAM_NAME_MAPPING || 'name';
          const teamName = group[nameMapping as keyof typeof group] as string || group.name || group.email;

          teams.push({
            externalId: group.id,
            name: teamName,
            managerExternalId,
            memberExternalIds,
            metadata: {
              email: group.email,
              description: group.description,
              adminCreated: group.adminCreated,
            },
          });
        }

        pageToken = groupsResponse.data.nextPageToken || undefined;
      } while (pageToken);

      return teams;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.monitoring.trackException(
        error instanceof Error ? error : new Error(errorMessage),
        {
          operation: 'google-workspace.fetchTeams',
          tenantId: this.tenantId,
        }
      );
      throw new Error(`Failed to fetch teams from Google Workspace: ${errorMessage}`);
    }
  }

  /**
   * Test Google Workspace connection
   */
  async testConnection(): Promise<{ success: boolean; error?: string; details?: any }> {
    try {
      await this.initializeClients();

      if (!this.peopleClient) {
        return { success: false, error: 'Failed to initialize People API client' };
      }

      // Get user profile
      const profile = await this.peopleClient.people.get({
        resourceName: 'people/me',
        personFields: 'names,emailAddresses',
      });

      const email = profile.data.emailAddresses?.[0]?.value;
      const name = profile.data.names?.[0]?.displayName;

      // Test access to each service
      const serviceAccess: Record<string, boolean> = {};

      try {
        await this.gmailClient?.users.getProfile({ userId: 'me' });
        serviceAccess.gmail = true;
      } catch {
        serviceAccess.gmail = false;
      }

      try {
        await this.calendarClient?.calendarList.list({ maxResults: 1 });
        serviceAccess.calendar = true;
      } catch {
        serviceAccess.calendar = false;
      }

      try {
        await this.driveClient?.files.list({ pageSize: 1 });
        serviceAccess.drive = true;
      } catch {
        serviceAccess.drive = false;
      }

      try {
        await this.peopleClient.people.connections.list({
          resourceName: 'people/me',
          pageSize: 1,
        });
        serviceAccess.contacts = true;
      } catch {
        serviceAccess.contacts = false;
      }

      try {
        await this.tasksClient?.tasklists.list({ maxResults: 1 });
        serviceAccess.tasks = true;
      } catch {
        serviceAccess.tasks = false;
      }

      return {
        success: true,
        details: {
          email,
          name,
          serviceAccess,
        },
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.monitoring.trackException(
        error instanceof Error ? error : new Error(errorMessage),
        {
          operation: 'google-workspace.testConnection',
        }
      );
      return {
        success: false,
        error: errorMessage || 'Connection test failed',
      };
    }
  }

  /**
   * Fetch records from Google Workspace
   */
  async fetch(options: FetchOptions): Promise<FetchResult> {
    await this.initializeClients();

    const { entity } = options;

    switch (entity) {
      case 'gmail_message':
        return this.fetchGmailMessages(options);
      case 'gmail_thread':
        return this.fetchGmailThreads(options);
      case 'calendar_event':
        return this.fetchCalendarEvents(options);
      case 'drive_file':
        return this.fetchDriveFiles(options);
      case 'contact':
        return this.fetchContacts(options);
      case 'task':
        return this.fetchTasks(options);
      default:
        return { records: [], hasMore: false };
    }
  }

  /**
   * Fetch Gmail messages
   */
  private async fetchGmailMessages(options: FetchOptions): Promise<FetchResult> {
    if (!this.gmailClient) {
      throw new Error('Gmail client not initialized');
    }

    const { limit = 100, filters, modifiedSince, externalUserId } = options;
    const query = filters?.query as string | undefined;
    const pageToken = filters?.pageToken as string | undefined;

    // Use externalUserId if provided, otherwise use 'me'
    const userId = externalUserId || 'me';

    try {
      const params: gmail_v1.Params$Resource$Users$Messages$List = {
        userId,
        maxResults: Math.min(limit, 500),
        q: query,
        pageToken,
      };

      if (modifiedSince) {
        const sinceTimestamp = Math.floor(modifiedSince.getTime() / 1000);
        params.q = params.q
          ? `${params.q} after:${sinceTimestamp}`
          : `after:${sinceTimestamp}`;
      }

      const response = await this.gmailClient.users.messages.list(params);

      if (!response.data.messages) {
        return { records: [], hasMore: false };
      }

      // Fetch full message details
      // Use Promise.allSettled to handle individual message fetch failures gracefully
      const messagePromises = response.data.messages.slice(0, limit).map((msg) =>
        this.gmailClient!.users.messages.get({
          userId,
          id: msg.id!,
          format: 'full',
        })
      );

      const messageResults = await Promise.allSettled(messagePromises);

      // Extract successfully fetched messages, filtering out failures
      const messages = response.data.messages || [];
      const records = messageResults
        .map((result, index) => {
          if (result.status === 'fulfilled' && result.value.data) {
            try {
              return this.normalizeGmailMessage(result.value.data);
            } catch (error) {
              this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
                operation: 'google-workspace.normalizeGmailMessage',
                messageId: messages[index]?.id || undefined,
              });
              return null;
            }
          } else {
            // Log failed message fetches but continue processing others
            this.monitoring.trackException(
              result.status === 'rejected' ? (result.reason instanceof Error ? result.reason : new Error(String(result.reason))) : new Error('Unknown error'),
              {
                operation: 'google-workspace.fetchGmailMessage',
                messageId: messages[index]?.id || undefined,
              }
            );
            return null;
          }
        })
        .filter((record): record is ReturnType<typeof this.normalizeGmailMessage> => record !== null);

      return {
        records,
        hasMore: !!response.data.nextPageToken,
        cursor: response.data.nextPageToken || undefined,
        total: response.data.resultSizeEstimate ?? undefined,
      };
    } catch (error: unknown) {
      this.monitoring.trackException(
        error instanceof Error ? error : new Error(String(error)),
        {
          operation: 'google-workspace.fetchGmailMessages',
        }
      );
      throw this.handleGoogleError(error);
    }
  }

  /**
   * Fetch Gmail threads
   */
  private async fetchGmailThreads(options: FetchOptions): Promise<FetchResult> {
    if (!this.gmailClient) {
      throw new Error('Gmail client not initialized');
    }

    const { limit = 100, filters, modifiedSince, externalUserId } = options;
    const query = filters?.query as string | undefined;
    const pageToken = filters?.pageToken as string | undefined;

    // Use externalUserId if provided, otherwise use 'me'
    // For Google Workspace, externalUserId might be in format "people/{id}" - extract just the ID
    const userId = externalUserId ? (externalUserId.includes('/') ? externalUserId.split('/').pop()! : externalUserId) : 'me';

    try {
      const params: gmail_v1.Params$Resource$Users$Threads$List = {
        userId,
        maxResults: Math.min(limit, 500),
        q: query,
        pageToken,
      };

      if (modifiedSince) {
        const sinceTimestamp = Math.floor(modifiedSince.getTime() / 1000);
        params.q = params.q
          ? `${params.q} after:${sinceTimestamp}`
          : `after:${sinceTimestamp}`;
      }

      const response = await this.gmailClient.users.threads.list(params);

      if (!response.data.threads) {
        return { records: [], hasMore: false };
      }

      // Fetch full thread details
      const threadPromises = response.data.threads.slice(0, limit).map((thread) =>
        this.gmailClient!.users.threads.get({
          userId,
          id: thread.id!,
        })
      );

      // Use Promise.allSettled to handle individual thread fetch failures gracefully
      const threadResults = await Promise.allSettled(threadPromises);

      // Extract successfully fetched threads, filtering out failures
      const threads = response.data.threads || [];
      const records = threadResults
        .map((result, index) => {
          if (result.status === 'fulfilled' && result.value.data) {
            try {
              return this.normalizeGmailThread(result.value.data);
            } catch (error) {
              this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
                operation: 'google-workspace.normalizeGmailThread',
                threadId: threads[index]?.id || undefined,
              });
              return null;
            }
          } else {
            // Log failed thread fetches but continue processing others
            this.monitoring.trackException(
              result.status === 'rejected' ? (result.reason instanceof Error ? result.reason : new Error(String(result.reason))) : new Error('Unknown error'),
              {
                operation: 'google-workspace.fetchGmailThread',
                threadId: threads[index]?.id || undefined,
              }
            );
            return null;
          }
        })
        .filter((record): record is ReturnType<typeof this.normalizeGmailThread> => record !== null);

      return {
        records,
        hasMore: !!response.data.nextPageToken,
        cursor: response.data.nextPageToken || undefined,
        total: response.data.resultSizeEstimate ?? undefined,
      };
    } catch (error: unknown) {
      this.monitoring.trackException(
        error instanceof Error ? error : new Error(String(error)),
        {
          operation: 'google-workspace.fetchGmailThreads',
        }
      );
      throw this.handleGoogleError(error);
    }
  }

  /**
   * Fetch Calendar events
   */
  private async fetchCalendarEvents(options: FetchOptions): Promise<FetchResult> {
    if (!this.calendarClient) {
      throw new Error('Calendar client not initialized');
    }

    const { limit = 100, filters, modifiedSince } = options;
    const calendarId = (filters?.calendarId as string) || 'primary';
    const timeMin = filters?.timeMin
      ? new Date(filters.timeMin as string)
      : modifiedSince || new Date();
    const timeMax = filters?.timeMax
      ? new Date(filters.timeMax as string)
      : undefined;
    const pageToken = filters?.pageToken as string | undefined;
    const singleEvents = filters?.singleEvents !== false;

    try {
      const params: calendar_v3.Params$Resource$Events$List = {
        calendarId,
        maxResults: Math.min(limit, 2500),
        timeMin: timeMin.toISOString(),
        timeMax: timeMax?.toISOString(),
        pageToken,
        singleEvents,
        orderBy: 'startTime',
      };

      if (modifiedSince) {
        params.updatedMin = modifiedSince.toISOString();
      }

      const response = await this.calendarClient.events.list(params);

      if (!response.data.items) {
        return { records: [], hasMore: false };
      }

      const records = response.data.items.map((event) =>
        this.normalizeCalendarEvent(event)
      );

      return {
        records,
        hasMore: !!response.data.nextPageToken,
        cursor: response.data.nextPageToken || undefined,
      };
    } catch (error: unknown) {
      this.monitoring.trackException(
        error instanceof Error ? error : new Error(String(error)),
        {
          operation: 'google-workspace.fetchCalendarEvents',
        }
      );
      throw this.handleGoogleError(error);
    }
  }

  /**
   * Fetch Drive files
   */
  private async fetchDriveFiles(options: FetchOptions): Promise<FetchResult> {
    if (!this.driveClient) {
      throw new Error('Drive client not initialized');
    }

    const { limit = 100, filters, modifiedSince } = options;
    const query = filters?.q as string | undefined;
    const pageToken = filters?.pageToken as string | undefined;
    const folderId = filters?.folderId as string | undefined;

    try {
      const params: drive_v3.Params$Resource$Files$List = {
        pageSize: Math.min(limit, 1000),
        q: query,
        pageToken,
        fields: 'nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink, owners, shared, parents, capabilities)',
        orderBy: 'modifiedTime desc',
      };

      // Build query
      const queryParts: string[] = [];
      if (folderId) {
        queryParts.push(`'${folderId}' in parents`);
      }
      if (modifiedSince) {
        queryParts.push(
          `modifiedTime > '${modifiedSince.toISOString()}'`
        );
      }
      if (query) {
        queryParts.push(query);
      }
      if (queryParts.length > 0) {
        params.q = queryParts.join(' and ');
      }

      const response = await this.driveClient.files.list(params);

      if (!response.data.files) {
        return { records: [], hasMore: false };
      }

      const records = response.data.files.map((file) => this.normalizeDriveFile(file));

      return {
        records,
        hasMore: !!response.data.nextPageToken,
        cursor: response.data.nextPageToken || undefined,
      };
    } catch (error: unknown) {
      this.monitoring.trackException(
        error instanceof Error ? error : new Error(String(error)),
        {
          operation: 'google-workspace.fetchDriveFiles',
        }
      );
      throw this.handleGoogleError(error);
    }
  }

  /**
   * Fetch Contacts
   */
  private async fetchContacts(options: FetchOptions): Promise<FetchResult> {
    if (!this.peopleClient) {
      throw new Error('People client not initialized');
    }

    const { limit = 100, filters } = options;
    const pageToken = filters?.pageToken as string | undefined;

    try {
      const response = await this.peopleClient.people.connections.list({
        resourceName: 'people/me',
        pageSize: Math.min(limit, 1000),
        pageToken,
        personFields: 'names,emailAddresses,phoneNumbers,organizations,addresses',
        sortOrder: 'LAST_NAME_ASCENDING',
      });

      if (!response.data.connections) {
        return { records: [], hasMore: false };
      }

      const records = response.data.connections.map((contact) =>
        this.normalizeContact(contact)
      );

      return {
        records,
        hasMore: !!response.data.nextPageToken,
        cursor: response.data.nextPageToken || undefined,
      };
    } catch (error: unknown) {
      this.monitoring.trackException(
        error instanceof Error ? error : new Error(String(error)),
        {
          operation: 'google-workspace.fetchContacts',
        }
      );
      throw this.handleGoogleError(error);
    }
  }

  /**
   * Fetch Tasks
   */
  private async fetchTasks(options: FetchOptions): Promise<FetchResult> {
    if (!this.tasksClient) {
      throw new Error('Tasks client not initialized');
    }

    const { limit = 100, filters } = options;
    const tasklistId = (filters?.tasklist as string) || '@default';
    const showCompleted = filters?.showCompleted !== false;
    const showHidden = filters?.showHidden !== false;
    const pageToken = filters?.pageToken as string | undefined;

    try {
      const params: tasks_v1.Params$Resource$Tasks$List = {
        tasklist: tasklistId,
        maxResults: Math.min(limit, 100),
        showCompleted,
        showHidden,
        pageToken,
      };

      const response = await this.tasksClient.tasks.list(params);

      if (!response.data.items) {
        return { records: [], hasMore: false };
      }

      const records = response.data.items.map((task) => this.normalizeTask(task));

      return {
        records,
        hasMore: !!response.data.nextPageToken,
        cursor: response.data.nextPageToken || undefined,
      };
    } catch (error: unknown) {
      this.monitoring.trackException(
        error instanceof Error ? error : new Error(String(error)),
        {
          operation: 'google-workspace.fetchTasks',
        }
      );
      throw this.handleGoogleError(error);
    }
  }

  /**
   * Search across Google Workspace services
   */
  async search(options: SearchOptions): Promise<SearchResult> {
    await this.initializeClients();
    
    const { query, entities = [], limit = 20, offset = 0, externalUserId } = options;
    const queryLower = query.toLowerCase();
    const results: SearchResultItem[] = [];

    // Use externalUserId if provided, otherwise use 'me'
    // For Google Workspace, externalUserId might be in format "people/{id}" - extract just the ID
    const userId = externalUserId ? (externalUserId.includes('/') ? externalUserId.split('/').pop()! : externalUserId) : 'me';

    // Determine which entities to search
    const entitiesToSearch = entities.length > 0 
      ? entities 
      : ['gmail_message', 'calendar_event', 'drive_file', 'contact', 'task'];

    // Search Gmail messages
    if (entitiesToSearch.includes('gmail_message') && this.gmailClient) {
      try {
        const messages = await this.gmailClient.users.messages.list({
          userId,
          q: query,
          maxResults: Math.min(limit, 50),
        });

        if (messages.data.messages) {
          // Use Promise.allSettled to handle individual message fetch failures gracefully
          const messageDetailResults = await Promise.allSettled(
            messages.data.messages.slice(0, limit).map(msg =>
              this.gmailClient!.users.messages.get({
                userId,
                id: msg.id!,
                format: 'metadata',
                metadataHeaders: ['Subject', 'From', 'To', 'Date'],
              })
            )
          );
          
          // Extract successfully fetched messages, filtering out failures
          const messageList = messages.data.messages || [];
          const messageDetails = messageDetailResults
            .map((result, index) => {
              if (result.status === 'fulfilled' && result.value.data) {
                return result.value;
              } else {
                // Log failed message fetches but continue processing others
                this.monitoring.trackException(
                  result.status === 'rejected' ? (result.reason instanceof Error ? result.reason : new Error(String(result.reason))) : new Error('Unknown error'),
                  {
                    operation: 'google-workspace.fetchGmailMessageMetadata',
                    messageId: messageList[index]?.id || undefined,
                  }
                );
                return null;
              }
            })
            .filter((msg): msg is NonNullable<typeof msg> => msg !== null);

          messageDetails.forEach((msg) => {
            const subject = msg.data.payload?.headers?.find(h => h.name === 'Subject')?.value || '';
            const from = msg.data.payload?.headers?.find(h => h.name === 'From')?.value || '';
            const snippet = msg.data.snippet || '';
            
            results.push({
              id: msg.data.id!,
              title: subject || 'No Subject',
              description: snippet,
              entity: 'gmail_message',
              url: `https://mail.google.com/mail/u/0/#inbox/${msg.data.id}`,
              score: this.calculateRelevanceScore(queryLower, { subject, snippet, from }),
              highlights: this.extractHighlights(queryLower, { subject, snippet, from }),
              integrationId: this.connectionId,
              integrationName: this.integrationId,
              providerName: 'Google Workspace',
              metadata: {
                from,
                date: msg.data.payload?.headers?.find(h => h.name === 'Date')?.value,
                threadId: msg.data.threadId,
              },
            });
          });
        }
      } catch (error: unknown) {
        this.monitoring.trackException(
          error instanceof Error ? error : new Error(String(error)),
          {
            operation: 'google-workspace.search.gmail',
          }
        );
      }
    }

    // Search Calendar events
    if (entitiesToSearch.includes('calendar_event') && this.calendarClient) {
      try {
        const events = await this.calendarClient.events.list({
          calendarId: 'primary',
          q: query,
          maxResults: Math.min(limit, 50),
          singleEvents: true,
          orderBy: 'startTime',
        });

        if (events.data.items) {
          events.data.items.forEach((event) => {
            results.push({
              id: event.id!,
              title: event.summary || 'Untitled Event',
              description: event.description || '',
              entity: 'calendar_event',
              url: event.htmlLink || '',
              score: this.calculateRelevanceScore(queryLower, {
                summary: event.summary,
                description: event.description,
                location: event.location,
              }),
              highlights: this.extractHighlights(queryLower, {
                summary: event.summary,
                description: event.description,
                location: event.location,
              }),
              integrationId: this.connectionId,
              integrationName: this.integrationId,
              providerName: 'Google Workspace',
              metadata: {
                start: event.start?.dateTime || event.start?.date,
                end: event.end?.dateTime || event.end?.date,
                location: event.location,
              },
            });
          });
        }
      } catch (error: unknown) {
        this.monitoring.trackException(
          error instanceof Error ? error : new Error(String(error)),
          {
            operation: 'google-workspace.search.calendar',
          }
        );
      }
    }

    // Search Drive files
    if (entitiesToSearch.includes('drive_file') && this.driveClient) {
      try {
        const files = await this.driveClient.files.list({
          q: `name contains '${query}' or fullText contains '${query}'`,
          pageSize: Math.min(limit, 50),
          fields: 'files(id, name, mimeType, webViewLink, modifiedTime, size)',
        });

        if (files.data.files) {
          files.data.files.forEach((file) => {
            results.push({
              id: file.id!,
              title: file.name || 'Untitled',
              description: `${file.mimeType || 'File'}`,
              entity: 'drive_file',
              url: file.webViewLink || '',
              score: this.calculateRelevanceScore(queryLower, { name: file.name }),
              highlights: this.extractHighlights(queryLower, { name: file.name }),
              integrationId: this.connectionId,
              integrationName: this.integrationId,
              providerName: 'Google Workspace',
              metadata: {
                mimeType: file.mimeType,
                size: file.size,
                modifiedTime: file.modifiedTime,
              },
            });
          });
        }
      } catch (error: unknown) {
        this.monitoring.trackException(
          error instanceof Error ? error : new Error(String(error)),
          {
            operation: 'google-workspace.search.drive',
          }
        );
      }
    }

    // Search Contacts
    if (entitiesToSearch.includes('contact') && this.peopleClient) {
      try {
        const contacts = await this.peopleClient.people.searchContacts({
          query,
          readMask: 'names,emailAddresses,phoneNumbers,organizations',
        });

        if (contacts.data.results) {
          contacts.data.results.forEach((result) => {
            const person = result.person;
            if (!person) {return;}

            const name = person.names?.[0]?.displayName || 
                       `${person.names?.[0]?.givenName || ''} ${person.names?.[0]?.familyName || ''}`.trim() ||
                       'Unknown';
            const email = person.emailAddresses?.[0]?.value || '';
            const phone = person.phoneNumbers?.[0]?.value || '';
            const company = person.organizations?.[0]?.name || '';

            results.push({
              id: person.resourceName!,
              title: name,
              description: [email, phone, company].filter(Boolean).join(' • '),
              entity: 'contact',
              url: `https://contacts.google.com/person/${person.resourceName}`,
              score: this.calculateRelevanceScore(queryLower, { name, email, phone, company }),
              highlights: this.extractHighlights(queryLower, { name, email, phone, company }),
              integrationId: this.connectionId,
              integrationName: this.integrationId,
              providerName: 'Google Workspace',
              metadata: {
                email,
                phone,
                company,
              },
            });
          });
        }
      } catch (error: unknown) {
        this.monitoring.trackException(
          error instanceof Error ? error : new Error(String(error)),
          {
            operation: 'google-workspace.search.contacts',
          }
        );
      }
    }

    // Search Tasks
    if (entitiesToSearch.includes('task') && this.tasksClient) {
      try {
        const taskLists = await this.tasksClient.tasklists.list();
        if (taskLists.data.items) {
          const allTasks: any[] = [];
          
          for (const taskList of taskLists.data.items) {
            const tasks = await this.tasksClient.tasks.list({
              tasklist: taskList.id!,
              showCompleted: false,
            });
            
            if (tasks.data.items) {
              allTasks.push(...tasks.data.items);
            }
          }

          allTasks
            .filter(task => 
              task.title?.toLowerCase().includes(queryLower) ||
              task.notes?.toLowerCase().includes(queryLower)
            )
            .slice(0, limit)
            .forEach((task) => {
              results.push({
                id: task.id!,
                title: task.title || 'Untitled Task',
                description: task.notes || '',
                entity: 'task',
                url: `https://tasks.google.com/embed/list/${task.id}`,
                score: this.calculateRelevanceScore(queryLower, { title: task.title, notes: task.notes }),
                highlights: this.extractHighlights(queryLower, { title: task.title, notes: task.notes }),
                integrationId: this.connectionId,
                integrationName: this.integrationId,
                providerName: 'Google Workspace',
                metadata: {
                  status: task.status,
                  due: task.due,
                },
              });
            });
        }
      } catch (error: unknown) {
        this.monitoring.trackException(
          error instanceof Error ? error : new Error(String(error)),
          {
            operation: 'google-workspace.search.tasks',
          }
        );
      }
    }

    // Sort by relevance score and apply pagination
    results.sort((a, b) => b.score - a.score);
    const paginatedResults = results.slice(offset, offset + limit);

    return {
      results: paginatedResults,
      total: results.length,
      took: 0, // Will be calculated by search service
      hasMore: offset + limit < results.length,
    };
  }

  /**
   * Calculate relevance score for a search result
   */
  private calculateRelevanceScore(query: string, record: Record<string, any>): number {
    let score = 0.5; // Base score

    // Check title/name field (highest relevance)
    if (record.title?.toLowerCase().includes(query) || record.name?.toLowerCase().includes(query)) {
      score = 0.9;
    } else if (record.summary?.toLowerCase().includes(query)) {
      score = 0.85;
    }

    // Check other fields
    Object.values(record).forEach((value: any) => {
      if (typeof value === 'string' && value.toLowerCase().includes(query)) {
        score = Math.max(score, 0.7);
      }
    });

    return Math.min(score, 1.0);
  }

  /**
   * Extract highlighted text from record
   */
  private extractHighlights(query: string, record: Record<string, any>): string[] {
    const highlights: string[] = [];

    Object.values(record).forEach((value) => {
      if (typeof value === 'string' && value.toLowerCase().includes(query)) {
        const index = value.toLowerCase().indexOf(query);
        const start = Math.max(0, index - 20);
        const end = Math.min(value.length, index + query.length + 20);
        highlights.push(value.substring(start, end));
      }
    });

    return highlights.slice(0, 3); // Limit to 3 highlights
  }

  /**
   * Push record to Google Workspace
   */
  async push(data: Record<string, any>, options: PushOptions): Promise<PushResult> {
    await this.initializeClients();

    const { entity, operation } = options;

    switch (entity) {
      case 'gmail_message':
        return this.pushGmailMessage(data, operation);
      case 'calendar_event':
        return this.pushCalendarEvent(data, operation);
      case 'drive_file':
        return this.pushDriveFile(data, operation);
      case 'contact':
        return this.pushContact(data, operation);
      case 'task':
        return this.pushTask(data, operation);
      default:
        return { success: false, error: `Unknown entity: ${entity}` };
    }
  }

  /**
   * Push Gmail message (send email or update labels)
   */
  private async pushGmailMessage(
    data: Record<string, any>,
    operation: string
  ): Promise<PushResult> {
    if (!this.gmailClient) {
      throw new Error('Gmail client not initialized');
    }

    try {
      if (operation === 'create') {
        // Send email
        const raw = this.buildGmailRawMessage(data);
        const response = await this.gmailClient.users.messages.send({
          userId: 'me',
          requestBody: { raw },
        });

        return {
          success: true,
          externalId: response.data.id || undefined,
        };
      } else if (operation === 'update') {
        // Update labels
        const messageId = data.id || data.messageId;
        if (!messageId) {
          return { success: false, error: 'Message ID required for update' };
        }

        const addLabelIds = data.addLabelIds || [];
        const removeLabelIds = data.removeLabelIds || [];

        await this.gmailClient.users.messages.modify({
          userId: 'me',
          id: messageId,
          requestBody: {
            addLabelIds,
            removeLabelIds,
          },
        });

        return { success: true, externalId: messageId };
      } else {
        return { success: false, error: `Unsupported operation: ${operation}` };
      }
    } catch (error: unknown) {
      this.monitoring.trackException(
        error instanceof Error ? error : new Error(String(error)),
        {
          operation: 'google-workspace.pushGmailMessage',
        }
      );
      throw this.handleGoogleError(error);
    }
  }

  /**
   * Push Calendar event
   */
  private async pushCalendarEvent(
    data: Record<string, any>,
    operation: string
  ): Promise<PushResult> {
    if (!this.calendarClient) {
      throw new Error('Calendar client not initialized');
    }

    try {
      const calendarId = data.calendarId || 'primary';
      const eventData = this.buildCalendarEventData(data);

      if (operation === 'create') {
        const response = await this.calendarClient.events.insert({
          calendarId,
          requestBody: eventData,
        });

        return {
          success: true,
          externalId: response.data.id || undefined,
        };
      } else if (operation === 'update') {
        const eventId = data.id || data.eventId;
        if (!eventId) {
          return { success: false, error: 'Event ID required for update' };
        }

        const response = await this.calendarClient.events.update({
          calendarId,
          eventId,
          requestBody: eventData,
        });

        return {
          success: true,
          externalId: response.data.id || undefined,
        };
      } else if (operation === 'delete') {
        const eventId = data.id || data.eventId;
        if (!eventId) {
          return { success: false, error: 'Event ID required for delete' };
        }

        await this.calendarClient.events.delete({
          calendarId,
          eventId,
        });

        return { success: true };
      } else {
        return { success: false, error: `Unsupported operation: ${operation}` };
      }
    } catch (error: unknown) {
      this.monitoring.trackException(
        error instanceof Error ? error : new Error(String(error)),
        {
          operation: 'google-workspace.pushCalendarEvent',
        }
      );
      throw this.handleGoogleError(error);
    }
  }

  /**
   * Push Drive file
   */
  private async pushDriveFile(
    data: Record<string, any>,
    operation: string
  ): Promise<PushResult> {
    if (!this.driveClient) {
      throw new Error('Drive client not initialized');
    }

    try {
      if (operation === 'create') {
        // Upload file
        const fileMetadata: drive_v3.Schema$File = {
          name: data.name,
          parents: data.parents || [],
        };

        const media = data.body
          ? {
              mimeType: data.mimeType || 'application/octet-stream',
              body: data.body,
            }
          : undefined;

        const response = await this.driveClient.files.create({
          requestBody: fileMetadata,
          media,
          fields: 'id',
        });

        return {
          success: true,
          externalId: response.data.id || undefined,
        };
      } else if (operation === 'update') {
        const fileId = data.id || data.fileId;
        if (!fileId) {
          return { success: false, error: 'File ID required for update' };
        }

        const fileMetadata: drive_v3.Schema$File = {};
        if (data.name) {fileMetadata.name = data.name;}
        if (data.parents) {fileMetadata.parents = data.parents;}

        const response = await this.driveClient.files.update({
          fileId,
          requestBody: fileMetadata,
          fields: 'id',
        });

        return {
          success: true,
          externalId: response.data.id || undefined,
        };
      } else if (operation === 'delete') {
        const fileId = data.id || data.fileId;
        if (!fileId) {
          return { success: false, error: 'File ID required for delete' };
        }

        await this.driveClient.files.delete({
          fileId,
        });

        return { success: true };
      } else {
        return { success: false, error: `Unsupported operation: ${operation}` };
      }
    } catch (error: unknown) {
      this.monitoring.trackException(
        error instanceof Error ? error : new Error(String(error)),
        {
          operation: 'google-workspace.pushDriveFile',
        }
      );
      throw this.handleGoogleError(error);
    }
  }

  /**
   * Push Contact
   */
  private async pushContact(
    data: Record<string, any>,
    operation: string
  ): Promise<PushResult> {
    if (!this.peopleClient) {
      throw new Error('People client not initialized');
    }

    try {
      if (operation === 'create') {
        const contactData = this.buildContactData(data);

        const response = await this.peopleClient.people.createContact({
          requestBody: contactData,
        });

        return {
          success: true,
          externalId: response.data.resourceName || undefined,
        };
      } else if (operation === 'update') {
        const resourceName = data.resourceName || data.id;
        if (!resourceName) {
          return { success: false, error: 'Contact resource name required for update' };
        }

        const contactData = this.buildContactData(data);

        const response = await this.peopleClient.people.updateContact({
          resourceName,
          updatePersonFields: 'names,emailAddresses,phoneNumbers,organizations,addresses',
          requestBody: contactData,
        });

        return {
          success: true,
          externalId: response.data.resourceName || undefined,
        };
      } else if (operation === 'delete') {
        const resourceName = data.resourceName || data.id;
        if (!resourceName) {
          return { success: false, error: 'Contact resource name required for delete' };
        }

        await this.peopleClient.people.deleteContact({
          resourceName,
        });

        return { success: true };
      } else {
        return { success: false, error: `Unsupported operation: ${operation}` };
      }
    } catch (error: unknown) {
      this.monitoring.trackException(
        error instanceof Error ? error : new Error(String(error)),
        {
          operation: 'google-workspace.pushContact',
        }
      );
      throw this.handleGoogleError(error);
    }
  }

  /**
   * Push Task
   */
  private async pushTask(
    data: Record<string, any>,
    operation: string
  ): Promise<PushResult> {
    if (!this.tasksClient) {
      throw new Error('Tasks client not initialized');
    }

    try {
      const tasklistId = data.tasklist || '@default';

      if (operation === 'create') {
        const taskData = this.buildTaskData(data);

        const response = await this.tasksClient.tasks.insert({
          tasklist: tasklistId,
          requestBody: taskData,
        });

        return {
          success: true,
          externalId: response.data.id || undefined,
        };
      } else if (operation === 'update') {
        const taskId = data.id || data.taskId;
        if (!taskId) {
          return { success: false, error: 'Task ID required for update' };
        }

        const taskData = this.buildTaskData(data);

        const response = await this.tasksClient.tasks.update({
          tasklist: tasklistId,
          task: taskId,
          requestBody: taskData,
        });

        return {
          success: true,
          externalId: response.data.id || undefined,
        };
      } else if (operation === 'delete') {
        const taskId = data.id || data.taskId;
        if (!taskId) {
          return { success: false, error: 'Task ID required for delete' };
        }

        await this.tasksClient.tasks.delete({
          tasklist: tasklistId,
          task: taskId,
        });

        return { success: true };
      } else {
        return { success: false, error: `Unsupported operation: ${operation}` };
      }
    } catch (error: unknown) {
      this.monitoring.trackException(
        error instanceof Error ? error : new Error(String(error)),
        {
          operation: 'google-workspace.pushTask',
        }
      );
      throw this.handleGoogleError(error);
    }
  }

  /**
   * Get entity schema
   */
  async getEntitySchema(entityName: string): Promise<IntegrationEntity | null> {
    const definition = this.getDefinition();
    return (
      definition.availableEntities.find((e) => e.name === entityName) || null
    );
  }

  /**
   * List available entities
   */
  async listEntities(): Promise<IntegrationEntity[]> {
    return this.getDefinition().availableEntities;
  }

  /**
   * Register webhook subscription for Google Workspace services
   * Supports Gmail (Pub/Sub), Calendar (Watch API), and Drive (Watch API)
   */
  async registerWebhook(
    events: string[],
    callbackUrl: string,
    resource?: string
  ): Promise<{ webhookId: string; expirationDateTime?: Date; secret?: string }> {
    await this.initializeClients();

    // Determine service type from events or resource
    const entity = resource || events[0]?.split('.')[0] || 'gmail';
    
    try {
      if (entity === 'gmail' || entity === 'gmail_message' || entity === 'gmail_thread') {
        // Gmail uses Pub/Sub - requires Google Cloud Pub/Sub topic setup
        // This is a placeholder - actual implementation requires Pub/Sub topic creation
        // For now, return a webhook ID that can be used for tracking
        const webhookId = `gmail-${this.tenantId}-${Date.now()}`;
        this.monitoring.trackEvent('google-workspace.webhook.registered', {
          entity: 'gmail',
          webhookId,
        });
        
        return {
          webhookId,
          expirationDateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          secret: undefined, // Pub/Sub uses JWT tokens, not secrets
        };
      } else if (entity === 'calendar' || entity === 'calendar_event') {
        // Calendar uses Watch API
        if (!this.calendarClient) {
          throw new Error('Calendar client not initialized');
        }

        const calendarId = resource || 'primary';
        const channel = await (this.calendarClient.events.watch as any)({
          calendarId,
          requestBody: {
            id: `castiel-${this.tenantId}-${Date.now()}`,
            type: 'web_hook',
            address: callbackUrl,
            expiration: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
          },
        });

        const channelData = channel?.data;
        return {
          webhookId: channelData?.id || '',
          expirationDateTime: channelData?.expiration 
            ? new Date(parseInt(String(channelData.expiration)))
            : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          secret: channelData?.resourceId || undefined,
        };
      } else if (entity === 'drive' || entity === 'drive_file') {
        // Drive uses Watch API
        if (!this.driveClient) {
          throw new Error('Drive client not initialized');
        }

        const fileId = resource || 'root';
        const channel = await (this.driveClient.files.watch as any)({
          fileId,
          requestBody: {
            id: `castiel-${this.tenantId}-${Date.now()}`,
            type: 'web_hook',
            address: callbackUrl,
            expiration: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
          },
        });

        const channelData = channel?.data;
        return {
          webhookId: channelData?.id || '',
          expirationDateTime: channelData?.expiration 
            ? new Date(parseInt(String(channelData.expiration)))
            : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          secret: channelData?.resourceId || undefined,
        };
      } else {
        throw new Error(`Webhook registration not supported for entity: ${entity}`);
      }
    } catch (error: unknown) {
      this.monitoring.trackException(
        error instanceof Error ? error : new Error(String(error)),
        {
          operation: 'google-workspace.registerWebhook',
          entity,
        }
      );
      throw this.handleGoogleError(error);
    }
  }

  /**
   * Unregister webhook subscription
   */
  async unregisterWebhook(webhookId: string, resourceId?: string): Promise<void> {
    await this.initializeClients();

    try {
      // Determine service type from webhook ID
      if (webhookId.startsWith('gmail-')) {
        // Gmail Pub/Sub - requires topic subscription deletion
        // This is a placeholder - actual implementation requires Pub/Sub subscription management
        this.monitoring.trackEvent('google-workspace.webhook.unregistered', {
          entity: 'gmail',
          webhookId,
        });
        return;
      } else if (resourceId) {
        // Calendar or Drive - use stop channel API
        // Try Calendar first
        if (this.calendarClient) {
          try {
            await this.calendarClient.channels.stop({
              requestBody: {
                id: webhookId,
                resourceId,
              },
            });
            this.monitoring.trackEvent('google-workspace.webhook.unregistered', {
              entity: 'calendar',
              webhookId,
            });
            return;
          } catch (err) {
            // Not a calendar webhook, try Drive
          }
        }

        // Try Drive
        if (this.driveClient) {
          await this.driveClient.channels.stop({
            requestBody: {
              id: webhookId,
              resourceId,
            },
          });
          this.monitoring.trackEvent('google-workspace.webhook.unregistered', {
            entity: 'drive',
            webhookId,
          });
          return;
        }
      }

      throw new Error(`Failed to unregister webhook: ${webhookId}`);
    } catch (error: unknown) {
      this.monitoring.trackException(
        error instanceof Error ? error : new Error(String(error)),
        {
          operation: 'google-workspace.unregisterWebhook',
          webhookId,
        }
      );
      throw this.handleGoogleError(error);
    }
  }

  /**
   * Parse webhook payload
   */
  parseWebhook(payload: any, headers: Record<string, string>): WebhookEvent | null {
    // Gmail Pub/Sub webhook
    if (payload.message) {
      const message = payload.message;
      const data = message.data
        ? JSON.parse(Buffer.from(message.data, 'base64').toString())
        : {};

      return {
        type: 'gmail.history',
        entity: 'gmail_message',
        externalId: data.historyId || '',
        operation: 'update',
        data,
        timestamp: new Date(message.publishTime || Date.now()),
      };
    }

    // Calendar webhook
    if (payload.kind === 'api#channel') {
      return {
        type: 'calendar.event',
        entity: 'calendar_event',
        externalId: payload.id || '',
        operation: 'update',
        data: payload,
        timestamp: new Date(),
      };
    }

    // Drive webhook
    if (payload.kind === 'drive#change') {
      return {
        type: 'drive.change',
        entity: 'drive_file',
        externalId: payload.fileId || '',
        operation: payload.removed ? 'delete' : 'update',
        data: payload,
        timestamp: new Date(payload.modificationTime || Date.now()),
      };
    }

    return null;
  }

  /**
   * Verify webhook signature (for Pub/Sub)
   */
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    // Pub/Sub uses JWT tokens for verification
    // For now, we'll validate the token structure
    try {
      const parts = signature.split('.');
      if (parts.length !== 3) {
        return false;
      }
      // In production, verify JWT signature with Google's public keys
      return true;
    } catch {
      return false;
    }
  }

  // ============================================
  // Helper Methods - Normalization
  // ============================================

  private normalizeGmailMessage(message: gmail_v1.Schema$Message): Record<string, any> {
    const headers = message.payload?.headers || [];
    const getHeader = (name: string) =>
      headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

    return {
      id: message.id,
      threadId: message.threadId,
      snippet: message.snippet,
      subject: getHeader('subject'),
      from: getHeader('from'),
      to: getHeader('to'),
      date: getHeader('date'),
      labelIds: message.labelIds || [],
      internalDate: message.internalDate,
      sizeEstimate: message.sizeEstimate,
      historyId: message.historyId,
    };
  }

  private normalizeGmailThread(thread: gmail_v1.Schema$Thread): Record<string, any> {
    return {
      id: thread.id,
      snippet: thread.snippet,
      historyId: thread.historyId,
      messageIds: thread.messages?.map((m) => m.id) || [],
      messageCount: thread.messages?.length || 0,
    };
  }

  private normalizeCalendarEvent(event: calendar_v3.Schema$Event): Record<string, any> {
    return {
      id: event.id,
      summary: event.summary,
      description: event.description,
      start: event.start,
      end: event.end,
      location: event.location,
      attendees: event.attendees?.map((a) => ({
        email: a.email,
        responseStatus: a.responseStatus,
      })),
      organizer: event.organizer?.email,
      hangoutLink: event.hangoutLink,
      status: event.status,
      created: event.created,
      updated: event.updated,
      recurrence: event.recurrence,
    };
  }

  private normalizeDriveFile(file: drive_v3.Schema$File): Record<string, any> {
    return {
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      size: file.size,
      webViewLink: file.webViewLink,
      webContentLink: file.webContentLink,
      createdTime: file.createdTime,
      modifiedTime: file.modifiedTime,
      ownerEmail: file.owners?.[0]?.emailAddress,
      isShared: file.shared,
      parentFolderIds: file.parents,
      canDownload: file.capabilities?.canDownload,
    };
  }

  private normalizeContact(contact: people_v1.Schema$Person): Record<string, any> {
    return {
      resourceName: contact.resourceName,
      displayName: contact.names?.[0]?.displayName,
      givenName: contact.names?.[0]?.givenName,
      familyName: contact.names?.[0]?.familyName,
      email: contact.emailAddresses?.[0]?.value,
      phone: contact.phoneNumbers?.[0]?.value,
      company: contact.organizations?.[0]?.name,
      title: contact.organizations?.[0]?.title,
    };
  }

  private normalizeTask(task: tasks_v1.Schema$Task): Record<string, any> {
    return {
      id: task.id,
      title: task.title,
      notes: task.notes,
      status: task.status,
      due: task.due,
      completed: task.completed,
      parent: task.parent,
      position: task.position,
    };
  }

  // ============================================
  // Helper Methods - Data Building
  // ============================================

  private buildGmailRawMessage(data: Record<string, any>): string {
    const lines: string[] = [];
    lines.push(`To: ${data.to || ''}`);
    if (data.cc) {lines.push(`Cc: ${data.cc}`);}
    if (data.bcc) {lines.push(`Bcc: ${data.bcc}`);}
    lines.push(`Subject: ${data.subject || ''}`);
    lines.push(`Content-Type: ${data.bodyType === 'html' ? 'text/html' : 'text/plain'}; charset=UTF-8`);
    lines.push('');
    lines.push(data.body || '');
    return Buffer.from(lines.join('\r\n')).toString('base64url');
  }

  private buildCalendarEventData(data: Record<string, any>): calendar_v3.Schema$Event {
    return {
      summary: data.summary,
      description: data.description,
      start: data.start,
      end: data.end,
      location: data.location,
      attendees: data.attendees?.map((email: string) => ({ email })),
      recurrence: data.recurrence,
    };
  }

  private buildContactData(data: Record<string, any>): people_v1.Schema$Person {
    const person: people_v1.Schema$Person = {};

    if (data.displayName || data.givenName || data.familyName) {
      person.names = [
        {
          givenName: data.givenName,
          familyName: data.familyName,
          displayName: data.displayName || `${data.givenName || ''} ${data.familyName || ''}`.trim(),
        },
      ];
    }

    if (data.email) {
      person.emailAddresses = [{ value: data.email, type: 'work' }];
    }

    if (data.phone) {
      person.phoneNumbers = [{ value: data.phone, type: 'work' }];
    }

    if (data.company || data.title) {
      person.organizations = [
        {
          name: data.company,
          title: data.title,
        },
      ];
    }

    return person;
  }

  private buildTaskData(data: Record<string, any>): tasks_v1.Schema$Task {
    return {
      title: data.title,
      notes: data.notes,
      status: data.status,
      due: data.due,
      completed: data.completed,
      parent: data.parent,
    };
  }

  // ============================================
  // Helper Methods - Error Handling
  // ============================================

  private handleGoogleError(error: unknown): Error {
    if (error && typeof error === 'object' && 'code' in error) {
      const code = (error as { code?: number }).code;
      if (code === 401) {
        return new Error('Authentication failed - token may be expired');
      }
      if (code === 403) {
        return new Error('Insufficient permissions');
      }
      if (code === 429) {
        return new Error('Rate limit exceeded - please retry later');
      }
      if (code === 500 || code === 503) {
        return new Error('Google service temporarily unavailable');
      }
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Error(errorMessage || 'Unknown Google API error');
  }
}

// ============================================
// Integration Definition
// ============================================

const GMAIL_MESSAGE_ENTITY: IntegrationEntity = {
  name: 'gmail_message',
  displayName: 'Gmail Message',
  description: 'Gmail email messages',
  fields: [
    { name: 'id', displayName: 'Message ID', type: 'string', required: true },
    { name: 'threadId', displayName: 'Thread ID', type: 'string', required: false },
    { name: 'snippet', displayName: 'Snippet', type: 'string', required: false },
    { name: 'subject', displayName: 'Subject', type: 'string', required: false },
    { name: 'from', displayName: 'From', type: 'string', required: false },
    { name: 'to', displayName: 'To', type: 'string', required: false },
    { name: 'date', displayName: 'Date', type: 'datetime', required: false },
    { name: 'labelIds', displayName: 'Labels', type: 'array', required: false },
  ],
  supportsPull: true,
  supportsPush: true,
  supportsDelete: false,
  supportsWebhook: true,
  idField: 'id',
  modifiedField: 'internalDate',
};

const GMAIL_THREAD_ENTITY: IntegrationEntity = {
  name: 'gmail_thread',
  displayName: 'Gmail Thread',
  description: 'Gmail conversation threads',
  fields: [
    { name: 'id', displayName: 'Thread ID', type: 'string', required: true },
    { name: 'snippet', displayName: 'Snippet', type: 'string', required: false },
    { name: 'historyId', displayName: 'History ID', type: 'string', required: false },
    { name: 'messageIds', displayName: 'Message IDs', type: 'array', required: false },
  ],
  supportsPull: true,
  supportsPush: false,
  supportsDelete: false,
  supportsWebhook: true,
  idField: 'id',
  modifiedField: 'historyId',
};

const CALENDAR_EVENT_ENTITY: IntegrationEntity = {
  name: 'calendar_event',
  displayName: 'Calendar Event',
  description: 'Google Calendar events',
  fields: [
    { name: 'id', displayName: 'Event ID', type: 'string', required: true },
    { name: 'summary', displayName: 'Title', type: 'string', required: false },
    { name: 'description', displayName: 'Description', type: 'string', required: false },
    { name: 'start', displayName: 'Start Time', type: 'datetime', required: false },
    { name: 'end', displayName: 'End Time', type: 'datetime', required: false },
    { name: 'location', displayName: 'Location', type: 'string', required: false },
    { name: 'attendees', displayName: 'Attendees', type: 'array', required: false },
    { name: 'organizer', displayName: 'Organizer', type: 'string', required: false },
  ],
  supportsPull: true,
  supportsPush: true,
  supportsDelete: true,
  supportsWebhook: true,
  idField: 'id',
  modifiedField: 'updated',
};

const DRIVE_FILE_ENTITY: IntegrationEntity = {
  name: 'drive_file',
  displayName: 'Drive File',
  description: 'Google Drive files and folders',
  fields: [
    { name: 'id', displayName: 'File ID', type: 'string', required: true },
    { name: 'name', displayName: 'Name', type: 'string', required: false },
    { name: 'mimeType', displayName: 'MIME Type', type: 'string', required: false },
    { name: 'size', displayName: 'Size', type: 'number', required: false },
    { name: 'webViewLink', displayName: 'View Link', type: 'string', required: false },
    { name: 'webContentLink', displayName: 'Download Link', type: 'string', required: false },
    { name: 'createdTime', displayName: 'Created', type: 'datetime', required: false },
    { name: 'modifiedTime', displayName: 'Modified', type: 'datetime', required: false },
  ],
  supportsPull: true,
  supportsPush: true,
  supportsDelete: true,
  supportsWebhook: true,
  idField: 'id',
  modifiedField: 'modifiedTime',
};

const CONTACT_ENTITY: IntegrationEntity = {
  name: 'contact',
  displayName: 'Contact',
  description: 'Google Contacts',
  fields: [
    { name: 'resourceName', displayName: 'Resource Name', type: 'string', required: true },
    { name: 'displayName', displayName: 'Display Name', type: 'string', required: false },
    { name: 'givenName', displayName: 'First Name', type: 'string', required: false },
    { name: 'familyName', displayName: 'Last Name', type: 'string', required: false },
    { name: 'email', displayName: 'Email', type: 'string', required: false },
    { name: 'phone', displayName: 'Phone', type: 'string', required: false },
    { name: 'company', displayName: 'Company', type: 'string', required: false },
    { name: 'title', displayName: 'Title', type: 'string', required: false },
  ],
  supportsPull: true,
  supportsPush: true,
  supportsDelete: true,
  supportsWebhook: false,
  idField: 'resourceName',
};

const TASK_ENTITY: IntegrationEntity = {
  name: 'task',
  displayName: 'Task',
  description: 'Google Tasks',
  fields: [
    { name: 'id', displayName: 'Task ID', type: 'string', required: true },
    { name: 'title', displayName: 'Title', type: 'string', required: false },
    { name: 'notes', displayName: 'Notes', type: 'string', required: false },
    { name: 'status', displayName: 'Status', type: 'string', required: false },
    { name: 'due', displayName: 'Due Date', type: 'datetime', required: false },
    { name: 'completed', displayName: 'Completed', type: 'datetime', required: false },
  ],
  supportsPull: true,
  supportsPush: true,
  supportsDelete: true,
  supportsWebhook: false,
  idField: 'id',
  modifiedField: 'updated',
};

/**
 * Google Workspace integration definition
 */
export const GOOGLE_WORKSPACE_DEFINITION: IntegrationDefinition = {
  id: 'google-workspace',
  name: 'google_workspace',
  displayName: 'Google Workspace',
  description: 'Integrate with Google Workspace services: Gmail, Calendar, Drive, Contacts, and Tasks',
  category: IntegrationCategory.COMMUNICATION,
  icon: 'mail',
  color: '#4285F4',
  visibility: 'public',
  isPremium: false,
  capabilities: ['read', 'write', 'delete', 'search', 'realtime'],
  supportedSyncDirections: ['pull', 'push', 'bidirectional'],
  supportsRealtime: true,
  supportsWebhooks: true,
  authType: 'oauth2',
  oauthConfig: {
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    revokeUrl: 'https://oauth2.googleapis.com/revoke',
    scopes: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/contacts.readonly',
      'https://www.googleapis.com/auth/contacts',
      'https://www.googleapis.com/auth/tasks',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ],
    clientIdEnvVar: 'GOOGLE_WORKSPACE_CLIENT_ID',
    clientSecretEnvVar: 'GOOGLE_WORKSPACE_CLIENT_SECRET',
    redirectUri: process.env.GOOGLE_WORKSPACE_REDIRECT_URI || '',
    pkce: true,
    additionalParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
  },
  availableEntities: [
    GMAIL_MESSAGE_ENTITY,
    GMAIL_THREAD_ENTITY,
    CALENDAR_EVENT_ENTITY,
    DRIVE_FILE_ENTITY,
    CONTACT_ENTITY,
    TASK_ENTITY,
  ],
  connectionScope: 'tenant',
  status: 'active',
  version: '1.0.0',
  documentationUrl: 'https://developers.google.com/workspace',
  createdAt: new Date(),
  updatedAt: new Date(),
};

/**
 * Google Workspace adapter factory
 */
export const googleWorkspaceAdapterFactory: IntegrationAdapterFactory = {
  create(monitoring, connectionService, tenantId, connectionId) {
    return new GoogleWorkspaceAdapter(monitoring, connectionService, tenantId, connectionId);
  },
};

// Register adapter
adapterRegistry.register('google-workspace', googleWorkspaceAdapterFactory);
