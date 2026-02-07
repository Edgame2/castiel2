FROM node:20-alpine
WORKDIR /app
COPY package.json ./
COPY containers/shared/package*.json ./containers/shared/
RUN npm install
COPY containers/quality-monitoring ./containers/quality-monitoring
COPY containers/shared ./containers/shared
WORKDIR /app/containers/shared
RUN npm install
RUN npm run build
WORKDIR /app/containers/quality-monitoring
RUN npm install --legacy-peer-deps
RUN npm run build
EXPOSE 3060
CMD ["npm", "start"]
