export interface TikTokPost {
  id: string;
  url: string;
  caption: string;
  hashtags: string[];
  author: {
    username: string;
    nickname: string;
    followers: number;
    verified: boolean;
    /** País de registro da conta (ISO-3166 alpha-2, ex.: "BR") — `authorMeta.region` da Apify. */
    region?: string;
    /** Bio do autor (`authorMeta.signature`). */
    signature?: string;
  };
  metrics: {
    playCount: number;
    diggCount: number;
    shareCount: number;
    commentCount: number;
    bookmarkCount?: number;
  };
  duration: number;
  createTime: string;
  music: {
    title: string;
    author: string;
    isOriginal: boolean;
  };
  engagementRate: number;
  trendTier: 'VIRAL' | 'HOT' | 'RISING' | 'NORMAL';
  /** País onde o post foi publicado (`locationCreated` da Apify), quando disponível. */
  locationCreated?: string;
  /** URL direta do vídeo CDN (vinda da Apify). */
  videoUrl?: string;
  /** URL da imagem de capa/thumbnail. */
  coverUrl?: string;
  /** Posts de foto (carrossel) — lista de URLs de imagem. */
  images?: string[];
}

export type SortField = 'playCount' | 'diggCount' | 'shareCount' | 'commentCount' | 'createTime';
