import { mkdirSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { env } from '../config/env';

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

/** Persist a citizen photo locally so it can be re-reviewed by an authority. */
export function saveUpload(buffer: Buffer, filename?: string): { name: string; buffer: Buffer; path: string } {
  mkdirSync(env.UPLOAD_DIR, { recursive: true });
  const safeName = (filename || 'upload.jpg').replace(/[^\w.-]/g, '_');
  const extension = extname(safeName).toLowerCase();
  const storedName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}${ALLOWED_EXTENSIONS.has(extension) ? extension : '.jpg'}`;
  const path = join(env.UPLOAD_DIR, storedName);
  writeFileSync(path, buffer);
  return { name: storedName, buffer, path };
}