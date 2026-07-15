import { TikTokPost } from '../types/tiktok.js';

export function mapRawToTikTokPost(raw: any): TikTokPost {
  const playCount = Number(raw.playCount || raw.stats?.playCount || 0);
  const diggCount = Number(raw.diggCount || raw.stats?.diggCount || 0);
  const shareCount = Number(raw.shareCount || raw.stats?.shareCount || 0);
  const commentCount = Number(raw.commentCount || raw.stats?.commentCount || 0);
  const engagementRate = playCount > 0 ? ((diggCount + shareCount + commentCount) / playCount) * 100 : 0;

  return {
    id: String(raw.id || raw.videoId || ''),
    url: raw.webVideoUrl || raw.url || '',
    caption: raw.text || raw.desc || '',
    hashtags: Array.isArray(raw.hashtags)
      ? raw.hashtags.map((h: any) => (typeof h === 'string' ? h : h.name)).filter(Boolean)
      : [],
    author: {
      username: raw.authorMeta?.name || raw.author?.uniqueId || '',
      nickname: raw.authorMeta?.nickName || raw.author?.nickname || '',
      followers: Number(raw.authorMeta?.fans || raw.authorStats?.followerCount || 0),
      verified: Boolean(raw.authorMeta?.verified || raw.author?.verified),
    },
    metrics: {
      playCount,
      diggCount,
      shareCount,
      commentCount,
      bookmarkCount: Number(raw.collectCount || raw.stats?.collectCount || 0),
    },
    duration: Number(raw.videoMeta?.duration || raw.video?.duration || 0),
    createTime: raw.createTimeISO || new Date((raw.createTime || Date.now() / 1000) * 1000).toISOString(),
    music: {
      title: raw.musicMeta?.musicName || raw.music?.title || '',
      author: raw.musicMeta?.musicAuthor || raw.music?.authorName || '',
      isOriginal: Boolean(raw.musicMeta?.musicOriginal || false),
    },
    engagementRate,
    trendTier: 'NORMAL',
  };
}
