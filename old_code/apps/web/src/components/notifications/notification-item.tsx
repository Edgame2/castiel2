"use client";

import * as React from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info, Bell, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Notification } from "@/types/notification";
import { formatDistanceToNow } from "date-fns";

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead?: (id: string) => void;
  onDelete?: (id: string) => void;
  onClick?: (notification: Notification) => void;
}

const typeConfig = {
  success: {
    icon: CheckCircle2,
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
  },
  error: {
    icon: XCircle,
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
  },
  information: {
    icon: Info,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  alert: {
    icon: Bell,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
  },
};

export function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
  onClick,
}: NotificationItemProps) {
  const config = typeConfig[notification.type];
  const Icon = config.icon;

  const handleClick = () => {
    if (onClick) {
      onClick(notification);
    }
    if (notification.status === 'unread' && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(notification.id);
    }
  };

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-4 rounded-lg border transition-colors cursor-pointer",
        notification.status === 'unread' 
          ? `${config.bgColor} ${config.borderColor} border-l-4` 
          : "bg-white border-gray-200 hover:bg-gray-50",
        onClick && "hover:shadow-sm"
      )}
      onClick={handleClick}
    >
      <div className={cn("flex-shrink-0 mt-0.5", config.color)}>
        <Icon className="h-5 w-5" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-gray-900 mb-1">
              {notification.name}
            </h4>
            <p className="text-sm text-gray-600 mb-2">
              {notification.content}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
              </span>
              {notification.priority && (
                <Badge variant="outline" className="text-xs">
                  {notification.priority}
                </Badge>
              )}
              {notification.status === 'unread' && (
                <Badge variant="default" className="text-xs">
                  New
                </Badge>
              )}
            </div>
            {notification.link && (
              <Button
                variant="link"
                size="sm"
                className="mt-2 h-auto p-0 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = notification.link!;
                }}
              >
                View Details →
              </Button>
            )}
          </div>

          <div className="flex items-center gap-1">
            {notification.status === 'unread' && onMarkAsRead && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkAsRead(notification.id);
                }}
                title="Mark as read"
              >
                <CheckCircle2 className="h-4 w-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-gray-400 hover:text-red-600"
                onClick={handleDelete}
                title="Delete"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}







