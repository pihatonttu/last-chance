# One container: the Node server serves the API, the WebSocket and the built client.
# The server runs TypeScript directly (Node 24 type stripping), so the workspace keeps
# its pnpm symlink layout; workspace packages must stay outside node_modules.

# ---- build ----
FROM node:24.13.0-bookworm-slim AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/ packages/
COPY apps/ apps/
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @saari/client build
# Drop dev dependencies (Vite, Vitest, TypeScript…) before copying to the runtime image.
RUN pnpm install --frozen-lockfile --prod

# ---- runtime ----
FROM node:24.13.0-bookworm-slim
ENV NODE_ENV=production \
    PORT=8080 \
    DATA_DIR=/data \
    STATIC_DIR=/app/apps/client/dist
WORKDIR /app
COPY --from=build --chown=node:node /app /app
RUN mkdir -p /data && chown node:node /data
USER node
EXPOSE 8080
# Short start interval: Traefik skips a container until it is healthy.
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --start-interval=2s \
  CMD node -e "fetch('http://127.0.0.1:8080/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/server/src/main.ts"]
