import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { CONFIG } from './config.js';
import { extractByHashtag } from './extractor/hashtag.js';
import { extractByKeyword } from './extractor/keyword.js';
import { mapRawToTikTokPost } from './mapper/postMapper.js';
import { classifyTier } from './ranker/classifier.js';
import { rankPosts } from './ranker/ranker.js';
import { filterBrazilianPosts } from './filter/brazil.js';
import { writeJson } from './formatter/json.js';
import { writeCsv } from './formatter/csv.js';
import { SortField } from './types/tiktok.js';

const app = express();
app.use(express.json({ limit: '1mb' }));

/**
 * CORREÇÃO: CORS implementado manualmente (sem pacote externo).
 *
 * Configure as origins permitidas via env CORS_ORIGINS (separadas por
 * vírgula). Se vazio, libera todas (*). Funciona para requests simples
 * e para preflight (OPTIONS).
 */
const corsOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

function corsMiddleware(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin || '';
  const allowed =
    corsOrigins.length === 0 || (origin && corsOrigins.includes(origin));

  if (allowed && origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  } else if (corsOrigins.length === 0) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, x-api-key, x-apify-token'
  );
  // Permite ao frontend ler o nome/tamanho do arquivo no download via fetch
  res.setHeader(
    'Access-Control-Expose-Headers',
    'Content-Disposition, Content-Length, Content-Range'
  );
  res.setHeader('Access-Control-Max-Age', '86400');

  // Responde preflight imediatamente
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
}
app.use(corsMiddleware);

const port = Number(process.env.PORT || 3000);
const serviceApiKey = process.env.SERVICE_API_KEY || '';
let isRunning = false;

app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true, service: 'tiktok-trend-extractor', timestamp: new Date().toISOString() });
});

app.post('/run', async (req, res) => {
  try {
    if (serviceApiKey) {
      const provided = req.header('x-api-key') || '';
      if (provided !== serviceApiKey) {
        return res.status(401).json({ ok: false, error: 'Unauthorized' });
      }
    }

    /**
     * Token da Apify: prioriza a variável de ambiente (deploy próprio).
     * Se não estiver setada, aceita o header `x-apify-token` enviado pelo
     * frontend — assim cada usuário pode usar o próprio token da Apify.
     */
    const headerToken = req.header('x-apify-token') || '';
    const effectiveToken = CONFIG.APIFY_API_TOKEN || headerToken;
    if (!effectiveToken) {
      return res.status(500).json({ ok: false, error: 'APIFY_API_TOKEN not configured' });
    }

    if (isRunning) {
      return res.status(409).json({ ok: false, error: 'Another extraction is already running' });
    }

    const {
      keyword,
      hashtags,
      max = CONFIG.DEFAULT_MAX_RESULTS,
      sort = CONFIG.DEFAULT_SORT_BY,
      minViews = 0,
      format = 'json',
      output = 'output/results',
      /**
       * Quando true (padrão), a Apify baixa os vídeos e devolve URLs do
       * key-value store dela em `videoUrl` — necessário para o download
       * funcionar (URLs da CDN do TikTok expiram/exigem cookie de sessão).
       * É um add-on pago da Apify; envie false para economizar créditos.
       */
      downloadVideos = true,
      /**
       * FILTRO BRASIL (agora no backend, não só no frontend):
       * - `onlyBrazil: true` → scrape via proxy residencial no Brasil
       *   (proxyCountryCode: 'BR'), pede `authorMeta.region` à Apify e
       *   filtra server-side por região da conta + heurística PT-BR,
       *   ANTES do ranqueamento e do corte de top N.
       * - `proxyCountry` (ISO alpha-2 opcional) permite outro país de
       *   proxy sem ativar o filtro linguístico.
       */
      onlyBrazil = false,
      proxyCountry,
    } = req.body || {};

    if (!keyword && (!Array.isArray(hashtags) || hashtags.length === 0)) {
      return res.status(400).json({ ok: false, error: 'Provide "keyword" or "hashtags" (array)' });
    }

    const wantBrazil = Boolean(onlyBrazil);
    const proxyCountryCode =
      String(proxyCountry || (wantBrazil ? 'BR' : '')).trim().toUpperCase() || undefined;

    const requestedMax = Math.max(1, Number(max) || CONFIG.DEFAULT_MAX_RESULTS);
    /**
     * Sobre-amostragem: o filtro BR descarta itens, então pedimos mais à
     * Apify (2x, mín. 20, teto 100) para o resultado final não "afunilar"
     * (ex.: 15 vira 3). Atenção: com `downloadVideos: true` isso também
     * aumenta o custo do add-on de download — os vídeos descartados já
     * foram baixados pela Apify.
     */
    const fetchMax = wantBrazil
      ? Math.min(Math.max(requestedMax * 2, 20), 100)
      : requestedMax;

    const extractorOptions = {
      proxyCountryCode,
      scrapeAdditionalAuthorMeta: wantBrazil,
    };

    isRunning = true;

    // Se vier token pelo header, injeta no CONFIG em runtime para esta requisição
    const originalToken = CONFIG.APIFY_API_TOKEN;
    if (!originalToken && headerToken) {
      (CONFIG as any).APIFY_API_TOKEN = headerToken;
    }

    let rawItems: any[] = [];
    try {
      if (keyword) {
        rawItems = await extractByKeyword(
          [String(keyword)],
          fetchMax,
          Boolean(downloadVideos),
          extractorOptions
        );
      } else {
        rawItems = await extractByHashtag(
          (hashtags as string[]).map(String),
          fetchMax,
          Boolean(downloadVideos),
          extractorOptions
        );
      }
    } finally {
      // restaura o token original (não vaza entre requisições)
      (CONFIG as any).APIFY_API_TOKEN = originalToken;
    }

    let posts = rawItems.map(mapRawToTikTokPost);

    // Filtro Brasil ANTES de minViews/rank/corte — corrige o funil em que
    // o frontend filtrava só os top 10 já cortados pelo backend.
    let brRemoved = 0;
    if (wantBrazil) {
      const { kept, removed } = filterBrazilianPosts(posts);
      posts = kept;
      brRemoved = removed;
    }

    posts = posts
      .filter((p) => p.metrics.playCount >= Number(minViews))
      .map((p) => ({ ...p, trendTier: classifyTier(p.metrics.playCount, p.engagementRate) }));

    posts = rankPosts(posts, sort as SortField);

    if (format === 'json' || format === 'both') {
      await writeJson(posts, `${output}.json`);
    }
    if (format === 'csv' || format === 'both') {
      await writeCsv(posts, `${output}.csv`);
    }

    /**
     * CORREÇÃO: antes era `posts.slice(0, 10)` fixo, ignorando o `max`
     * pedido pelo cliente. Agora honra o `max` (limitado a 50 para
     * evitar payloads enormes). Com filtro BR, o corte acontece DEPOIS
     * da filtragem — o top N devolvido já é 100% brasileiro.
     */
    const topLimit = Math.min(requestedMax, 50);

    return res.status(200).json({
      ok: true,
      total: posts.length,
      top: posts.slice(0, topLimit),
      output,
      format,
      ...(wantBrazil ? { brRemoved } : {}),
    });
  } catch (error: any) {
    return res.status(500).json({ ok: false, error: error?.message || String(error) });
  } finally {
    isRunning = false;
  }
});

/**
 * CORREÇÃO (download bloqueado pelo TikTok):
 *
 * O frontend baixava o vídeo direto da CDN do TikTok a partir do browser.
 * A CDN bloqueia isso de duas formas: CORS (fetch cross-origin negado) e
 * hotlink protection (403 sem `Referer`/`User-Agent` de browser).
 *
 * Este endpoint faz proxy do download pelo backend: busca o vídeo na CDN
 * com os headers que o TikTok espera e faz stream para o cliente com
 * Content-Disposition, permitindo salvar o arquivo.
 *
 * Uso: GET /download?url=<videoUrl-encodado>&filename=meuvideo.mp4
 */
const TIKTOK_CDN_SUFFIXES = [
  '.tiktokcdn.com',
  '.tiktokcdn-us.com',
  '.tiktokcdn-eu.com',
  '.tiktokv.com',
  '.tiktokv.us',
  '.ibytedtos.com',
  '.ibyteimg.com',
  '.byteoversea.com',
  '.bytecdn.cn',
  '.muscdn.com',
  'api.apify.com', // vídeos armazenados na Apify (shouldDownloadVideos)
];

function isAllowedMediaHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return TIKTOK_CDN_SUFFIXES.some(
    (suffix) => host === suffix.replace(/^\./, '') || host.endsWith(suffix)
  );
}

app.get('/download', async (req, res) => {
  try {
    // Mesma auth do /run; aceita também ?key= para permitir <a href> direto
    if (serviceApiKey) {
      const provided = req.header('x-api-key') || String(req.query.key || '');
      if (provided !== serviceApiKey) {
        return res.status(401).json({ ok: false, error: 'Unauthorized' });
      }
    }

    const rawUrl = String(req.query.url || '');
    if (!rawUrl) {
      return res.status(400).json({ ok: false, error: 'Missing "url" query param' });
    }

    let target: URL;
    try {
      target = new URL(rawUrl);
    } catch {
      return res.status(400).json({ ok: false, error: 'Invalid "url"' });
    }
    if (target.protocol !== 'https:' || !isAllowedMediaHost(target.hostname)) {
      return res.status(400).json({ ok: false, error: 'URL host not allowed' });
    }

    // Registros do key-value store da Apify podem exigir autenticação —
    // usa o token do servidor (ou o enviado pelo cliente via header/query).
    const isApifyHost = target.hostname.toLowerCase().endsWith('api.apify.com');
    const apifyToken =
      CONFIG.APIFY_API_TOKEN ||
      req.header('x-apify-token') ||
      String(req.query.apifyToken || '');

    const upstream = await axios.get(target.toString(), {
      responseType: 'stream',
      timeout: CONFIG.REQUEST_TIMEOUT_MS,
      maxRedirects: 5,
      // Headers que a CDN do TikTok exige para não retornar 403
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        Referer: 'https://www.tiktok.com/',
        Accept: '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        ...(isApifyHost && apifyToken ? { Authorization: `Bearer ${apifyToken}` } : {}),
        ...(req.headers.range ? { Range: String(req.headers.range) } : {}),
      },
      validateStatus: () => true,
    });

    if (upstream.status === 401 || upstream.status === 403) {
      upstream.data?.destroy?.();
      return res.status(410).json({
        ok: false,
        error: isApifyHost
          ? `Apify recusou o acesso ao vídeo armazenado (HTTP ${upstream.status}) — verifique o APIFY_API_TOKEN do servidor.`
          : 'TikTok CDN rejeitou o download (403). URLs de vídeo do TikTok expiram em poucas horas — refaça a busca para obter uma URL nova.',
      });
    }
    if (upstream.status >= 400) {
      upstream.data?.destroy?.();
      return res
        .status(502)
        .json({ ok: false, error: `Upstream returned HTTP ${upstream.status}` });
    }

    const filename =
      String(req.query.filename || '').replace(/[^\w.\-]+/g, '_') || 'tiktok-video.mp4';
    res.status(upstream.status); // 200 ou 206 (Range)
    res.setHeader('Content-Type', String(upstream.headers['content-type'] || 'video/mp4'));
    if (upstream.headers['content-length']) {
      res.setHeader('Content-Length', String(upstream.headers['content-length']));
    }
    if (upstream.headers['content-range']) {
      res.setHeader('Content-Range', String(upstream.headers['content-range']));
      res.setHeader('Accept-Ranges', 'bytes');
    }
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    upstream.data.pipe(res);
    upstream.data.on('error', () => res.destroy());
    res.on('close', () => upstream.data?.destroy?.());
  } catch (error: any) {
    if (!res.headersSent) {
      return res.status(500).json({ ok: false, error: error?.message || String(error) });
    }
    res.destroy();
  }
});

app.listen(port, () => {
  console.log(`tiktok-trend-extractor web service listening on port ${port}`);
});
