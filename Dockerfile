# Stage 1: Build Go microservice
FROM golang:1.21-alpine AS go-builder

WORKDIR /build

# Copy Go module files
COPY microservice/go.mod microservice/go.sum ./
RUN go mod download

# Copy Go source
COPY microservice/ ./

# Build Go binary
RUN CGO_ENABLED=0 GOOS=linux go build -o /bin/microservice -ldflags="-s -w" .

# Stage 2: Build Node.js bot
FROM node:22-alpine AS node-builder

WORKDIR /build

# Install build dependencies (for native modules)
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy TypeScript source
COPY tsconfig.json ./
COPY src/ ./src/

# Install TypeScript for building
RUN npm install -D typescript

# Build TypeScript
RUN npm run build

# Stage 3: Runtime image
FROM node:22-alpine

# Install runtime dependencies
RUN apk add --no-cache \
    ffmpeg \
    python3 \
    ca-certificates \
    tzdata

# Install yt-dlp (más actualizado que youtube-dl)
RUN wget https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -O /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

# Create app directory
WORKDIR /app

# Copy Go microservice binary
COPY --from=go-builder /bin/microservice /app/microservice

# Copy Node.js app
COPY --from=node-builder /build/node_modules ./node_modules
COPY --from=node-builder /build/dist ./dist
COPY --from=node-builder /build/package*.json ./

# Copy startup script
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Expose ports (if needed for OAuth)
EXPOSE 3000 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Run both services
ENTRYPOINT ["./docker-entrypoint.sh"]
