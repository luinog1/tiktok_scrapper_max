import fs from 'fs-extra';
import path from 'node:path';
import { Parser } from 'json2csv';
import { TikTokPost } from '../types/tiktok.js';

export async function writeCsv(posts: TikTokPost[], outputFile: string) {
  const parser = new Parser({
    fields: [
      'id',
      'url',
      'caption',
      'author.username',
      'author.nickname',
      'author.followers',
      'author.verified',
      'metrics.playCount',
      'metrics.diggCount',
      'metrics.shareCount',
      'metrics.commentCount',
      'engagementRate',
      'trendTier',
      'createTime',
    ],
  });

  const csv = parser.parse(posts as unknown as Record<string, unknown>[]);
  await fs.ensureDir(path.dirname(outputFile));
  await fs.writeFile(outputFile, csv, 'utf8');
}
