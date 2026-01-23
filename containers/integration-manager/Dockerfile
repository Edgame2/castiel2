FROM node:20-alpine

WORKDIR /app

COPY package.json ./
COPY containers/shared/package*.json ./containers/shared/
RUN npm install

COPY containers/integration-manager ./containers/integration-manager
COPY containers/shared ./containers/shared

WORKDIR /app/containers/shared
RUN npm run build

WORKDIR /app/containers/integration-manager
RUN npm run build

EXPOSE 3026

CMD ["npm", "start"]

