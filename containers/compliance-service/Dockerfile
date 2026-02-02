FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY containers/shared/package*.json ./containers/shared/
RUN npm install
COPY containers/compliance-service ./containers/compliance-service
COPY containers/shared ./containers/shared
# Build shared package first
WORKDIR /app/containers/shared
RUN npm install
RUN npm run build
# Build service
WORKDIR /app/containers/compliance-service
RUN npm install --legacy-peer-deps
RUN npm run build
EXPOSE 3043
CMD ["npm", "start"]

