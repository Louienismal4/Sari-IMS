# 1. Base stage
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# 2. Dependencies stage
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# 3. Development stage (Used by local docker-compose for hot reload)
FROM base AS dev
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=development
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "-H", "0.0.0.0"]

# 4. Builder stage (Used to compile Next.js standalone for production)
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NEXT_PUBLIC_API_URL=/api
RUN npm run build

# 5. Production runner stage (Default final stage for GitHub Actions / release images)
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
