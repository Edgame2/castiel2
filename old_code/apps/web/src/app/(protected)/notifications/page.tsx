"use client";

import * as React from "react";
import { NotificationList } from "@/components/notifications/notification-list";
import { useNotifications } from "@/hooks/use-notifications";
import { notificationApi } from "@/lib/api/notifications";
import type { NotificationType, NotificationStatus } from "@/types/notification";
import { trackException, trackTrace } from "@/lib/monitoring/app-insights";

export default function NotificationsPage() {
  const [filters, setFilters] = React.useState<{
    status?: NotificationStatus;
    type?: NotificationType;
  }>({});

  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    fetchNotifications,
  } = useNotifications({
    autoFetch: true,
    filters,
  });

  const handleFilterChange = React.useCallback(
    (newFilters: { status?: NotificationStatus; type?: NotificationType }) => {
      setFilters(newFilters);
    },
    []
  );

  const handleMarkAsRead = React.useCallback(
    async (id: string) => {
      try {
        await markAsRead(id);
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error))
        trackException(errorObj, 3)
        trackTrace("Failed to mark notification as read", 3, {
          errorMessage: errorObj.message,
          notificationId: id,
        })
      }
    },
    [markAsRead]
  );

  const handleMarkAllAsRead = React.useCallback(async () => {
    try {
      await markAllAsRead();
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 3)
      trackTrace("Failed to mark all as read", 3, {
        errorMessage: errorObj.message,
      })
    }
  }, [markAllAsRead]);

  const handleDelete = React.useCallback(
    async (id: string) => {
      try {
        await deleteNotification(id);
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error))
        trackException(errorObj, 3)
        trackTrace("Failed to delete notification", 3, {
          errorMessage: errorObj.message,
          notificationId: id,
        })
      }
    },
    [deleteNotification]
  );

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <NotificationList
        notifications={notifications}
        unreadCount={unreadCount}
        isLoading={loading}
        onMarkAsRead={handleMarkAsRead}
        onMarkAllAsRead={handleMarkAllAsRead}
        onDelete={handleDelete}
        onFilterChange={handleFilterChange}
      />
    </div>
  );
}







