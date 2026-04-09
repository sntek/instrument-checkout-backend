FROM node:20-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
RUN npm install -g pnpm@8.15.4
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Build the app
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone build — this includes its own server.js
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/schema.sql ./schema.sql
COPY --from=builder /app/cron.mjs ./cron.mjs

USER nextjs

EXPOSE 3000

# Run the built-in standalone server
CMD ["node", "server.js"]
