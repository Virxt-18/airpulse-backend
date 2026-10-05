import axios from 'axios';
import { env } from '../config/env';

export type VisionResult = { label: string; confidence: number; model: string; signals?: Record<string, number> };

/**
 * Classify a citizen photo with the Python vision service. Returns null when the
 * service is unreachable so the caller can fall back to the text category.
 */
export async function classifyImage(imageBuffer: Buffer, filename: string, hint = ''): Promise<VisionResult | null> {
  if (!env.PYTHON_AI_URL || !imageBuffer.length) return null;
  const form = new FormData();
  form.append('image', new Blob([new Uint8Array(imageBuffer)]), filename);
  if (hint) form.append('hint', hint);
  try {
    const response = await axios.post(`${env.PYTHON_AI_URL}/classify`, form, { timeout: 10000, maxBodyLength: 12 * 1024 * 1024 });
    return response.data as VisionResult;
  } catch {
    return null;
  }
}