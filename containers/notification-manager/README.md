# Notification Manager Service

Multi-channel notification service for Castiel. Consumes events from RabbitMQ and creates notifications.

## Features

- Consumes all events from RabbitMQ
- Creates notifications based on event types (see `src/consumers/eventMapper.ts`)
- User and organization-scoped notifications
- **BI/risk (Plan §7.2):** `anomaly.detected` → in-app (and email for high severity). Payload must include `tenantId` and `ownerId` (opportunity OwnerId) for a notification to be created; otherwise the event is skipped.
- Mark as read/unread
- Delete notifications

## API Endpoints

- `GET /api/notifications` - Get notifications
- `PUT /api/notifications/:id/read` - Mark notification as read
- `PUT /api/notifications/read-all` - Mark all notifications as read
- `DELETE /api/notifications/:id` - Delete notification

## Environment Variables

### Server Configuration
- `PORT` - Server port (default: 3001)
- `DATABASE_URL` - PostgreSQL connection string
- `RABBITMQ_URL` - RabbitMQ connection string
- `JWT_SECRET` - JWT secret for authentication
- `APP_URL` or `MAIN_APP_URL` - Main application URL for email links (default: http://localhost:3000)

### Email Configuration
- `EMAIL_ENABLED` - Enable/disable email sending (default: true)
- `EMAIL_PROVIDER` - Email provider: `sendgrid`, `smtp`, or `ses` (default: smtp)
- `EMAIL_FROM` or `EMAIL_FROM_ADDRESS` - Sender email address (default: noreply@castiel)
- `EMAIL_FROM_NAME` - Sender name (default: Castiel)

### SendGrid Configuration (if using SendGrid)
- `SENDGRID_API_KEY` - SendGrid API key

### SMTP Configuration (if using SMTP)
- `SMTP_HOST` - SMTP server hostname
- `SMTP_PORT` - SMTP server port (default: 587)
- `SMTP_SECURE` - Use TLS/SSL (default: false, set to true for port 465)
- `SMTP_USER` - SMTP username (optional)
- `SMTP_PASSWORD` - SMTP password (optional)

### AWS SES Configuration (if using SES)
- `AWS_SES_REGION` - AWS SES region (default: us-east-1)
- `AWS_ACCESS_KEY_ID` - AWS access key ID
- `AWS_SECRET_ACCESS_KEY` - AWS secret access key
