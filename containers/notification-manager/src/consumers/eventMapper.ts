/**
 * Event Mapper
 * 
 * Maps domain events to NotificationInput
 */

import { NotificationInput, EventCategory, NotificationCriticality, NotificationChannel } from '../types/notification';
import { DomainEvent } from '@coder/shared';

export function mapEventToNotificationInput(event: DomainEvent<any>): NotificationInput | null {
  const eventData = event.data || {};

  // hitl.approval.requested (Plan §972): HITL approval request; BI/risk uses tenantId only.
  // recipientId: eventData.ownerId || eventData.approverId || eventData.recipientId. risk-analytics must include at least one when publishing.
  if (event.type === 'hitl.approval.requested') {
    const tenantId = eventData.tenantId || (event as { tenantId?: string }).tenantId;
    const recipientId = eventData.ownerId || eventData.approverId || eventData.recipientId;
    if (!tenantId || !recipientId) return null;
    const oppId = eventData.opportunityId || '';
    const risk = eventData.riskScore != null ? Number(eventData.riskScore) : null;
    const amount = eventData.amount != null ? Number(eventData.amount) : null;
    return {
      organizationId: tenantId,
      eventType: 'hitl.approval.requested',
      eventCategory: 'SYSTEM_ADMIN',
      sourceModule: 'risk-analytics',
      sourceResourceId: oppId,
      sourceResourceType: 'opportunity',
      recipientId,
      title: 'Approval requested (high-risk deal)',
      body: `Opportunity ${oppId} requires approval (risk${risk != null ? ` ${risk}` : ''}${amount != null ? `, amount ${amount}` : ''}).`,
      criticality: 'HIGH',
      channelsRequested: ['IN_APP', 'EMAIL'],
      actionUrl: eventData.approvalUrl || undefined,
      actionLabel: 'Review',
      metadata: { opportunityId: oppId, riskScore: risk, amount, requestedAt: eventData.requestedAt, correlationId: eventData.correlationId },
    };
  }

  // anomaly.detected (Plan §7.2): BI/risk uses tenantId only; notify owner when high/medium severity.
  // recipientId requires eventData.ownerId (opportunity OwnerId). risk-analytics should include ownerId when publishing.
  if (event.type === 'anomaly.detected') {
    const orgId = eventData.tenantId || (event as { tenantId?: string }).tenantId || (event as { organizationId?: string }).organizationId || eventData.organizationId;
    const recipientId = eventData.ownerId || eventData.userId || (event as { userId?: string }).userId;
    if (!orgId || !recipientId) return null;
    const severity = String(eventData.severity || 'medium').toLowerCase();
    const criticality: NotificationCriticality =
      severity === 'high' ? 'HIGH' : severity === 'medium' ? 'MEDIUM' : 'LOW';
    const channels: NotificationChannel[] = severity === 'high' ? ['IN_APP', 'EMAIL'] : ['IN_APP'];
    return {
      organizationId: orgId,
      eventType: 'anomaly.detected',
      eventCategory: 'INCIDENTS',
      sourceModule: 'risk-analytics',
      sourceResourceId: eventData.opportunityId,
      sourceResourceType: 'opportunity',
      recipientId,
      title: 'Anomaly detected',
      body: eventData.description || `Anomaly (${eventData.anomalyType || 'unknown'}) for opportunity ${eventData.opportunityId || ''}.`,
      criticality,
      channelsRequested: channels,
      metadata: { opportunityId: eventData.opportunityId, anomalyType: eventData.anomalyType, severity, detectedAt: eventData.detectedAt },
    };
  }

  const userId = event.userId || eventData.userId;
  const organizationId = event.organizationId || eventData.organizationId;

  if (!userId || !organizationId) {
    return null; // Skip events without user/org context
  }

  // Map event type to notification input
  switch (event.type) {
    case 'user.registered': {
      return {
        organizationId,
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

    case 'user.password_reset_requested': {
      return {
        organizationId,
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

    case 'user.password_reset_success': {
      return {
        organizationId,
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

    case 'user.email_verification_requested': {
      return {
        organizationId,
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

    case 'user.email_verified': {
      return {
        organizationId,
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

    case 'user.password_changed': {
      return {
        organizationId,
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
        organizationId,
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
        organizationId,
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
        organizationId,
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
        organizationId,
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
          organizationId,
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

    case 'session.revoked': {
      return {
        organizationId,
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

    case 'sessions.bulk_revoked': {
      return {
        organizationId,
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
        organizationId,
        eventType: event.type,
        eventCategory: 'SYSTEM_ADMIN',
        sourceModule: event.source || 'unknown',
        recipientId: userId,
        title: 'System Event',
        body: `Event: ${event.type}`,
        criticality: 'LOW',
        channelsRequested: ['IN_APP'],
      };
  }
}

