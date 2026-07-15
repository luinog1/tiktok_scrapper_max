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
}

export type SortField = 'playCount' | 'diggCount' | 'shareCount' | 'commentCount' | 'createTime';
