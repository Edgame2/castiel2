FROM node:20-alpine

WORKDIR /app

COPY package.json ./
COPY containers/shared/package*.json ./containers/shared/
RUN npm install

COPY containers/adaptive-learning ./containers/adaptive-learning
COPY containers/shared ./containers/shared

WORKDIR /app/containers/shared
RUN npm install
RUN npm run build

WORKDIR /app/containers/adaptive-learning
RUN npm install --legacy-peer-deps
RUN npm run build

EXPOSE 3032

CMD ["npm", "start"]

