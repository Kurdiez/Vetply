# Vetply BullMQ worker image with Chromium + OS libs for Covetrus scraping.
# Bump PLAYWRIGHT_DOCKER_TAG when apps/server yarn.lock playwright version changes.
ARG PLAYWRIGHT_DOCKER_TAG=v1.59.1-noble
FROM mcr.microsoft.com/playwright:${PLAYWRIGHT_DOCKER_TAG}

USER root

WORKDIR /app

RUN corepack enable && corepack prepare yarn@1.22.22 --activate

COPY package.json yarn.lock ./
COPY packages/shared ./packages/shared
COPY apps/server ./apps/server
COPY apps/web/package.json ./apps/web/package.json

RUN yarn install --frozen-lockfile --ignore-scripts

RUN yarn workspace @vetply/shared build
RUN yarn --cwd apps/server build
RUN yarn workspace @vetply/server playwright install chromium

ENV SERVER_TYPE=worker
WORKDIR /app/apps/server

EXPOSE 8080

CMD ["node", "--max-old-space-size=8192", "dist/main.js"]
