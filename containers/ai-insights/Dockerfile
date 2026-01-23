FROM node:20-alpine

WORKDIR /app

COPY package.json ./
COPY containers/shared/package*.json ./containers/shared/
RUN npm install

COPY containers/ai-insights ./containers/ai-insights
COPY containers/shared ./containers/shared

WORKDIR /app/containers/shared
RUN npm run build

WORKDIR /app/containers/ai-insights
RUN npm run build

EXPOSE 3027

CMD ["npm", "start"]

