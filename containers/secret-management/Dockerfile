FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY containers/shared/package*.json ./containers/shared/

# Install dependencies
RUN npm install

# Copy source code
COPY containers/secret-management ./containers/secret-management
COPY containers/shared ./containers/shared

# Build shared package first
WORKDIR /app/containers/shared
RUN npm install
RUN npm run build

# Build service
WORKDIR /app/containers/secret-management
RUN npm install --legacy-peer-deps
RUN npm run build

# Expose port
EXPOSE 3003

# Start server
CMD ["npm", "start"]
