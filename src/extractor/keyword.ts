import { CONFIG } from '../config.js';
import { runActor } from '../apify/client.js';

/**
 * Extrai posts do TikTok por palavra-chave (search).
 *
 * CORREÇÕES:
 * 1. `searchSection: 'top'` era inválido — a Apify agora só aceita
 *    `""`, `"/video"` ou `"/user"`. Usamos `""` (busca geral de vídeos).
 * 2. `maxResultsPerQuery` não é reconhecido pelo actor; trocado por
 *    `resultsPerPage` + `maxItems` (mesmo fix do hashtag.ts).
 */
export async function extractByKeyword(
  queries: string[],
  maxResults = CONFIG.DEFAULT_MAX_RESULTS,
  downloadVideos = true
) {
  const limit = Math.max(1, Number(maxResults) || CONFIG.DEFAULT_MAX_RESULTS);
  return runActor(CONFIG.APIFY_ACTOR_TIKTOK, {
    searchQueries: queries,
    searchSection: '',
    resultsPerPage: limit,
    maxItems: limit * queries.length,
    // Ver comentário em hashtag.ts — necessário para download funcionar
    // (URLs da CDN do TikTok são atreladas à sessão). Add-on pago da Apify.
    shouldDownloadVideos: downloadVideos,
    shouldDownloadCovers: false,
  });
}
