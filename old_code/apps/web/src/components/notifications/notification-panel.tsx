"use client";

import * as React from "react";
import { Bell, CheckCheck, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NotificationItem } from "./notification-item";
import type { Notification } from "@/types/notification";
import { useRouter } from "next/navigation";

interface NotificationPanelProps {
  notifications: Notification[];
  unreadCount: number;
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  onDelete?: (id: string) => void;
  isLoading?: boolean;
}

export function NotificationPanel({
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  isLoading = false,
}: NotificationPanelProps) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  const handleNotificationClick = (notification: Notification) => {
    if (notification.link) {
      router.push(notification.link);
    }
    setOpen(false);
  };

  const recentNotifications = notifications.slice(0, 10);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center bg-red-500 text-white text-xs font-semibold rounded-full">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unreadCount > 0 && onMarkAllAsRead && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMarkAllAsRead}
              className="h-8 text-xs"
            >
              <CheckCheck className="h-4 w-4 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-gray-500">
              Loading notifications...
            </div>
          ) : recentNotifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-12 w-12 mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">No notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {recentNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={onMarkAsRead}
                  onDelete={onDelete}
                  onClick={handleNotificationClick}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 10 && (
          <div className="p-3 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                router.push("/notifications");
                setOpen(false);
              }}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View all notifications
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}







