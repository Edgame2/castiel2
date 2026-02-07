FROM node:20-alpine
WORKDIR /app
COPY package.json ./
COPY containers/shared/package*.json ./containers/shared/
RUN npm install
COPY containers/ai-conversation ./containers/ai-conversation
COPY containers/shared ./containers/shared
WORKDIR /app/containers/shared
RUN npm install
RUN npm run build
WORKDIR /app/containers/ai-conversation
RUN npm install --legacy-peer-deps
RUN npm run build
EXPOSE 3045
CMD ["npm", "start"]
