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

## Filtro Brasil 🇧🇷 (server-side)

Envie `"onlyBrazil": true` no body do `/run` (funciona para keyword e hashtags):

```bash
curl -X POST http://localhost:3000/run \
  -H "Content-Type: application/json" \
  -d '{ "hashtags": ["receita"], "max": 15, "onlyBrazil": true }'
```

O que acontece quando `onlyBrazil` está ativo — em três camadas:

1. **IP brasileiro na origem**: o scrape roda com `proxyCountryCode: "BR"`
   (proxy residencial da Apify no Brasil). O TikTok devolve o que um usuário
   no Brasil veria — busca por keyword e hashtags passam a refletir a região,
   como no app.
2. **Região real da conta**: o run pede `scrapeAdditionalAuthorMeta: true`,
   que inclui `authorMeta.region` (país de registro da conta) e
   `locationCreated` (país de publicação). Conta/post `BR` é mantido;
   conta registrada em outro país é descartada (salvo conteúdo fortemente
   PT-BR, ex.: brasileiros pelo mundo).
3. **Heurística de português** (`src/filter/brazil.ts`): fallback para itens
   sem região — pontua ã/õ, ç, "kkkk", "som original", palavras e hashtags
   PT-BR. Mantém com score ≥ 3.

O filtro roda **antes** do ranqueamento e do corte de top N (nada de filtrar
só os 10 já cortados), e o backend **sobre-amostra** a Apify (3× o `max`,
mín. 30, teto 150) para compensar os descartes. A resposta ganha o campo
`brRemoved` (quantos posts não-BR foram removidos) e `total` já vem filtrado.

Campos relacionados no body do `/run`:

| Campo | Tipo | Default | Efeito |
|-------|------|---------|--------|
| `onlyBrazil` | `boolean` | `false` | proxy BR + filtro server-side + `brRemoved` |
| `proxyCountry` | `string` | — | só o proxy de país (ISO alpha-2), sem filtro linguístico |
| `downloadVideos` | `boolean` | `true` | add-on pago da Apify; com `onlyBrazil` a sobre-amostragem também baixa vídeos que serão descartados — envie `false` para economizar |

> **Custo**: proxy residencial por país e `shouldDownloadVideos` são cobrados
> pela Apify. Para runs baratos: `"onlyBrazil": true, "downloadVideos": false`.

**Frontend (repo do Next.js)**: o proxy `/api/run` de lá hoje *consome* o
`onlyBrazil` e filtra localmente sobre o top já cortado — **por isso o filtro
BR do backend nunca ativava**. Duas formas de corrigir:

1. **Recomendado** — no proxy do frontend, repasse `onlyBrazil` no body
   encaminhado ao `/run` (e remova o filtro local, que vira redundante).
2. **Sem mexer no body** — envie o header `x-only-brazil: 1` (ou a query
   `?onlyBrazil=1`) na chamada ao `/run`; o backend aceita as três formas.

No CLI: `--only-brazil` e `--proxy-country <code>`.


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
