# Google Workspace Dashboard Widgets

This document describes the Google Workspace widgets available for use in Castiel dashboards.

## Overview

Google Workspace widgets allow you to display data from your connected Google Workspace account directly on your dashboards. These widgets provide real-time access to Gmail, Calendar, Drive, Contacts, and Tasks.

## Available Widgets

### 1. Gmail Inbox Widget

**Type**: `gmail_inbox`

**Description**: Displays unread emails from your Gmail account with quick actions to mark as read and open messages.

**Configuration**:
- `integrationId` (required): The ID of your Google Workspace integration
- `limit` (optional): Number of messages to display (default: 5)

**Features**:
- Shows unread message count
- Displays recent unread messages with sender, subject, and snippet
- Mark as read action
- Direct link to open message in Gmail
- Auto-refreshes every minute

**Example Configuration**:
```json
{
  "type": "gmail_inbox",
  "name": "My Gmail Inbox",
  "config": {
    "integrationId": "integration-123",
    "limit": 10
  }
}
```

### 2. Calendar Events Widget

**Type**: `calendar_events`

**Description**: Shows upcoming calendar events from your Google Calendar.

**Configuration**:
- `integrationId` (required): The ID of your Google Workspace integration
- `limit` (optional): Number of events to display (default: 10)
- `days` (optional): Number of days ahead to show events (default: 7)

**Features**:
- Displays upcoming events with time, title, and location
- Shows event attendees count
- Direct link to join Google Meet if available
- Add event button
- Auto-refreshes every 5 minutes

**Example Configuration**:
```json
{
  "type": "calendar_events",
  "name": "Upcoming Events",
  "config": {
    "integrationId": "integration-123",
    "limit": 10,
    "days": 7
  }
}
```

### 3. Drive Files Widget

**Type**: `drive_files`

**Description**: Lists recently modified files from your Google Drive.

**Configuration**:
- `integrationId` (required): The ID of your Google Workspace integration
- `limit` (optional): Number of files to display (default: 10)

**Features**:
- Shows recently modified files with icons
- Displays file size and modification time
- Direct link to open file in Drive
- Upload file button
- Auto-refreshes every 5 minutes

**Example Configuration**:
```json
{
  "type": "drive_files",
  "name": "Recent Files",
  "config": {
    "integrationId": "integration-123",
    "limit": 10
  }
}
```

### 4. Contacts Stats Widget

**Type**: `contacts_stats`

**Description**: Displays your Google Contacts summary with search functionality.

**Configuration**:
- `integrationId` (required): The ID of your Google Workspace integration
- `limit` (optional): Number of contacts to display (default: 5)

**Features**:
- Shows total contacts count
- Displays recent contacts with email, phone, and company
- Search functionality
- Add contact button
- Direct link to Google Contacts

**Example Configuration**:
```json
{
  "type": "contacts_stats",
  "name": "My Contacts",
  "config": {
    "integrationId": "integration-123",
    "limit": 5
  }
}
```

### 5. Tasks Summary Widget

**Type**: `tasks_summary`

**Description**: Shows a summary of your Google Tasks with counts by status.

**Configuration**:
- `integrationId` (required): The ID of your Google Workspace integration
- `tasklistId` (optional): Task list ID (default: '@default')

**Features**:
- Displays task counts (pending, completed, total)
- Shows recent tasks with due dates
- Add task button
- Direct link to Google Tasks
- Auto-refreshes every minute

**Example Configuration**:
```json
{
  "type": "tasks_summary",
  "name": "My Tasks",
  "config": {
    "integrationId": "integration-123",
    "tasklistId": "@default"
  }
}
```

## Setup

### Prerequisites

1. **Connect Google Workspace Integration**: 
   - Navigate to Settings > Integrations
   - Find "Google Workspace" and click "Connect"
   - Complete OAuth flow to authorize access

2. **Required Permissions**:
   - Gmail: Read, Send, Modify
   - Calendar: Read, Create/Update Events
   - Drive: Read, File Access
   - Contacts: Read, Write
   - Tasks: Read, Write

### Adding Widgets to Dashboard

1. Open your dashboard in edit mode
2. Click "Add Widget"
3. Select one of the Google Workspace widgets from the Integration category
4. Configure the widget:
   - Select your Google Workspace integration
   - Adjust display limits and other settings
5. Save the widget

## Widget Data Sources

All Google Workspace widgets use the integration data source type. The data is fetched from the Google Workspace API endpoints:

- **Gmail**: `/api/tenant/integrations/:id/widgets/gmail/inbox`
- **Calendar**: `/api/tenant/integrations/:id/widgets/calendar/upcoming`
- **Drive**: `/api/tenant/integrations/:id/widgets/drive/recent`
- **Contacts**: `/api/tenant/integrations/:id/widgets/contacts/stats`
- **Tasks**: `/api/tenant/integrations/:id/widgets/tasks/summary`

## Refresh Intervals

Widgets automatically refresh at different intervals:

- **Gmail Inbox**: Every 1 minute
- **Calendar Events**: Every 5 minutes
- **Drive Files**: Every 5 minutes
- **Contacts Stats**: On demand
- **Tasks Summary**: Every 1 minute

You can also manually refresh any widget by clicking the refresh button.

## Actions

### Gmail Inbox Widget

- **Mark as Read**: Click the checkmark icon to mark a message as read
- **Open in Gmail**: Click the external link icon to open the message in Gmail
- **Open Gmail**: Click the "Open Gmail" button at the bottom

### Calendar Events Widget

- **Join Meeting**: Click the external link icon if a Google Meet link is available
- **Open Calendar**: Click the "Open Calendar" button
- **Add Event**: Click the "+" button to create a new event

### Drive Files Widget

- **Open File**: Click the external link icon to open the file in Drive
- **Open Drive**: Click the "Open Drive" button
- **Upload File**: Click the upload icon to upload a new file

### Contacts Stats Widget

- **Search**: Type in the search box to filter contacts
- **Open Contacts**: Click the "Open Contacts" button
- **Add Contact**: Click the "+" button to add a new contact

### Tasks Summary Widget

- **Open Tasks**: Click the "Open Tasks" button
- **Add Task**: Click the "+" button to create a new task

## Error Handling

If a widget fails to load data, it will display an error message with a retry button. Common issues:

- **Connection Lost**: The OAuth token may have expired. Reconnect the integration.
- **Rate Limit**: Google API rate limits may be exceeded. Wait a few minutes and retry.
- **Permission Denied**: Ensure all required scopes are granted during OAuth.

## Best Practices

1. **Limit Widget Count**: Don't add too many widgets to a single dashboard as they all refresh independently
2. **Use Appropriate Limits**: Set reasonable limits for each widget to avoid performance issues
3. **Monitor Refresh Rates**: Be aware of API rate limits when using multiple widgets
4. **Secure Integration**: Keep your Google Workspace integration credentials secure

## Troubleshooting

### Widget Not Loading

1. Verify the integration is connected and active
2. Check that the `integrationId` in widget config matches your integration
3. Test the connection from the integration settings page
4. Check browser console for errors

### Data Not Updating

1. Click the refresh button manually
2. Check if the integration connection is still valid
3. Verify OAuth token hasn't expired
4. Check API rate limits

### Missing Permissions

1. Go to integration settings
2. Disconnect and reconnect the integration
3. Ensure all required scopes are granted during OAuth

## API Reference

For detailed API documentation, see:
- [Integration API Reference](../../integrations/SPECIFICATION.md)
- [Widget Data Service](../../../api/src/services/widget-data.service.ts)

## Support

For issues or questions:
- Check the [Integration Documentation](../../integrations/README.md)
- Review [Google Workspace Adapter Documentation](../../integrations/adapters/google-workspace.md)
- Contact support with integration ID and error details







