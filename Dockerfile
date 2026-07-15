FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN yarn install --frozen-lockfile || yarn install
COPY . .
RUN yarn build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=base /app/package*.json ./
RUN yarn install --production --frozen-lockfile || yarn install --production
COPY --from=base /app/dist ./dist
# Serve o servidor Express (não o CLI)
EXPOSE 3000
CMD ["node", "dist/server.js"]
