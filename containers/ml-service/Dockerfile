FROM node:20-alpine

WORKDIR /app

COPY package.json ./
COPY containers/shared/package*.json ./containers/shared/
RUN npm install

COPY containers/ml-service ./containers/ml-service
COPY containers/shared ./containers/shared

WORKDIR /app/containers/shared
RUN npm install
RUN npm run build

WORKDIR /app/containers/ml-service
RUN npm install --legacy-peer-deps
RUN npm run build

EXPOSE 3033

CMD ["npm", "start"]

