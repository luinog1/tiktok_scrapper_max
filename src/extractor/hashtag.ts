import { CONFIG } from '../config.js';
import { runActor } from '../apify/client.js';

/**
 * Extrai posts do TikTok por hashtag(s).
 *
 * CORREÇÃO: o actor `clockworks/tiktok-scraper` NÃO reconhece o campo
 * `maxResultsPerQuery` — ele é ignorado e o actor retorna ~1 post por
 * hashtag. Os campos corretos são:
 *   - `resultsPerPage`: limite por query/hashtag
 *   - `maxItems`: limite total (hard cap) no dataset
 */
export async function extractByHashtag(
  hashtags: string[],
  maxResults = CONFIG.DEFAULT_MAX_RESULTS,
  downloadVideos = true
) {
  const cleanTags = hashtags.map((h) => h.replace(/^#/, ''));
  const limit = Math.max(1, Number(maxResults) || CONFIG.DEFAULT_MAX_RESULTS);
  return runActor(CONFIG.APIFY_ACTOR_TIKTOK, {
    hashtags: cleanTags,
    resultsPerPage: limit,
    maxItems: limit * cleanTags.length,
    /**
     * CORREÇÃO (download bloqueado pelo TikTok): as URLs da CDN do TikTok
     * são atreladas ao cookie de sessão do scrape e expiram — proxy com
     * Referer/User-Agent não basta (403). Com `shouldDownloadVideos: true`
     * a Apify baixa o vídeo e devolve em `mediaUrls` um link do key-value
     * store dela, baixável de qualquer lugar. É um add-on PAGO da Apify —
     * desative com `downloadVideos: false` no /run se o custo importar.
     */
    shouldDownloadVideos: downloadVideos,
    shouldDownloadCovers: false,
  });
}
