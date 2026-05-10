FROM node:26-slim AS builder

WORKDIR /app
COPY package*.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
COPY packages/client/package.json packages/client/

RUN npm ci

COPY tsconfig.base.json ./
COPY packages/shared/ packages/shared/
COPY packages/server/ packages/server/
COPY packages/client/ packages/client/

# Build client
WORKDIR /app/packages/client
RUN npx vite build

# Production image
FROM node:26-slim

WORKDIR /app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/packages/shared/package.json packages/shared/
COPY --from=builder /app/packages/server/package.json packages/server/

COPY --from=builder /app/node_modules/ node_modules/
COPY --from=builder /app/packages/shared/ packages/shared/
COPY --from=builder /app/packages/server/ packages/server/
COPY --from=builder /app/packages/client/dist/ packages/client/dist/

ENV NODE_ENV=production
ENV PORT=3000
ENV CLIENT_DIR=/app/packages/client/dist

EXPOSE 3000

CMD ["node", "--import", "tsx", "packages/server/src/server.ts"]
