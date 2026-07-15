import dotenv from 'dotenv';
dotenv.config();

export type SortField = 'playCount' | 'diggCount' | 'shareCount' | 'commentCount' | 'createTime';
export type TrendTier = 'VIRAL' | 'HOT' | 'RISING' | 'NORMAL';

export const CONFIG = {
  APIFY_API_TOKEN: process.env.APIFY_API_TOKEN || '',
  APIFY_ACTOR_TIKTOK: process.env.APIFY_ACTOR_TIKTOK || 'clockworks/tiktok-scraper',
  DEFAULT_MAX_RESULTS: Number(process.env.DEFAULT_MAX_RESULTS || 50),
  DEFAULT_SORT_BY: (process.env.DEFAULT_SORT_BY as SortField) || 'playCount',
  REQUEST_TIMEOUT_MS: Number(process.env.REQUEST_TIMEOUT_MS || 120000),
  TIERS: {
    VIRAL: {
      playCount: Number(process.env.TIER_VIRAL_VIEWS || 5_000_000),
      engagementRate: Number(process.env.TIER_VIRAL_ENGAGEMENT || 5),
    },
    HOT: {
      playCount: Number(process.env.TIER_HOT_VIEWS || 1_000_000),
      engagementRate: Number(process.env.TIER_HOT_ENGAGEMENT || 3),
    },
    RISING: {
      playCount: Number(process.env.TIER_RISING_VIEWS || 100_000),
      engagementRate: Number(process.env.TIER_RISING_ENGAGEMENT || 1.5),
    },
  },
};
