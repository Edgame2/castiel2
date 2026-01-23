FROM node:20-alpine

WORKDIR /app

COPY package.json ./
COPY containers/shared/package*.json ./containers/shared/
RUN npm install

COPY containers/pipeline-manager ./containers/pipeline-manager
COPY containers/shared ./containers/shared

WORKDIR /app/containers/shared
RUN npm run build

WORKDIR /app/containers/pipeline-manager
RUN npm run build

EXPOSE 3025

CMD ["npm", "start"]

