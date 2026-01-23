FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY containers/shared/package*.json ./containers/shared/
RUN npm install
COPY containers/auth ./containers/auth
COPY containers/shared ./containers/shared
# Build shared package first
WORKDIR /app/containers/shared
RUN npm run build
# Build service
WORKDIR /app/containers/auth
RUN npm run build
EXPOSE 3021
CMD ["npm", "start"]

