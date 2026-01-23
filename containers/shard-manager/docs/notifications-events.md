# Shard Manager Module - Notifications Events

## Overview

This document describes all events published by the Shard Manager module that trigger notifications to users via the Notification service.

## Published Events

The Shard Manager module does not currently publish events that trigger user notifications. All events are for audit logging purposes only.

## Future Considerations

If notification support is added in the future, potential notification events could include:

- `shard.bulk_operation.completed` - Notify user when bulk operation completes
- `shard.relationship.suggested` - Notify user about suggested relationships
- `shard.type.migration.completed` - Notify user when ShardType migration completes

## Consumed Events

The Shard Manager module does not consume events from other modules. It only publishes events.

