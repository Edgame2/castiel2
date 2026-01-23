FROM node:20-alpine

WORKDIR /app

COPY package.json ./
COPY containers/shared/package*.json ./containers/shared/
RUN npm install

COPY containers/collaboration-service ./containers/collaboration-service
COPY containers/shared ./containers/shared

WORKDIR /app/containers/shared
RUN npm run build

WORKDIR /app/containers/collaboration-service
RUN npm run build

EXPOSE 3031

CMD ["npm", "start"]

