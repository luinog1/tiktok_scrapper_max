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
  /** URL direta do vídeo CDN (vinda da Apify). */
  videoUrl?: string;
  /** URL da imagem de capa/thumbnail. */
  coverUrl?: string;
  /** Posts de foto (carrossel) — lista de URLs de imagem. */
  images?: string[];
}

export type SortField = 'playCount' | 'diggCount' | 'shareCount' | 'commentCount' | 'createTime';
