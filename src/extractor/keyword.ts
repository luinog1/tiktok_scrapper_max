import { CONFIG } from '../config.js';
import { runActor } from '../apify/client.js';

export async function extractByKeyword(queries: string[], maxResults = CONFIG.DEFAULT_MAX_RESULTS) {
  return runActor(CONFIG.APIFY_ACTOR_TIKTOK, {
    searchQueries: queries,
    searchSection: 'top',
    maxResultsPerQuery: maxResults,
    shouldDownloadVideos: false,
    shouldDownloadCovers: false,
  });
}
