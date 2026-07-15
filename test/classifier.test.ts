import { describe, expect, it } from 'vitest';
import { classifyTier } from '../src/ranker/classifier.js';

describe('classifyTier', () => {
  it('should classify viral', () => {
    expect(classifyTier(6_000_000, 6)).toBe('VIRAL');
  });

  it('should classify hot', () => {
    expect(classifyTier(1_500_000, 3.1)).toBe('HOT');
  });

  it('should classify rising', () => {
    expect(classifyTier(150_000, 1.6)).toBe('RISING');
  });

  it('should classify normal', () => {
    expect(classifyTier(10_000, 0.2)).toBe('NORMAL');
  });
});
