/**
 * Event Mapper
 * 
 * Maps domain events to NotificationInput
 */

import { NotificationInput, EventCategory, NotificationCriticality, NotificationChannel } from '../types/notification';
import { DomainEvent } from '@coder/shared';

export function mapEventToNotificationInput(event: DomainEvent<any>): NotificationInput | null {
  const eventData = event.data || {};
  const userId = (event as any).userId ?? eventData?.userId ?? (eventData as any)?.userId;
  const tenantId = (event as any).tenantId ?? eventData?.tenantId ?? (event as any).organizationId ?? eventData?.organizationId ?? event.tenantId;

  if (!userId || !tenantId) {
    return null; // Skip events without user/tenant context
  }

  // Map event type to notification input (auth module uses auth.user.* and auth.session.* etc.)
  switch (event.type) {
    case 'auth.user.registered':
    case 'user.registered': {
      return {
        tenantId,
        eventType: event.type,
        eventCategory: 'SYSTEM_ADMIN',
        sourceModule: 'user-management',
        sourceResourceId: userId,
        sourceResourceType: 'user',
        recipientId: userId,
        recipientEmail: eventData.email,
        title: 'Welcome to Castiel',
        body: `Welcome ${eventData.firstName || 'User'}! Your account has been created.`,
        criticality: 'MEDIUM',
        channelsRequested: ['EMAIL', 'IN_APP'],
      };
    }

    case 'auth.user.password_reset_requested':
    case 'user.password_reset_requested': {
      return {
        tenantId,
        eventType: event.type,
        eventCategory: 'SECURITY',
        sourceModule: 'auth',
        sourceResourceId: userId,
        sourceResourceType: 'user',
        recipientId: userId,
        recipientEmail: eventData.email,
        title: 'Password Reset Requested',
        body: 'You requested to reset your password. Click the link in the email to reset your password.',
        actionUrl: eventData.resetUrl,
        actionLabel: 'Reset Password',
        criticality: 'HIGH',
        channelsRequested: ['EMAIL'],
        metadata: {
          resetToken: eventData.resetToken,
          expiresIn: eventData.expiresIn,
        },
      };
    }

    case 'auth.user.password_reset_success':
    case 'user.password_reset_success': {
      return {
        tenantId,
        eventType: event.type,
        eventCategory: 'SECURITY',
        sourceModule: 'auth',
        sourceResourceId: userId,
        sourceResourceType: 'user',
        recipientId: userId,
        title: 'Password Reset Successful',
        body: 'Your password has been successfully reset.',
        criticality: 'HIGH',
        channelsRequested: ['EMAIL', 'IN_APP'],
      };
    }

    case 'auth.user.email_verification_requested':
    case 'user.email_verification_requested': {
      return {
        tenantId,
        eventType: event.type,
        eventCategory: 'SYSTEM_ADMIN',
        sourceModule: 'user-management',
        sourceResourceId: userId,
        sourceResourceType: 'user',
        recipientId: userId,
        recipientEmail: eventData.email,
        title: 'Verify Your Email',
        body: 'Please verify your email address by clicking the link in the email.',
        actionUrl: eventData.verificationUrl,
        actionLabel: 'Verify Email',
        criticality: 'MEDIUM',
        channelsRequested: ['EMAIL'],
        metadata: {
          verificationToken: eventData.verificationToken,
          expiresIn: eventData.expiresIn,
        },
      };
    }

    case 'auth.user.email_verified':
    case 'user.email_verified': {
      return {
        tenantId,
        eventType: event.type,
        eventCategory: 'SYSTEM_ADMIN',
        sourceModule: 'user-management',
        sourceResourceId: userId,
        sourceResourceType: 'user',
        recipientId: userId,
        title: 'Email Verified',
        body: 'Your email address has been successfully verified!',
        criticality: 'LOW',
        channelsRequested: ['IN_APP'],
      };
    }

    case 'auth.user.password_changed':
    case 'user.password_changed': {
      return {
        tenantId,
        eventType: event.type,
        eventCategory: 'SECURITY',
        sourceModule: 'auth',
        sourceResourceId: userId,
        sourceResourceType: 'user',
        recipientId: userId,
        title: 'Password Changed',
        body: 'Your password has been successfully changed.',
        criticality: 'HIGH',
        channelsRequested: ['EMAIL', 'IN_APP'],
      };
    }

    case 'planning.plan.created': {
      return {
        tenantId,
        eventType: event.type,
        eventCategory: 'AI_PLANNING',
        sourceModule: 'planning',
        sourceResourceId: eventData.planId,
        sourceResourceType: 'plan',
        recipientId: userId,
        title: 'New Plan Created',
        body: `Plan "${eventData.planId}" has been created`,
        criticality: 'MEDIUM',
        channelsRequested: ['IN_APP', 'EMAIL'],
      };
    }

    case 'planning.plan.executed': {
      const status = eventData.status;
      return {
        tenantId,
        eventType: event.type,
        eventCategory: 'AI_PLANNING',
        sourceModule: 'planning',
        sourceResourceId: eventData.planId,
        sourceResourceType: 'plan',
        recipientId: userId,
        title: `Plan Execution ${status === 'success' ? 'Succeeded' : 'Failed'}`,
        body: `Plan "${eventData.planId}" execution ${status}`,
        criticality: status === 'success' ? 'LOW' : 'HIGH',
        channelsRequested: ['IN_APP', 'EMAIL'],
      };
    }

    case 'ai.completion.completed': {
      return {
        tenantId,
        eventType: event.type,
        eventCategory: 'AI_PLANNING',
        sourceModule: 'ai-service',
        sourceResourceId: eventData.requestId,
        sourceResourceType: 'completion',
        recipientId: userId,
        title: 'AI Completion Completed',
        body: `AI completion for request "${eventData.requestId}" completed`,
        criticality: 'LOW',
        channelsRequested: ['IN_APP'],
      };
    }

    case 'ai.completion.failed': {
      return {
        tenantId,
        eventType: event.type,
        eventCategory: 'AI_PLANNING',
        sourceModule: 'ai-service',
        sourceResourceId: eventData.requestId,
        sourceResourceType: 'completion',
        recipientId: userId,
        title: 'AI Completion Failed',
        body: `AI completion for request "${eventData.requestId}" failed: ${eventData.error}`,
        criticality: 'MEDIUM',
        channelsRequested: ['IN_APP', 'EMAIL'],
      };
    }

    case 'usage.event.recorded': {
      if (eventData.eventType === 'quota.exceeded') {
        return {
          tenantId,
          eventType: event.type,
          eventCategory: 'SYSTEM_ADMIN',
          sourceModule: 'usage-tracking',
          recipientId: userId,
          title: 'Usage Quota Exceeded',
          body: `Usage quota exceeded for service "${eventData.service}"`,
          criticality: 'HIGH',
          channelsRequested: ['IN_APP', 'EMAIL'],
        };
      }
      return null;
    }

    case 'auth.session.revoked':
    case 'session.revoked': {
      return {
        tenantId,
        eventType: event.type,
        eventCategory: 'SECURITY',
        sourceModule: 'auth',
        sourceResourceId: eventData.sessionId,
        sourceResourceType: 'session',
        recipientId: userId,
        title: 'Session Revoked',
        body: `A session was revoked: ${eventData.reason || 'Unknown reason'}`,
        criticality: 'HIGH',
        channelsRequested: ['IN_APP', 'EMAIL'],
      };
    }

    case 'auth.sessions.bulk_revoked':
    case 'sessions.bulk_revoked': {
      return {
        tenantId,
        eventType: event.type,
        eventCategory: 'SECURITY',
        sourceModule: 'auth',
        recipientId: userId,
        title: 'Sessions Revoked',
        body: `Multiple sessions were revoked: ${eventData.reason || 'Unknown reason'}`,
        criticality: 'HIGH',
        channelsRequested: ['IN_APP', 'EMAIL'],
      };
    }

    default:
      // Generic notification for unhandled events
      return {
        tenantId,
        eventType: event.type,
        eventCategory: 'SYSTEM_ADMIN',
        sourceModule: (typeof event.source === 'object' && event.source?.service) ? event.source.service : String(event.source ?? 'unknown'),
        recipientId: userId,
        title: 'System Event',
        body: `Event: ${event.type}`,
        criticality: 'LOW',
        channelsRequested: ['IN_APP'],
      };
  }
}

