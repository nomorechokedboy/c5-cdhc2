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
RUN turbo prune sms-web --docker

# Install dependencies for the pruned workspace
FROM base AS installer
RUN apk update
RUN apk add --no-cache libc6-compat
WORKDIR /app

ARG VITE_APP_TITLE
ARG VITE_CLIENT_ID
ARG VITE_OAUTH2_URL
ARG VITE_TOKEN_URI
ARG VITE_REDIRECT_URI
ARG VITE_API_URL

ENV VITE_APP_TITLE=$VITE_APP_TITLE
ENV VITE_CLIENT_ID=$VITE_CLIENT_ID
ENV VITE_OAUTH2_URL=$VITE_OAUTH2_URL
ENV VITE_TOKEN_URI=$VITE_TOKEN_URI
ENV VITE_REDIRECT_URI=$VITE_REDIRECT_URI
ENV VITE_API_URL=$VITE_API_URL

# RUN echo "BUILD WITH OAUTH2=$VITE_OAUTH2_URL API=$VITE_API_URL"

# Copy the pruned workspace package.json files and lockfile
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml

# Install dependencies using the pruned lockfile
RUN pnpm install --frozen-lockfile

# Copy the pruned source code and build
COPY --from=builder /app/out/full/ .

# Build the web application
RUN pnpm turbo build --filter=sms-web

# Production stage with nginx
FROM nginx:alpine AS runner

# Copy built application from installer stage
COPY --from=installer /app/apps/sms-web/dist /usr/share/nginx/html

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

