import { env } from '../config/env';
import { fetchFirmsCsv } from './environmentDataService';
import { haversineKm } from './geo';

export type FirePoint = {
  latitude: number;
  longitude: number;
  at: string;
  confidence: string;
  frp: number;
};

/** FIRMS CSV columns are stable across products, but read them by header name anyway. */
export function parseFirmsCsv(csv: string): FirePoint[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const header = lines[0].split(',').map((column) => column.trim().toLowerCase());
  const index = (name: string) => header.indexOf(name);
  const latIndex = index('latitude');
  const lonIndex = index('longitude');
  if (latIndex < 0 || lonIndex < 0) return [];

  return lines.slice(1).flatMap((line) => {
    const cells = line.split(',');
    const latitude = Number(cells[latIndex]);
    const longitude = Number(cells[lonIndex]);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return [];
    const date = cells[index('acq_date')] ?? '';
    const time = (cells[index('acq_time')] ?? '').padStart(4, '0');
    return [{
      latitude,
      longitude,
      at: date && time.length === 4 ? `${date}T${time.slice(0, 2)}:${time.slice(2)}:00Z` : new Date().toISOString(),
      confidence: cells[index('confidence')] || 'low',
      frp: Number(cells[index('frp')]) || 0
    }];
  });
}

/**
 * Thermal fire detections for a bounding box, used as the satellite layer of the
 * hotspot detector. Degrades to an empty list when FIRMS is unconfigured or down.
 */
export async function getFirePoints(bbox = env.INDIA_BBOX, days = 2): Promise<FirePoint[]> {
  try {
    return parseFirmsCsv(await fetchFirmsCsv(bbox, days));
  } catch {
    return [];
  }
}

export function countFiresNear(points: FirePoint[], latitude: number, longitude: number, radiusKm = 120): FirePoint[] {
  return points.filter((point) => haversineKm(latitude, longitude, point.latitude, point.longitude) <= radiusKm);
}