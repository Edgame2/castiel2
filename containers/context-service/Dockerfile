FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
COPY containers/shared/package*.json ./containers/shared/
RUN npm install
COPY containers/context-service ./containers/context-service
COPY containers/shared ./containers/shared
# Build shared package first
WORKDIR /app/containers/shared
RUN npm install
RUN npm run build
# Build service
WORKDIR /app/containers/context-service
RUN npm install --legacy-peer-deps
RUN npm run build
EXPOSE 3034
CMD ["npm", "start"]

