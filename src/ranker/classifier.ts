import { CONFIG } from '../config.js';
import { TrendTier } from '../config.js';

export function classifyTier(playCount: number, engagementRate: number): TrendTier {
  if (playCount >= CONFIG.TIERS.VIRAL.playCount && engagementRate >= CONFIG.TIERS.VIRAL.engagementRate) {
    return 'VIRAL';
  }
  if (playCount >= CONFIG.TIERS.HOT.playCount && engagementRate >= CONFIG.TIERS.HOT.engagementRate) {
    return 'HOT';
  }
  if (playCount >= CONFIG.TIERS.RISING.playCount && engagementRate >= CONFIG.TIERS.RISING.engagementRate) {
    return 'RISING';
  }
  return 'NORMAL';
}
