FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY containers/shared/package*.json ./containers/shared/

# Install dependencies
RUN npm install

# Copy source code
COPY containers/ai-service ./containers/ai-service
COPY containers/shared ./containers/shared

# Build shared package first
WORKDIR /app/containers/shared
RUN npm run build

# Build service
WORKDIR /app/containers/ai-service
RUN npm run build

# Expose port
EXPOSE 3006

# Start server
CMD ["npm", "start"]
