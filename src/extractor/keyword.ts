import { CONFIG } from '../config.js';
import { runActor } from '../apify/client.js';
import { ExtractorOptions, regionActorInput } from './options.js';

/**
 * Extrai posts do TikTok por palavra-chave (search).
 *
 * CORREÇÕES (schema atual do actor, build 0.0.561):
 * 1. `searchSection: 'top'` era inválido — o actor só aceita `""`,
 *    `"/video"` ou `"/user"`. Usamos `""` (busca geral de vídeos).
 * 2. `maxResultsPerQuery`/`maxItems` não existem no schema; o campo
 *    correto é `resultsPerPage` (mesmo fix do hashtag.ts).
 * 3. `options.proxyCountryCode` roteia a busca por proxy residencial do
 *    país (ex.: "BR") — o search devolve o que um usuário daquele país
 *    veria, em vez de resultados globais.
 */
export async function extractByKeyword(
  queries: string[],
  maxResults = CONFIG.DEFAULT_MAX_RESULTS,
  downloadVideos = true,
  options: ExtractorOptions = {}
) {
  const limit = Math.max(1, Number(maxResults) || CONFIG.DEFAULT_MAX_RESULTS);
  return runActor(CONFIG.APIFY_ACTOR_TIKTOK, {
    searchQueries: queries,
    searchSection: '',
    resultsPerPage: limit,
    ...regionActorInput(options),
    // Ver comentário em hashtag.ts — necessário para download funcionar
    // (URLs da CDN do TikTok são atreladas à sessão). Add-on pago da Apify.
    shouldDownloadVideos: downloadVideos,
    shouldDownloadCovers: false,
  });
}
