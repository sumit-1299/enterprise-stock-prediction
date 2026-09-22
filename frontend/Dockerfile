# ==============================================================================
# Production Dockerfile for React SPA Frontend
# ==============================================================================

# Stage 1: Build the React application
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies deterministically
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code and build
COPY . .

ARG VITE_API_BASE_URL=/api
ARG VITE_WS_BASE_URL=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_WS_BASE_URL=$VITE_WS_BASE_URL

RUN npm run build

# Stage 2: Serve static files with Nginx
FROM nginx:1.25-alpine AS runner

# Remove default nginx html
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy Nginx SPA configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

