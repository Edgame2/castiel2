FROM node:20-alpine

WORKDIR /app

COPY package.json ./
COPY containers/shared/package*.json ./containers/shared/
RUN npm install

COPY containers/configuration-service ./containers/configuration-service
COPY containers/shared ./containers/shared

WORKDIR /app/containers/shared
RUN npm run build

WORKDIR /app/containers/configuration-service
RUN npm run build

EXPOSE 3034

CMD ["npm", "start"]

