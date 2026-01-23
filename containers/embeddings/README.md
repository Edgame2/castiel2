# Embeddings Service

Vector embeddings service for Coder IDE. Stores and searches code embeddings using pgvector.

## Features

- Store and update embeddings
- Batch operations
- Semantic similarity search
- Project-scoped embeddings

## API Endpoints

- `POST /api/embeddings` - Store embedding
- `POST /api/embeddings/batch` - Store multiple embeddings
- `GET /api/embeddings/:id` - Get embedding
- `POST /api/embeddings/search` - Search similar embeddings
- `DELETE /api/embeddings/:id` - Delete embedding
- `DELETE /api/embeddings/project/:projectId` - Delete all project embeddings

## Environment Variables

- `PORT` - Server port (default: 3005)
- `DATABASE_URL` - PostgreSQL connection string (with pgvector extension)
- `JWT_SECRET` - JWT secret for authentication

## Notes

- Requires pgvector PostgreSQL extension for production use
- Current implementation uses simplified cosine similarity calculation
- For production, use pgvector's built-in similarity functions
