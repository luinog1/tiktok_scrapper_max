import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { CONFIG } from './config.js';
import { extractByHashtag } from './extractor/hashtag.js';
import { extractByKeyword } from './extractor/keyword.js';
import { mapRawToTikTokPost } from './mapper/postMapper.js';
import { classifyTier } from './ranker/classifier.js';
import { rankPosts } from './ranker/ranker.js';
import { writeJson } from './formatter/json.js';
import { writeCsv } from './formatter/csv.js';
import { SortField } from './types/tiktok.js';

const app = express();
app.use(express.json({ limit: '1mb' }));

/**
 * CORREÇÃO: CORS liberado para permitir chamadas diretas do frontend
 * hospedado em outro domínio (ex.: Vercel). Configure origins permitidas
 * via env CORS_ORIGINS (separadas por vírgula). Vazio = libera todas.
 */
const corsOrigins = (process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
app.use(
  cors(
    corsOrigins.length > 0
      ? { origin: corsOrigins }
      : { origin: true }
  )
);

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
    } = req.body || {};

    if (!keyword && (!Array.isArray(hashtags) || hashtags.length === 0)) {
      return res.status(400).json({ ok: false, error: 'Provide "keyword" or "hashtags" (array)' });
    }

    isRunning = true;

    // Se vier token pelo header, injeta no CONFIG em runtime para esta requisição
    const originalToken = CONFIG.APIFY_API_TOKEN;
    if (!originalToken && headerToken) {
      (CONFIG as any).APIFY_API_TOKEN = headerToken;
    }

    let rawItems: any[] = [];
    try {
      if (keyword) {
        rawItems = await extractByKeyword([String(keyword)], Number(max));
      } else {
        rawItems = await extractByHashtag((hashtags as string[]).map(String), Number(max));
      }
    } finally {
      // restaura o token original (não vaza entre requisições)
      (CONFIG as any).APIFY_API_TOKEN = originalToken;
    }

    let posts = rawItems.map(mapRawToTikTokPost);
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
     * evitar payloads enormes).
     */
    const topLimit = Math.min(Math.max(1, Number(max) || 10), 50);

    return res.status(200).json({
      ok: true,
      total: posts.length,
      top: posts.slice(0, topLimit),
      output,
      format,
    });
  } catch (error: any) {
    return res.status(500).json({ ok: false, error: error?.message || String(error) });
  } finally {
    isRunning = false;
  }
});

app.listen(port, () => {
  console.log(`tiktok-trend-extractor web service listening on port ${port}`);
});
