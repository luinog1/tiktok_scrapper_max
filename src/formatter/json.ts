import fs from 'fs-extra';
import path from 'node:path';
import { TikTokPost } from '../types/tiktok.js';

export async function writeJson(posts: TikTokPost[], outputFile: string) {
  await fs.ensureDir(path.dirname(outputFile));
  await fs.writeJson(outputFile, posts, { spaces: 2 });
}
