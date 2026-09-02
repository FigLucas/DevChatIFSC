FROM node:22-alpine AS dependencies
WORKDIR /app
RUN chown node:node /app
COPY --chown=node:node package*.json ./
USER node
RUN npm ci

FROM dependencies AS development
COPY --chown=node:node . .
CMD ["npx", "vite", "--host", "0.0.0.0"]

FROM development AS build
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.28-alpine AS production
COPY --chown=101:101 frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build --chown=101:101 /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
