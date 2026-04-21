# Use Node.js 18 LTS as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies for building
RUN apk add --no-cache python3 make g++

# Copy package files
COPY backend/package*.json ./

# Install backend dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy backend source code
COPY backend/ ./

# Copy frontend files
COPY frontend/ ./public/

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nutrix -u 1001

# Change ownership of app directory
RUN chown -R nutrix:nodejs /app

# Switch to non-root user
USER nutrix

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Start the application
CMD ["npm", "start"]
