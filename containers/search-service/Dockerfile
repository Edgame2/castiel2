FROM node:20-alpine

WORKDIR /app

COPY package.json ./
COPY containers/shared/package*.json ./containers/shared/
RUN npm install

COPY containers/search-service ./containers/search-service
COPY containers/shared ./containers/shared

WORKDIR /app/containers/shared
RUN npm run build

WORKDIR /app/containers/search-service
RUN npm run build

EXPOSE 3029

CMD ["npm", "start"]

