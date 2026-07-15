import { ApifyClient } from 'apify-client';
import { CONFIG } from '../config.js';

export const apifyClient = new ApifyClient({ token: CONFIG.APIFY_API_TOKEN });

export async function runActor(actorId: string, input: Record<string, unknown>) {
  const run = await apifyClient.actor(actorId).call(input);
  const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems({ clean: true });
  return items;
}
