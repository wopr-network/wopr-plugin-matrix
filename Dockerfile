FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY dist ./dist

ENV NODE_ENV=production

RUN groupadd --gid 1001 wopr && useradd --uid 1001 --gid wopr --shell /bin/sh --create-home wopr
USER wopr

CMD ["node", "dist/index.js"]
