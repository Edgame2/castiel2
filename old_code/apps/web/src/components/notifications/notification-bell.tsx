"use client";

import * as React from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface NotificationBellProps {
  unreadCount: number;
  onClick?: () => void;
  className?: string;
}

export function NotificationBell({
  unreadCount,
  onClick,
  className,
}: NotificationBellProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("relative", className)}
      onClick={onClick}
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs font-semibold rounded-full"
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </Badge>
      )}
    </Button>
  );
}







