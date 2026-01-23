FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY containers/shared/package*.json ./containers/shared/
RUN npm install
COPY containers/user-management ./containers/user-management
COPY containers/shared ./containers/shared
# Build shared package first
WORKDIR /app/containers/shared
RUN npm run build
# Build service
WORKDIR /app/containers/user-management
RUN npm run build
EXPOSE 3022
CMD ["npm", "start"]

