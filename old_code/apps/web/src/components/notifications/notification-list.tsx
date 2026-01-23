"use client";

import * as React from "react";
import { Bell, CheckCheck, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NotificationItem } from "./notification-item";
import type { Notification, NotificationType, NotificationStatus } from "@/types/notification";

interface NotificationListProps {
  notifications: Notification[];
  unreadCount: number;
  isLoading?: boolean;
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  onDelete?: (id: string) => void;
  onFilterChange?: (filters: { status?: NotificationStatus; type?: NotificationType }) => void;
}

export function NotificationList({
  notifications,
  unreadCount,
  isLoading = false,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onFilterChange,
}: NotificationListProps) {
  const [statusFilter, setStatusFilter] = React.useState<NotificationStatus | "all">("all");
  const [typeFilter, setTypeFilter] = React.useState<NotificationType | "all">("all");

  const handleStatusFilterChange = (value: string) => {
    const newStatus = value === "all" ? undefined : (value as NotificationStatus);
    setStatusFilter(value as NotificationStatus | "all");
    onFilterChange?.({ status: newStatus, type: typeFilter === "all" ? undefined : typeFilter });
  };

  const handleTypeFilterChange = (value: string) => {
    const newType = value === "all" ? undefined : (value as NotificationType);
    setTypeFilter(value as NotificationType | "all");
    onFilterChange?.({ status: statusFilter === "all" ? undefined : statusFilter, type: newType });
  };

  const clearFilters = () => {
    setStatusFilter("all");
    setTypeFilter("all");
    onFilterChange?.({});
  };

  const hasActiveFilters = statusFilter !== "all" || typeFilter !== "all";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-gray-500 mt-1">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}` : "All caught up!"}
          </p>
        </div>
        {unreadCount > 0 && onMarkAllAsRead && (
          <Button onClick={onMarkAllAsRead} variant="outline" size="sm">
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark all as read
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="unread">Unread</SelectItem>
            <SelectItem value="read">Read</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={handleTypeFilterChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="information">Information</SelectItem>
            <SelectItem value="alert">Alert</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-2" />
            Clear filters
          </Button>
        )}
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <div className="p-8 text-center">
          <p className="text-sm text-gray-500">Loading notifications...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="p-12 text-center border rounded-lg">
          <Bell className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No notifications</h3>
          <p className="text-sm text-gray-500">
            {hasActiveFilters
              ? "No notifications match your filters"
              : "You're all caught up! No new notifications."}
          </p>
        </div>
      ) : (
        <ScrollArea className="h-[600px]">
          <div className="space-y-2">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={onMarkAsRead}
                onDelete={onDelete}
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}







