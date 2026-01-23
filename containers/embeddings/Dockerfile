FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY containers/shared/package*.json ./containers/shared/

# Install dependencies
RUN npm install

# Copy source code
COPY containers/embeddings ./containers/embeddings
COPY containers/shared ./containers/shared

# Build shared package first
WORKDIR /app/containers/shared
RUN npm run build

# Build service
WORKDIR /app/containers/embeddings
RUN npm run build

# Expose port
EXPOSE 3005

# Start server
CMD ["npm", "start"]
