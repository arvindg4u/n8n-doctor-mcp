FROM oven/bun:1

WORKDIR /app

# Copy package files
COPY package.json ./
COPY bun.lockb* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Expose port
EXPOSE 7860

# Start server
CMD ["bun", "run", "src/index.ts"]
