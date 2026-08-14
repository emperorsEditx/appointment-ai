FROM node:24-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY apps ./apps
COPY prisma ./prisma

RUN pnpm install --frozen-lockfile --prefer-offline
RUN pnpm --filter web build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/apps/web/.next ./.next
COPY --from=builder /app/apps/web/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY apps/web/package.json ./package.json

EXPOSE 3000
CMD ["pnpm", "--filter", "web", "start"]
