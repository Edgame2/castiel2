FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY containers/shared/package*.json ./containers/shared/
RUN npm install
COPY containers/dashboard ./containers/dashboard
COPY containers/shared ./containers/shared
# Build shared package first
WORKDIR /app/containers/shared
RUN npm install
RUN npm run build
# Build service
WORKDIR /app/containers/dashboard
RUN sed -i 's|"@coder/shared": "workspace:\*"|"@coder/shared": "file:../shared"|' package.json
RUN npm install --legacy-peer-deps
RUN npm run build
EXPOSE 3011
CMD ["npm", "start"]
