FROM node:22-alpine
WORKDIR /app
RUN chown -R node:node /app
COPY --chown=node:node package*.json ./
USER node
RUN npm ci
COPY --chown=node:node . .
RUN npm run build
EXPOSE 3000
CMD ["npx", "vite", "preview", "--port", "3000", "--host"]
