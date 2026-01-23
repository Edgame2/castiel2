FROM node:20-alpine

WORKDIR /app

COPY package.json ./
COPY containers/shared/package*.json ./containers/shared/
RUN npm install

COPY containers/prompt-service ./containers/prompt-service
COPY containers/shared ./containers/shared

WORKDIR /app/containers/shared
RUN npm run build

WORKDIR /app/containers/prompt-service
RUN npm run build

EXPOSE 3036

CMD ["npm", "start"]

