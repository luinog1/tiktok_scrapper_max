import { CONFIG } from '../config.js';
import { runActor } from '../apify/client.js';

export async function extractByHashtag(hashtags: string[], maxResults = CONFIG.DEFAULT_MAX_RESULTS) {
  const cleanTags = hashtags.map((h) => h.replace(/^#/, ''));
  return runActor(CONFIG.APIFY_ACTOR_TIKTOK, {
    hashtags: cleanTags,
    maxResultsPerQuery: maxResults,
    shouldDownloadVideos: false,
    shouldDownloadCovers: false,
  });
}
