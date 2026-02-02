FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY containers/shared/package*.json ./containers/shared/
RUN npm install
COPY containers/validation-engine ./containers/validation-engine
COPY containers/shared ./containers/shared
# Build shared package first
WORKDIR /app/containers/shared
RUN npm install
RUN npm run build
# Build service
WORKDIR /app/containers/validation-engine
RUN npm install --legacy-peer-deps
RUN npm run build
EXPOSE 3036
CMD ["npm", "start"]

