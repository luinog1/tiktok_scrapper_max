FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=base /app/package*.json ./
RUN npm install --omit=dev
COPY --from=base /app/dist ./dist
COPY --from=base /app/.env.example ./.env.example
ENTRYPOINT ["node", "dist/cli.js"]
