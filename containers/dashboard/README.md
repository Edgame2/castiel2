# Dashboard Service

Dashboard management service for Coder IDE.

## Features

- Dashboard CRUD operations
- Widget management
- Dashboard configuration
- Organization-scoped dashboards

## API Endpoints

- `GET /api/dashboards` - List dashboards
- `POST /api/dashboards` - Create dashboard
- `GET /api/dashboards/:id` - Get dashboard
- `PUT /api/dashboards/:id` - Update dashboard
- `DELETE /api/dashboards/:id` - Delete dashboard

## Environment Variables

- `PORT` - Server port (default: 3011)
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT secret for authentication

## Dependencies

- Shared library (`@coder/shared`)
