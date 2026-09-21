# API de Casa Cruz OS — imagen autocontenida para desplegar en cualquier servidor.
# Se construye desde la raíz del monorepo:
#   docker build -f apps/api/Dockerfile -t casacruz-api .

FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS build
COPY pnpm-workspace.yaml package.json .npmrc ./
COPY packages/core/package.json packages/core/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile=false --filter @casacruz/api...
COPY packages/core packages/core
COPY apps/api apps/api
RUN pnpm --filter @casacruz/api generate && pnpm --filter @casacruz/api build

FROM base AS deps
COPY pnpm-workspace.yaml package.json .npmrc ./
COPY apps/api/package.json apps/api/
RUN pnpm install --prod --filter @casacruz/api --ignore-workspace

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /repo/apps/api/node_modules ./node_modules
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/prisma ./prisma
EXPOSE 4000
CMD ["node", "dist/server.js"]
