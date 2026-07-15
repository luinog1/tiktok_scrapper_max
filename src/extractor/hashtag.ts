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
export async function extractByHashtag(hashtags: string[], maxResults = CONFIG.DEFAULT_MAX_RESULTS) {
  const cleanTags = hashtags.map((h) => h.replace(/^#/, ''));
  const limit = Math.max(1, Number(maxResults) || CONFIG.DEFAULT_MAX_RESULTS);
  return runActor(CONFIG.APIFY_ACTOR_TIKTOK, {
    hashtags: cleanTags,
    resultsPerPage: limit,
    maxItems: limit * cleanTags.length,
    shouldDownloadVideos: false,
    shouldDownloadCovers: false,
  });
}
