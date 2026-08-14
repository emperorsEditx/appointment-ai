FROM node:24-alpine AS builder
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace files and install
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY prisma ./prisma
COPY apps ./apps

RUN pnpm install --frozen-lockfile --prefer-offline
RUN pnpm --filter api build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy built app and node_modules
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY apps/api/package.json ./package.json

EXPOSE 3001
CMD ["node", "dist/main"]
