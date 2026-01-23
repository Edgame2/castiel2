'use client';

import { useGmailInbox, useCalendarEvents, useDriveFiles, useContacts, useTasks } from '@/hooks/use-google-workspace';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, Calendar, Folder, Users, CheckSquare, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

interface GoogleWorkspaceServiceStatusProps {
  integrationId: string;
}

export function GoogleWorkspaceServiceStatus({ integrationId }: GoogleWorkspaceServiceStatusProps) {
  const gmail = useGmailInbox(integrationId, { limit: 1 });
  const calendar = useCalendarEvents(integrationId, { limit: 1 });
  const drive = useDriveFiles(integrationId, { limit: 1 });
  const contacts = useContacts(integrationId, { limit: 1 });
  const tasks = useTasks(integrationId);

  const services = [
    {
      name: 'Gmail',
      icon: Mail,
      status: gmail.isLoading ? 'loading' : gmail.error ? 'error' : 'active',
      count: gmail.data?.unreadCount || 0,
      label: 'unread',
    },
    {
      name: 'Calendar',
      icon: Calendar,
      status: calendar.isLoading ? 'loading' : calendar.error ? 'error' : 'active',
      count: calendar.data?.events.length || 0,
      label: 'upcoming',
    },
    {
      name: 'Drive',
      icon: Folder,
      status: drive.isLoading ? 'loading' : drive.error ? 'error' : 'active',
      count: drive.data?.files.length || 0,
      label: 'recent',
    },
    {
      name: 'Contacts',
      icon: Users,
      status: contacts.isLoading ? 'loading' : contacts.error ? 'error' : 'active',
      count: contacts.data?.totalCount || 0,
      label: 'total',
    },
    {
      name: 'Tasks',
      icon: CheckSquare,
      status: tasks.isLoading ? 'loading' : tasks.error ? 'error' : 'active',
      count: tasks.data?.pendingCount || 0,
      label: 'pending',
    },
  ];

  return (
    <div className="grid grid-cols-5 gap-2 mt-4">
      {services.map((service) => {
        const Icon = service.icon;
        const StatusIcon =
          service.status === 'loading'
            ? Loader2
            : service.status === 'error'
              ? XCircle
              : CheckCircle2;

        return (
          <Card key={service.name} className="p-3">
            <CardContent className="p-0">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium">{service.name}</span>
                <StatusIcon
                  className={`h-3 w-3 ${
                    service.status === 'loading'
                      ? 'animate-spin text-muted-foreground'
                      : service.status === 'error'
                        ? 'text-destructive'
                        : 'text-green-500'
                  }`}
                />
              </div>
              <div className="text-lg font-bold">{service.count}</div>
              <div className="text-xs text-muted-foreground">{service.label}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}







