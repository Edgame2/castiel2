FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY containers/shared/package*.json ./containers/shared/
RUN npm install
COPY containers/reasoning-engine ./containers/reasoning-engine
COPY containers/shared ./containers/shared
# Build shared package first
WORKDIR /app/containers/shared
RUN npm install
RUN npm run build
# Build service
WORKDIR /app/containers/reasoning-engine
RUN npm install --legacy-peer-deps
RUN npm run build
EXPOSE 3045
CMD ["npm", "start"]

