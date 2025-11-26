FROM node:20-slim

# Install Chromium
RUN apt-get update && apt-get install -y chromium fonts-liberation && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

EXPOSE 7860
CMD ["node", "dist/index.js"]