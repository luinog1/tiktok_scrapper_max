/**
 * Opções geográficas repassadas ao actor `clockworks/tiktok-scraper`.
 * Schema conferido no build 0.0.561 (2026-07) via
 * GET https://api.apify.com/v2/acts/clockworks~tiktok-scraper/builds/default
 */
export interface ExtractorOptions {
  /**
   * Código ISO-3166 alpha-2 (ex.: "BR"). O actor roteia o scrape por
   * proxies residenciais do país — o TikTok responde como se a busca
   * fosse feita de lá (search e hashtags passam a refletir a região).
   */
  proxyCountryCode?: string;
  /**
   * Enriquecimento do autor: inclui `authorMeta.region` (país de registro
   * da conta) no resultado — usado pelo filtro "somente Brasil".
   */
  scrapeAdditionalAuthorMeta?: boolean;
  /**
   * Token da Apify desta requisição (header `x-apify-token`). Quando
   * ausente, `runActor` usa CONFIG.APIFY_API_TOKEN (env do servidor).
   */
  apifyToken?: string;
}

/** Converte as opções nos campos aceitos pelo input do actor. */
export function regionActorInput(options: ExtractorOptions): Record<string, unknown> {
  const input: Record<string, unknown> = {};
  const country = (options.proxyCountryCode || '').trim().toUpperCase();
  if (country && country !== 'NONE') {
    input.proxyCountryCode = country;
  }
  if (options.scrapeAdditionalAuthorMeta) {
    input.scrapeAdditionalAuthorMeta = true;
  }
  return input;
}
