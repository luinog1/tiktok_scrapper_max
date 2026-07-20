import { CONFIG } from '../config.js';
import { runActor } from '../apify/client.js';
import { ExtractorOptions, regionActorInput } from './options.js';

/**
 * Extrai posts do TikTok por hashtag(s).
 *
 * CORREÇÕES (schema atual do actor, build 0.0.561):
 * - `maxResultsPerQuery` e `maxItems` NÃO existem no input schema do
 *   `clockworks/tiktok-scraper` — o campo correto é `resultsPerPage`
 *   (limite por hashtag/query).
 * - `options.proxyCountryCode` roteia o scrape por proxy residencial do
 *   país (ex.: "BR") — as hashtags passam a devolver o feed daquela região.
 * - `options.scrapeAdditionalAuthorMeta` inclui `authorMeta.region` no
 *   resultado (país de registro da conta), usado pelo filtro BR.
 */
export async function extractByHashtag(
  hashtags: string[],
  maxResults = CONFIG.DEFAULT_MAX_RESULTS,
  downloadVideos = true,
  options: ExtractorOptions = {}
) {
  const cleanTags = hashtags.map((h) => h.replace(/^#/, ''));
  const limit = Math.max(1, Number(maxResults) || CONFIG.DEFAULT_MAX_RESULTS);
  return runActor(CONFIG.APIFY_ACTOR_TIKTOK, {
    hashtags: cleanTags,
    resultsPerPage: limit,
    ...regionActorInput(options),
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
