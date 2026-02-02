# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
WORKDIR /app

# Install deps first for better layer caching
COPY package.json ./
RUN npm install

COPY src ./src
COPY public ./public
COPY schema.sql ./schema.sql
COPY README.md ./README.md

EXPOSE 3000

# Dev image (includes devDependencies)
FROM base AS dev
ENV NODE_ENV=development
CMD ["npm", "run", "dev"]

# Production image (omit devDependencies)
FROM node:20-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production

COPY package.json ./
RUN npm install --omit=dev

COPY src ./src
COPY public ./public

EXPOSE 3000
CMD ["node", "src/server.js"]

