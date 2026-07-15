# TikTok Trend Extractor

CLI/API em Node.js + TypeScript para buscar posts do TikTok por keyword/hashtag via Apify, ranquear por métricas e exportar JSON/CSV.

## Requisitos
- Node.js 20+
- Token da Apify

## Setup
```bash
npm install
cp .env.example .env
# edite APIFY_API_TOKEN
```

## CLI
```bash
npm run dev -- search --keyword "receita fitness" --max 50 --sort playCount --format both --output output/results
npm run dev -- search --hashtag achadinhos fyp --max 100 --sort diggCount --min-views 100000 --format json --output output/tags
```

## API Web Service
### Rodar local
```bash
npm run dev:server
```

### Healthcheck
```bash
curl http://localhost:3000/health
```

### Executar extração por keyword
```bash
curl -X POST http://localhost:3000/run \
  -H "Content-Type: application/json" \
  -H "x-api-key: SUA_SERVICE_API_KEY" \
  -d '{
    "keyword": "receita fitness",
    "max": 20,
    "sort": "playCount",
    "minViews": 0,
    "format": "json",
    "output": "output/results"
  }'
```

### Executar extração por hashtag
```bash
curl -X POST http://localhost:3000/run \
  -H "Content-Type: application/json" \
  -H "x-api-key: SUA_SERVICE_API_KEY" \
  -d '{
    "hashtags": ["fyp", "trend"],
    "max": 20,
    "sort": "diggCount",
    "format": "both",
    "output": "output/results"
  }'
```

## Build
```bash
npm run build
npm start
```

## Render (Web Service)
- Build Command: `yarn && yarn build`
- Start Command: `node dist/server.js`
- Environment Variables:
  - `APIFY_API_TOKEN` (obrigatória)
  - `SERVICE_API_KEY` (recomendada)

## Docker
```bash
docker build -t tiktok-extractor .
docker run --rm --env-file .env -p 3000:3000 tiktok-extractor
```

## Testes
```bash
npm test
```
