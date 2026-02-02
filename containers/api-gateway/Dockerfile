# Build from repo root: context . and dockerfile containers/api-gateway/Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY containers/shared/package*.json ./containers/shared/
RUN npm install
COPY containers/api-gateway ./containers/api-gateway
COPY containers/shared ./containers/shared
WORKDIR /app/containers/shared
RUN npm install
RUN npm run build
WORKDIR /app/containers/api-gateway
RUN npm install --legacy-peer-deps
RUN npm run build
EXPOSE 3001
CMD ["npm", "start"]
