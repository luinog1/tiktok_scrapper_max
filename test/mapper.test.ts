import { describe, expect, it } from 'vitest';
import { mapRawToTikTokPost } from '../src/mapper/postMapper.js';

describe('postMapper', () => {
  it('should map raw post and compute engagement', () => {
    const post = mapRawToTikTokPost({
      id: '1',
      webVideoUrl: 'https://tiktok.com/v/1',
      text: 'hello',
      stats: { playCount: 1000, diggCount: 100, shareCount: 30, commentCount: 20 },
      authorMeta: { name: 'user1', nickName: 'User 1', fans: 5000, verified: true },
      createTime: 1720000000,
    });

    expect(post.id).toBe('1');
    expect(post.metrics.playCount).toBe(1000);
    expect(post.engagementRate).toBeCloseTo(15);
  });
});
