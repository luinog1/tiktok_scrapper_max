import { describe, expect, it } from 'vitest';
import {
  brazilSignalScore,
  filterBrazilianPosts,
  looksBrazilian,
  looksForeign,
} from '../src/filter/brazil.js';
import { TikTokPost } from '../src/types/tiktok.js';

function makePost(overrides: Partial<TikTokPost> & { author?: Partial<TikTokPost['author']> } = {}): TikTokPost {
  return {
    id: '1',
    url: 'https://www.tiktok.com/@user/video/1',
    caption: '',
    hashtags: [],
    duration: 10,
    createTime: '2026-01-01T00:00:00.000Z',
    metrics: { playCount: 1000, diggCount: 10, shareCount: 1, commentCount: 1 },
    music: { title: '', author: '', isOriginal: false },
    engagementRate: 1,
    trendTier: 'NORMAL',
    ...overrides,
    author: {
      username: 'user',
      nickname: 'User',
      followers: 100,
      verified: false,
      ...(overrides.author || {}),
    },
  } as TikTokPost;
}

describe('looksBrazilian — camada 1 (região real da conta/post)', () => {
  it('mantém conta registrada no Brasil mesmo com legenda em inglês', () => {
    const post = makePost({ caption: 'daily vlog #fyp', author: { region: 'BR' } });
    expect(looksBrazilian(post)).toBe(true);
  });

  it('mantém post publicado do Brasil (locationCreated)', () => {
    const post = makePost({ caption: 'gym time', locationCreated: 'BR' });
    expect(looksBrazilian(post)).toBe(true);
  });

  it('descarta conta estrangeira com legenda neutra', () => {
    const post = makePost({ caption: 'Brazil vlog day 3', author: { region: 'US' } });
    expect(looksBrazilian(post)).toBe(false);
  });

  it('mantém conta estrangeira quando o conteúdo é fortemente PT-BR (expatriado)', () => {
    const post = makePost({
      caption: 'Não acredito que você fez isso, muito obrigada gente!',
      hashtags: ['brasileirospelomundo'],
      author: { region: 'PT' },
    });
    expect(looksBrazilian(post)).toBe(true);
  });
});

describe('looksBrazilian — camada 2 (heurística sem região)', () => {
  it('mantém legenda em português ("Foi 3x0 para o Brasil")', () => {
    const post = makePost({ caption: 'Foi 3x0 para o Brasil' });
    expect(looksBrazilian(post)).toBe(true);
  });

  it('descarta legenda em inglês sobre o Brasil', () => {
    const post = makePost({ caption: 'FIFA World Cup Brazil', hashtags: ['worldcup', 'fifa'] });
    expect(looksBrazilian(post)).toBe(false);
  });

  it('mantém legenda com cedilha e nasal', () => {
    const post = makePost({ caption: 'Almoço de domingo, não perco por nada' });
    expect(looksBrazilian(post)).toBe(true);
  });

  it('mantém risada brasileira (kkkk) com gíria', () => {
    const post = makePost({ caption: 'kkkkk que isso mano' });
    expect(looksBrazilian(post)).toBe(true);
  });

  it('bandeira 🇧🇷 sozinha não basta (evita falso positivo de fã estrangeiro)', () => {
    const post = makePost({ caption: 'daily vlog', author: { nickname: 'Ana 🇧🇷' } });
    expect(looksBrazilian(post)).toBe(false);
  });

  it('"som original" na música conta como sinal PT', () => {
    const post = makePost({ music: { title: 'som original - maria', author: 'maria', isOriginal: true } });
    expect(looksBrazilian(post)).toBe(true);
  });

  it('palavras ambíguas com espanhol valem no máximo 2 pontos', () => {
    const post = makePost({ caption: 'para aqui como quando casa vida amor dia' });
    expect(brazilSignalScore(post)).toBe(2);
    expect(looksBrazilian(post)).toBe(false);
  });
});

describe('filterBrazilianPosts', () => {
  it('devolve mantidos e contagem de removidos', () => {
    const posts = [
      makePost({ caption: 'Não é que deu certo, gente!' }),
      makePost({ caption: 'FIFA World Cup Brazil' }),
      makePost({ author: { region: 'BR' } }),
    ];
    const { kept, removed } = filterBrazilianPosts(posts);
    expect(kept).toHaveLength(2);
    expect(removed).toBe(1);
  });
});

describe('proxyLocalized — fonte já geolocalizada em BR (busca via proxy BR)', () => {
  it('MANTÉM post BR sem sinais de PT (legenda curta/emoji) — não afunila', () => {
    // Antes (score >= 3) isso era descartado, causando "15 vira 3".
    const post = makePost({ caption: '🔥🔥 achadinho', author: { nickname: 'loja' } });
    expect(looksBrazilian(post, false)).toBe(false); // modo estrito antigo
    expect(looksBrazilian(post, true)).toBe(true); // modo conservador novo
  });

  it('descarta conta com escrita não-latina (tailandês) mesmo sem região', () => {
    const post = makePost({ caption: 'ราคาถูกมาก shopee', author: { nickname: 'nunnichii' } });
    expect(looksForeign(post)).toBe(true);
    expect(looksBrazilian(post, true)).toBe(false);
  });

  it('ainda descarta conta registrada fora do BR sem forte PT', () => {
    const post = makePost({ caption: 'shopee finds', author: { region: 'TH' } });
    expect(looksBrazilian(post, true)).toBe(false);
  });

  it('mantém conta BR normalmente', () => {
    const post = makePost({ caption: 'oferta', author: { region: 'BR' } });
    expect(looksBrazilian(post, true)).toBe(true);
  });

  it('filterBrazilianPosts com proxyLocalized mantém a piscina BR e corta só o estrangeiro', () => {
    const posts = [
      makePost({ caption: '🔥 achadinho barato' }), // BR sem texto forte
      makePost({ caption: 'สินค้าราคาถูก', author: { nickname: 'linladaa' } }), // tailandês
      makePost({ author: { region: 'BR' } }), // BR por região
      makePost({ caption: 'shopee haul', author: { region: 'TH' } }), // TH explícito
    ];
    const { kept, removed } = filterBrazilianPosts(posts, { proxyLocalized: true });
    expect(kept).toHaveLength(2);
    expect(removed).toBe(2);
  });
});
