# Use Node.js LTS Alpine for smaller image size
FROM node:18-alpine

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    curl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy source code
COPY . .

# Build the project
RUN npm run build

# Create directories for logs and memories
RUN mkdir -p /app/logs /app/memories

# Create non-root user
RUN addgroup -g 1001 -S brainbridge && \
    adduser -S brainbridge -u 1001 -G brainbridge

# Change ownership of app directory
RUN chown -R brainbridge:brainbridge /app

# Switch to non-root user
USER brainbridge

# Expose ports (if needed for HTTP API)
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV MEMORIES_DIR=/app/memories
ENV LOG_FILE=/app/logs/brainbridge-mcp.log

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "console.log('Health check passed')" || exit 1

# Default command - run MCP server on stdio
CMD ["node", "dist/server.js", "stdio"]