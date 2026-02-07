# Build from repo root: context . and dockerfile containers/integration-processors/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY containers/shared/package*.json ./containers/shared/
RUN npm install
COPY containers/integration-processors ./containers/integration-processors
COPY containers/shared ./containers/shared
WORKDIR /app/containers/shared
RUN npm install
RUN npm run build
WORKDIR /app/containers/integration-processors
RUN npm install --legacy-peer-deps
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/containers/integration-processors/dist ./containers/integration-processors/dist
COPY --from=builder /app/containers/integration-processors/config ./containers/integration-processors/config
COPY --from=builder /app/containers/integration-processors/node_modules ./containers/integration-processors/node_modules
COPY --from=builder /app/containers/integration-processors/package.json ./containers/integration-processors/
COPY --from=builder /app/containers/shared ./containers/shared
WORKDIR /app/containers/integration-processors
EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000
ENV CONSUMER_TYPE=all

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["node", "dist/index.js"]
