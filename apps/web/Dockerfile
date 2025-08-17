# Use the official Node.js image as base
FROM node:22-alpine AS base

# Enable corepack for pnpm
RUN corepack enable

FROM base AS builder
RUN apk update
RUN apk add --no-cache libc6-compat

# Set working directory
WORKDIR /app

# Install turbo globally
RUN npm i -g turbo@^2.5.4

# Copy the entire monorepo
COPY . .

# Generate a partial monorepo with a pruned lockfile for the web app
# This creates out/json/ (package.json files) and out/full/ (source code)
RUN turbo prune web --docker

# Install dependencies for the pruned workspace
FROM base AS installer
RUN apk update
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy the pruned workspace package.json files and lockfile
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml

# Install dependencies using the pruned lockfile
RUN pnpm install --frozen-lockfile

# Copy the pruned source code and build
COPY --from=builder /app/out/full/ .

# Build the web application
RUN pnpm turbo build --filter=web

# Production stage with nginx
FROM nginx:alpine AS runner

# Copy custom nginx config
COPY --from=installer /app/apps/web/nginx/default.conf /etc/nginx/conf.d/default.conf

# Copy built application from installer stage
COPY --from=installer /app/apps/web/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
