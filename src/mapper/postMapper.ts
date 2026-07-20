import { TikTokPost } from '../types/tiktok.js';

export function mapRawToTikTokPost(raw: any): TikTokPost {
  const playCount = Number(raw.playCount || raw.stats?.playCount || 0);
  const diggCount = Number(raw.diggCount || raw.stats?.diggCount || 0);
  const shareCount = Number(raw.shareCount || raw.stats?.shareCount || 0);
  const commentCount = Number(raw.commentCount || raw.stats?.commentCount || 0);
  const engagementRate = playCount > 0 ? ((diggCount + shareCount + commentCount) / playCount) * 100 : 0;

  // Mídia: prioriza `mediaUrls` — quando `shouldDownloadVideos: true`, a
  // Apify baixa o vídeo e devolve aqui um link do key-value store dela,
  // baixável de qualquer lugar (as URLs diretas da CDN do TikTok, usadas
  // como fallback abaixo, são atreladas à sessão do scrape e expiram).
  const videoUrl: string | undefined =
    (Array.isArray(raw.mediaUrls) && raw.mediaUrls.find((u: any) => typeof u === 'string' && u)) ||
    raw.videoUrl ||
    raw.videoMeta?.downloadAddr ||
    raw.videoMeta?.playAddr ||
    raw.video?.downloadAddr ||
    raw.video?.playAddr ||
    raw.video?.playAddress?.UrlList?.[0] ||
    undefined;

  const coverUrl: string | undefined =
    raw.imageUrl ||
    raw.coverUrl ||
    raw.videoMeta?.coverUrl ||
    raw.videoMeta?.originCoverUrl ||
    raw.video?.cover ||
    raw.video?.originCover ||
    undefined;

  // Posts de foto (carrossel) — extrai lista de URLs de imagem
  let images: string[] | undefined;
  const imagePost = raw.imagePost || raw.images;
  if (imagePost) {
    const rawImages = Array.isArray(imagePost) ? imagePost : imagePost.imagesList || imagePost.images;
    if (Array.isArray(rawImages)) {
      images = rawImages
        .map((img: any) =>
          typeof img === 'string'
            ? img
            : img?.url || img?.imageURL?.urlList?.[0] || img?.urlList?.[0] || ''
        )
        .filter((u: string) => u.length > 0);
      if (images.length === 0) images = undefined;
    }
  }

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
      region: raw.authorMeta?.region || raw.author?.region || undefined,
      signature: raw.authorMeta?.signature || raw.author?.signature || undefined,
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
    locationCreated: raw.locationCreated || undefined,
    videoUrl,
    coverUrl,
    images,
  };
}
