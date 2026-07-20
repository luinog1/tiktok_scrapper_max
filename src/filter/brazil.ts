import { TikTokPost } from '../types/tiktok.js';

/**
 * Filtro de localidade "somente Brasil", aplicado no BACKEND (antes do
 * ranqueamento e do corte de top N), em duas camadas:
 *
 * Camada 1 — sinal geográfico real (vem da Apify quando o /run roda com
 * `scrapeAdditionalAuthorMeta: true`):
 *   - `author.region`     → país de registro da CONTA (ex.: "BR")
 *   - `locationCreated`   → país onde o post foi publicado
 *   Conta/post "BR" mantém direto; conta registrada em outro país só passa
 *   se o conteúdo for fortemente PT-BR (score >= FOREIGN_OVERRIDE_SCORE,
 *   ex.: brasileiros pelo mundo).
 *
 * Camada 2 — heurística linguística, usada quando a Apify não devolve
 * região: pontua sinais de português na legenda, bio, apelido, música e
 * hashtags. Mantém com score >= KEEP_SCORE.
 */

export const KEEP_SCORE = 3;
export const FOREIGN_OVERRIDE_SCORE = 6;

/** Palavras quase exclusivas do português (peso +2 cada). */
const STRONG_PT_WORDS = [
  'não',
  'nao',
  'você',
  'voce',
  'vocês',
  'voces',
  'também',
  'tambem',
  'então',
  'entao',
  'obrigado',
  'obrigada',
  'gente',
  'muito',
  'muita',
  'foi',
  'isso',
  'hoje',
  'receita',
  'coisa',
  'cadê',
  'mano',
  'caraca',
  'véi',
  'deixa',
  'olha',
  'assim',
];

/** Palavras compartilhadas com o espanhol (peso +1, máx. 2 pontos). */
const AMBIGUOUS_PT_WORDS = [
  'para',
  'aqui',
  'brasil',
  'como',
  'quando',
  'porque',
  'casa',
  'vida',
  'amor',
  'dia',
];

/** Hashtags tipicamente brasileiras (peso +2, conta uma vez). */
const BR_HASHTAGS = [
  'tiktokbrasil',
  'brasileirospelomundo',
  'humorbrasil',
  'viralbrasil',
  'funkbrasil',
  'sertanejo',
  'pagode',
  'forro',
  'forró',
  'futebolbrasileiro',
  'novela',
  'bbb',
];

const BR_FLAG = '\u{1F1E7}\u{1F1F7}'; // 🇧🇷

function normalize(text: string): string {
  return (text || '').toLowerCase();
}

function hasWord(text: string, word: string): boolean {
  // \b não funciona com acentos — delimita por não-letra (unicode)
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^\\p{L}])${escaped}([^\\p{L}]|$)`, 'iu').test(text);
}

/**
 * Score de "brasilidade" linguística do post (0 = nenhum sinal).
 */
export function brazilSignalScore(post: TikTokPost): number {
  const caption = normalize(post.caption);
  const nickname = normalize(post.author?.nickname || '');
  const signature = normalize(post.author?.signature || '');
  const musicTitle = normalize(post.music?.title || '');
  const text = `${caption} ${nickname} ${signature} ${musicTitle}`;

  let score = 0;

  // Vogais nasais ã/õ — praticamente exclusivas do português
  if (/[ãõ]/.test(text)) score += 3;
  // Cedilha
  if (/ç/.test(text)) score += 2;
  // Risada brasileira ("kkkk") — espanhol usa "jaja", inglês "lol"
  if (/(^|[^\p{L}])k{3,}([^\p{L}]|$)/iu.test(caption)) score += 3;
  // Bandeira do Brasil no apelido ou na bio
  if (nickname.includes(BR_FLAG) || signature.includes(BR_FLAG)) score += 2;
  // "som original" — em espanhol é "sonido original", em inglês "original sound"
  if (musicTitle.includes('som original')) score += 3;

  for (const word of STRONG_PT_WORDS) {
    if (hasWord(text, word)) score += 2;
  }

  let ambiguous = 0;
  for (const word of AMBIGUOUS_PT_WORDS) {
    if (ambiguous >= 2) break;
    if (hasWord(text, word)) ambiguous += 1;
  }
  score += ambiguous;

  const tags = (post.hashtags || []).map((h) => normalize(h));
  if (tags.some((t) => BR_HASHTAGS.includes(t))) score += 2;

  return score;
}

/**
 * Decide se o post é brasileiro. Prioriza a região real da conta/post
 * (camada 1) e cai na heurística linguística (camada 2) quando a Apify
 * não devolve região.
 */
export function looksBrazilian(post: TikTokPost): boolean {
  const region = (post.author?.region || '').toUpperCase();
  const location = (post.locationCreated || '').toUpperCase();

  if (region === 'BR' || location === 'BR') return true;
  if (region && region !== 'BR') {
    // Conta registrada fora do Brasil: só passa com conteúdo fortemente PT-BR
    return brazilSignalScore(post) >= FOREIGN_OVERRIDE_SCORE;
  }
  return brazilSignalScore(post) >= KEEP_SCORE;
}

/**
 * Filtra a lista mantendo só posts brasileiros; devolve também quantos
 * foram removidos (exposto como `brRemoved` na resposta do /run).
 */
export function filterBrazilianPosts(posts: TikTokPost[]): {
  kept: TikTokPost[];
  removed: number;
} {
  const kept = posts.filter(looksBrazilian);
  return { kept, removed: posts.length - kept.length };
}
