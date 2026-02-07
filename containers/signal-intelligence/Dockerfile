FROM node:20-alpine
WORKDIR /app
COPY package.json ./
COPY tsconfig.json ./
COPY containers/shared/package*.json ./containers/shared/
RUN npm install
COPY containers/signal-intelligence ./containers/signal-intelligence
COPY containers/shared ./containers/shared
WORKDIR /app/containers/shared
RUN npm install
RUN npm run build
WORKDIR /app/containers/signal-intelligence
RUN npm install --legacy-peer-deps
RUN npm run build && find dist -name '*.js' -exec sed -i "s|utils/logger'|utils/logger.js'|g; s|utils/logger\"|utils/logger.js\"|g" {} \;
EXPOSE 3059
CMD ["npm", "start"]
