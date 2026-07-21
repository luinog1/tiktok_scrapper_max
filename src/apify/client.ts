import { ApifyClient } from 'apify-client';
import { CONFIG } from '../config.js';

/**
 * O cliente é criado POR CHAMADA (não no import do módulo): o token pode
 * vir do header `x-apify-token` de cada requisição, e um cliente criado
 * uma única vez congelaria o token lido no boot (bug da versão anterior —
 * o header era ignorado quando APIFY_API_TOKEN não estava setada).
 */
export async function runActor(
  actorId: string,
  input: Record<string, unknown>,
  token?: string
) {
  const effectiveToken = token || CONFIG.APIFY_API_TOKEN;
  const client = new ApifyClient({ token: effectiveToken });
  const run = await client.actor(actorId).call(input);
  const { items } = await client.dataset(run.defaultDatasetId).listItems({ clean: true });
  return items;
}
