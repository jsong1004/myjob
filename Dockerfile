# ---- Build Stage ----
FROM node:18-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@8.6.12 --activate

# Set working directory
WORKDIR /app

# Accept build arguments for Firebase config
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID
ARG FIREBASE_SERVICE_ACCOUNT_KEY
ARG SERPAPI_KEY
ARG OPENROUTER_API_KEY

# Set environment variables for build
ENV NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID
ENV NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ENV NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ENV NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID
ENV FIREBASE_SERVICE_ACCOUNT_KEY=$FIREBASE_SERVICE_ACCOUNT_KEY
ENV SERPAPI_KEY=$SERPAPI_KEY
ENV OPENROUTER_API_KEY=$OPENROUTER_API_KEY

# Install dependencies (with cache optimization)
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy the rest of the app
COPY . .

# Build the Next.js app, passing the env var directly
# Note: NEXT_PUBLIC_ env vars will be set by Cloud Build
RUN IS_BUILDING=true pnpm build

# ---- Production Stage ----
FROM node:18-slim AS runner

# Set working directory
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@8.6.12 --activate

# Install dependencies for Puppeteer
RUN apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Tell Puppeteer to skip installing Chromium. We'll be using the installed version.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Copy package files first
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml

# Install only production dependencies
RUN pnpm install --prod --frozen-lockfile

# Copy built application and necessary files
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/postcss.config.mjs ./postcss.config.mjs
COPY --from=builder /app/tailwind.config.ts ./tailwind.config.ts
COPY --from=builder /app/app ./app
COPY --from=builder /app/components ./components
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/hooks ./hooks
COPY --from=builder /app/styles ./styles

# Use a non-root user for security
RUN groupadd --gid 1001 nodejs && useradd --uid 1001 --gid nodejs --shell /bin/bash --create-home nextjs
USER nextjs

# Expose port 3000
EXPOSE 3000

# Start the Next.js app
ENV NODE_ENV=production
CMD ["pnpm", "start"] 