'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Bell,
  CheckCircle2,
  Slack,
  MessageSquare,
  Plus,
  Trash2,
  Send,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface NotificationChannel {
  id: string;
  type: 'slack' | 'teams';
  name: string;
  webhookUrl: string;
  enabled: boolean;
  events: string[];
}

interface NotificationTemplate {
  id: string;
  eventType: string;
  channel: 'slack' | 'teams';
  template: string;
}

const NOTIFICATION_EVENTS = [
  { value: 'project.shared', label: 'Project Shared' },
  { value: 'collaborator.added', label: 'Collaborator Added' },
  { value: 'shard.created', label: 'Shard Created' },
  { value: 'recommendation.ready', label: 'Recommendations Ready' },
  { value: 'activity.alert', label: 'Activity Alert' },
  { value: 'sync.completed', label: 'Sync Completed' },
  { value: 'sync.failed', label: 'Sync Failed' },
  { value: 'integration.error', label: 'Integration Error' },
];

export default function NotificationsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<NotificationChannel | null>(null);
  
  // Mock data - replace with actual API calls
  const [channels, setChannels] = useState<NotificationChannel[]>([
    {
      id: '1',
      type: 'slack',
      name: 'Engineering Team',
      webhookUrl: 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX',
      enabled: true,
      events: ['project.shared', 'collaborator.added', 'shard.created'],
    },
    {
      id: '2',
      type: 'teams',
      name: 'Product Team',
      webhookUrl: 'https://outlook.office.com/webhook/...',
      enabled: true,
      events: ['recommendation.ready', 'activity.alert'],
    },
  ]);

  const [newChannel, setNewChannel] = useState({
    type: 'slack' as 'slack' | 'teams',
    name: '',
    webhookUrl: '',
    events: [] as string[],
  });

  const handleAddChannel = () => {
    if (!newChannel.name || !newChannel.webhookUrl) {
      toast.error('Missing required fields', {
        description: 'Please provide a name and webhook URL',
      });
      return;
    }

    const channel: NotificationChannel = {
      id: Date.now().toString(),
      ...newChannel,
      enabled: true,
    };

    setChannels([...channels, channel]);
    setNewChannel({ type: 'slack', name: '', webhookUrl: '', events: [] });
    toast.success('Channel added', {
      description: `${channel.name} notification channel has been configured`,
    });
  };

  const handleToggleChannel = (channelId: string) => {
    setChannels(channels.map(ch => 
      ch.id === channelId ? { ...ch, enabled: !ch.enabled } : ch
    ));
    const channel = channels.find(ch => ch.id === channelId);
    toast.success(channel?.enabled ? 'Channel disabled' : 'Channel enabled');
  };

  const handleDeleteChannel = (channelId: string) => {
    setChannels(channels.filter(ch => ch.id !== channelId));
    toast.success('Channel deleted');
  };

  const handleTestNotification = async () => {
    if (!selectedChannel) return;

    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success('Test notification sent', {
        description: `Check ${selectedChannel.name} for the test message`,
      });
      setTestDialogOpen(false);
    } catch (error) {
      toast.error('Test failed', {
        description: 'Unable to send test notification',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEventToggle = (channelId: string, event: string) => {
    setChannels(channels.map(ch => {
      if (ch.id === channelId) {
        const events = ch.events.includes(event)
          ? ch.events.filter(e => e !== event)
          : [...ch.events, event];
        return { ...ch, events };
      }
      return ch;
    }));
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Notification Settings</h2>
        <p className="text-muted-foreground">
          Configure Slack and Teams notifications for integration events
        </p>
      </div>

      <Tabs defaultValue="channels" className="space-y-4">
        <TabsList>
          <TabsTrigger value="channels">Notification Channels</TabsTrigger>
          <TabsTrigger value="templates">Message Templates</TabsTrigger>
        </TabsList>

        {/* Channels Tab */}
        <TabsContent value="channels" className="space-y-4">
          {/* Add New Channel */}
          <Card>
            <CardHeader>
              <CardTitle>Add Notification Channel</CardTitle>
              <CardDescription>
                Configure Slack or Teams webhook for notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="type">Channel Type</Label>
                  <Select
                    value={newChannel.type}
                    onValueChange={(value: 'slack' | 'teams') => 
                      setNewChannel({ ...newChannel, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="slack">
                        <div className="flex items-center gap-2">
                          <Slack className="h-4 w-4" />
                          Slack
                        </div>
                      </SelectItem>
                      <SelectItem value="teams">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          Microsoft Teams
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Channel Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Engineering Team"
                    value={newChannel.name}
                    onChange={(e) => setNewChannel({ ...newChannel, name: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="webhookUrl">Webhook URL</Label>
                <Input
                  id="webhookUrl"
                  type="url"
                  placeholder="https://hooks.slack.com/services/..."
                  value={newChannel.webhookUrl}
                  onChange={(e) => setNewChannel({ ...newChannel, webhookUrl: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  {newChannel.type === 'slack' 
                    ? 'Get this from Slack Incoming Webhooks app' 
                    : 'Get this from Teams Incoming Webhook connector'}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Notification Events</Label>
                <div className="grid gap-2 md:grid-cols-2">
                  {NOTIFICATION_EVENTS.map(event => (
                    <div key={event.value} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`new-${event.value}`}
                        checked={newChannel.events.includes(event.value)}
                        onChange={(e) => {
                          const events = e.target.checked
                            ? [...newChannel.events, event.value]
                            : newChannel.events.filter(ev => ev !== event.value);
                          setNewChannel({ ...newChannel, events });
                        }}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor={`new-${event.value}`} className="text-sm font-normal cursor-pointer">
                        {event.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <Button onClick={handleAddChannel} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Channel
              </Button>
            </CardContent>
          </Card>

          {/* Existing Channels */}
          <div className="grid gap-4">
            {channels.map(channel => (
              <Card key={channel.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        channel.type === 'slack' ? 'bg-purple-500/10' : 'bg-blue-500/10'
                      }`}>
                        {channel.type === 'slack' ? (
                          <Slack className="h-5 w-5 text-purple-500" />
                        ) : (
                          <MessageSquare className="h-5 w-5 text-blue-500" />
                        )}
                      </div>
                      <div>
                        <CardTitle>{channel.name}</CardTitle>
                        <CardDescription>
                          {channel.type === 'slack' ? 'Slack' : 'Microsoft Teams'} • {channel.events.length} events
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={channel.enabled}
                        onCheckedChange={() => handleToggleChannel(channel.id)}
                      />
                      <Badge variant={channel.enabled ? 'default' : 'secondary'}>
                        {channel.enabled ? 'Active' : 'Disabled'}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Webhook URL</Label>
                    <div className="font-mono text-xs bg-muted p-2 rounded">
                      {channel.webhookUrl.slice(0, 50)}...
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Active Events</Label>
                    <div className="flex flex-wrap gap-2">
                      {channel.events.map(event => (
                        <Badge key={event} variant="outline">
                          {NOTIFICATION_EVENTS.find(e => e.value === event)?.label || event}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedChannel(channel);
                        setTestDialogOpen(true);
                      }}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Test Notification
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteChannel(channel.id)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {channels.length === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No notification channels</h3>
                  <p className="text-muted-foreground">
                    Add a Slack or Teams channel to receive notifications
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Message Templates</CardTitle>
              <CardDescription>
                Customize notification messages for different event types
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border rounded-lg bg-blue-500/5">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Templates are auto-managed</p>
                      <p className="text-sm text-muted-foreground">
                        The system uses optimized templates for each notification type. 
                        Event-specific formatting is handled automatically based on the 
                        Slack Block Kit and Teams MessageCard specifications.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Supported Event Types</h4>
                  <div className="grid gap-2">
                    {NOTIFICATION_EVENTS.map(event => (
                      <div key={event.value} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span className="font-medium">{event.label}</span>
                        </div>
                        <Badge variant="outline">Auto-formatted</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Test Notification Dialog */}
      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Test Notification</DialogTitle>
            <DialogDescription>
              Send a test message to {selectedChannel?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 border rounded-lg bg-muted">
              <p className="text-sm">
                A test notification will be sent to verify the webhook configuration. 
                Check your {selectedChannel?.type === 'slack' ? 'Slack' : 'Teams'} channel 
                to confirm delivery.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleTestNotification} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send Test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
