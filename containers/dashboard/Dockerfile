FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY containers/shared/package*.json ./containers/shared/
RUN npm install
COPY containers/dashboard ./containers/dashboard
COPY containers/shared ./containers/shared
# Build shared package first
WORKDIR /app/containers/shared
RUN npm run build
# Build service
WORKDIR /app/containers/dashboard
RUN npm run build
EXPOSE 3011
CMD ["npm", "start"]
