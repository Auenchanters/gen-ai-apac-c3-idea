# syntax=docker/dockerfile:1.7

ARG NODE_IMAGE=node:22.22.2-bookworm-slim@sha256:9f6d5975c7dca860947d3915877f85607946403fc55349f39b4bc3688448bb6e

FROM ${NODE_IMAGE} AS dependencies
WORKDIR /workspace
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

FROM dependencies AS build
COPY . .
RUN npm run build

FROM ${NODE_IMAGE} AS production-dependencies
ENV NODE_ENV=production
WORKDIR /app
COPY --chown=node:node package.json package-lock.json ./
RUN chown node:node /app
USER node
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force --loglevel=error

FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production \
    PORT=8080
WORKDIR /app
COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json ./package.json
COPY --from=build --chown=node:node /workspace/dist ./dist
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:8080/healthz').then((response)=>{if(!response.ok)process.exit(1)}).catch(()=>process.exit(1))"]
CMD ["node", "dist/server/index.js"]
