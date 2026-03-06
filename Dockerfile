FROM node:20-slim

# Install Chromium and required libs
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    qpdf \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Skip bundled Chromium download, use system one
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Copy standalone output + static/public assets
RUN cp -r .next/standalone/. /app/standalone/ \
    && cp -r .next/static /app/standalone/.next/static \
    && cp -r public /app/standalone/public 2>/dev/null || true

# Copy automation script to standalone
RUN cp -r scripts /app/standalone/scripts 2>/dev/null || true

# Create uploads directory for Railway Volume mount
RUN mkdir -p /data/uploads

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

WORKDIR /app/standalone
CMD ["node", "server.js"]
