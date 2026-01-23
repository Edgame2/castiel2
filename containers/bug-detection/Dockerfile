FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY containers/shared/package*.json ./containers/shared/
RUN npm install
COPY containers/bug-detection ./containers/bug-detection
COPY containers/shared ./containers/shared
# Build shared package first
WORKDIR /app/containers/shared
RUN npm run build
# Build service
WORKDIR /app/containers/bug-detection
RUN npm run build
EXPOSE 3039
CMD ["npm", "start"]

