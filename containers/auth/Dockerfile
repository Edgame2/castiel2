# Build from repo root: docker build -f containers/auth/Dockerfile -t auth .
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY containers/shared/package*.json ./containers/shared/
RUN npm install
COPY containers/auth ./containers/auth
COPY containers/shared ./containers/shared
# Build shared package first
WORKDIR /app/containers/shared
RUN npm install
RUN npm run build
WORKDIR /app/containers/auth
RUN npm install --legacy-peer-deps
RUN npm run build
EXPOSE 3021
CMD ["npm", "start"]

