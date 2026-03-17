FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (use npm install in case package-lock.json is missing)
RUN npm install --production --no-audit --no-fund

# Copy server code
COPY server.js ./

# Run as non-root user
USER node

# Start MCP server
CMD ["node", "server.js"]
