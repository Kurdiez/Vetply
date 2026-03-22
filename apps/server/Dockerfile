FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update -y && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
ENV NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt
ENV SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt

COPY package.json yarn.lock ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/shared/dist ./packages/shared/dist

COPY apps/server/package.json ./apps/server/
COPY apps/server/dist ./apps/server/dist

RUN yarn install --production --frozen-lockfile --ignore-scripts

WORKDIR /app/apps/server

ENV ENVIRONMENT=development
ENV PORT=8080

EXPOSE 8080

CMD ["yarn", "start:prod"]