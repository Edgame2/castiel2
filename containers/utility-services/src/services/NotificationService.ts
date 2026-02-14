import { getDatabaseClient } from '@coder/shared';
import { NotFoundError } from '@coder/shared';

export interface GetNotificationsInput {
  userId?: string;
  tenantId?: string;
  read?: boolean;
  limit?: number;
  offset?: number;
}

export class NotificationService {
  private db = getDatabaseClient() as any;

  async createNotification(input: {
    userId?: string;
    tenantId?: string;
    type: string;
    title: string;
    message: string;
  }) {
    return await this.db.notification_notifications.create({
      data: {
        userId: input.userId,
        tenantId: input.tenantId,
        type: input.type,
        title: input.title,
        message: input.message,
      },
    });
  }

  async getNotifications(input: GetNotificationsInput) {
    const where: any = {};
    
    if (input.userId) {
      where.userId = input.userId;
    }
    
    if (input.tenantId) {
      where.tenantId = input.tenantId;
    }
    
    if (input.read !== undefined) {
      where.read = input.read;
    }

    const notifications = await this.db.notification_notifications.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      take: input.limit || 50,
      skip: input.offset || 0,
    });

    const total = await this.db.notification_notifications.count({ where });

    return {
      items: notifications,
      total,
      limit: input.limit || 50,
      offset: input.offset || 0,
    };
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.db.notification_notifications.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!notification) {
      throw new NotFoundError('Notification', id);
    }

    return await this.db.notification_notifications.update({
      where: { id },
      data: { read: true },
    });
  }

  async markAllAsRead(input: { userId: string; tenantId?: string }) {
    const where: any = {
      userId: input.userId,
      read: false,
    };
    
    if (input.tenantId) {
      where.tenantId = input.tenantId;
    }

    return await this.db.notification_notifications.updateMany({
      where,
      data: { read: true },
    });
  }

  async deleteNotification(id: string, userId: string) {
    const notification = await this.db.notification_notifications.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!notification) {
      throw new NotFoundError('Notification', id);
    }

    await this.db.notification_notifications.delete({
      where: { id },
    });
  }
}
