FROM node:20-alpine
WORKDIR /app
COPY package.json ./
COPY containers/shared/package*.json ./containers/shared/
RUN npm install
COPY containers/utility-services ./containers/utility-services
COPY containers/shared ./containers/shared
WORKDIR /app/containers/shared
RUN npm install
RUN npm run build
WORKDIR /app/containers/utility-services
RUN npm install --legacy-peer-deps
RUN npm run build && find dist -name '*.js' -exec sed -i "s|utils/logger'|utils/logger.js'|g; s|utils/logger\"|utils/logger.js\"|g" {} \;
EXPOSE 3061
CMD ["npm", "start"]
