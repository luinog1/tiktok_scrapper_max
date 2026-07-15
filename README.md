# TikTok Trend Extractor

CLI em Node.js + TypeScript para buscar posts do TikTok por keyword/hashtag via Apify, ranquear por métricas e exportar JSON/CSV.

## Requisitos
- Node.js 20+
- Token da Apify

## Setup
```bash
npm install
cp .env.example .env
# edite APIFY_API_TOKEN
```

## Uso
```bash
npm run dev -- search --keyword "receita fitness" --max 50 --sort playCount --format both --output output/results

npm run dev -- search --hashtag achadinhos fyp --max 100 --sort diggCount --min-views 100000 --format json --output output/tags
```

## Build
```bash
npm run build
node dist/cli.js search --keyword "maquiagem" --max 30
```

## Docker
```bash
docker build -t tiktok-extractor .
docker run --rm --env-file .env -v $(pwd)/output:/app/output tiktok-extractor search --keyword "receita fitness" --max 20 --format both --output output/results
```

## Docker Compose
```bash
docker compose up --build
```

## Testes
```bash
npm test
```
