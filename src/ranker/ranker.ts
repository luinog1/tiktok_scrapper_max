import { SortField, TikTokPost } from '../types/tiktok.js';

export function rankPosts(posts: TikTokPost[], sortBy: SortField): TikTokPost[] {
  return [...posts].sort((a, b) => {
    if (sortBy === 'createTime') {
      return new Date(b.createTime).getTime() - new Date(a.createTime).getTime();
    }
    return (b.metrics[sortBy] as number) - (a.metrics[sortBy] as number);
  });
}
