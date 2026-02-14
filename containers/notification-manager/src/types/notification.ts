/**
 * Notification types and interfaces
 */

export type EventCategory = 
  | 'PROJECT_MANAGEMENT'
  | 'COLLABORATION'
  | 'AI_PLANNING'
  | 'SYSTEM_ADMIN'
  | 'INCIDENTS'
  | 'CALENDAR'
  | 'SECURITY'
  | 'BILLING';

export type NotificationCriticality = 
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'CRITICAL';

export type NotificationChannel = 
  | 'IN_APP'
  | 'EMAIL'
  | 'PUSH'
  | 'SMS'
  | 'WHATSAPP'
  | 'VOICE';

export type NotificationStatus = 
  | 'PENDING'
  | 'PROCESSING'
  | 'DELIVERED'
  | 'PARTIALLY_DELIVERED'
  | 'FAILED'
  | 'SCHEDULED'
  | 'HELD'
  | 'EXPIRED'
  | 'CANCELLED';

export type DeliveryStatus = 
  | 'PENDING'
  | 'SENT'
  | 'DELIVERED'
  | 'FAILED'
  | 'BOUNCED'
  | 'REJECTED';

export type PreferenceScope = 
  | 'GLOBAL'
  | 'TENANT'
  | 'TEAM'
  | 'PROJECT'
  | 'USER';

export interface NotificationInput {
  tenantId: string;
  eventType: string;
  eventCategory: EventCategory;
  sourceModule: string;
  sourceResourceId?: string;
  sourceResourceType?: string;
  recipientId: string;
  recipientEmail?: string;
  recipientPhone?: string;
  title: string;
  body: string;
  bodyHtml?: string;
  actionUrl?: string;
  actionLabel?: string;
  imageUrl?: string;
  metadata?: Record<string, any>;
  criticality: NotificationCriticality;
  channelsRequested: NotificationChannel[];
  scheduledFor?: Date;
  expiresAt?: Date;
  teamId?: string;
  projectId?: string;
  escalationChainId?: string;
  deduplicationKey?: string;
  batchId?: string;
}

export interface NotificationPreferences {
  channels: {
    [key in NotificationChannel]?: {
      enabled: boolean;
      priority?: number;
    };
  };
  categories: {
    [key in EventCategory]?: {
      enabled: boolean;
      channels?: NotificationChannel[];
    };
  };
  quietHoursStart?: string; // HH:mm format
  quietHoursEnd?: string; // HH:mm format
  timezone?: string;
}

export interface ResolvedPreferences extends NotificationPreferences {
  scope: PreferenceScope;
  scopeId?: string;
}

export interface TemplateData {
  [key: string]: string | number | boolean | undefined | null;
}

export interface RoutingDecision {
  channels: NotificationChannel[];
  reason: string;
  overrides?: {
    quietHours?: boolean;
    presenceAware?: boolean;
  };
}

