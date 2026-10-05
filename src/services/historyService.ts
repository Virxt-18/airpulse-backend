import { AirQuality } from '../types';

/**
 * Rolling in-memory sample store. Every live AQI read is recorded here so the
 * analytics endpoint reports observed data instead of invented arrays.
 */
const samples: Array<AirQuality & { at: number }> = [];
const MAX_SAMPLES = 20000;
const SAMPLE_INTERVAL_MS = 30 * 60 * 1000;

export function recordAirQualitySample(airQuality: AirQuality): void {
  const last = samples[samples.length - 1];
  if (last && last.location === airQuality.location && Date.now() - last.at < SAMPLE_INTERVAL_MS) return;
  samples.push({ ...airQuality, at: Date.now() });
  if (samples.length > MAX_SAMPLES) samples.splice(0, samples.length - MAX_SAMPLES);
}

export function getSamples(location?: string, sinceMs = 7 * 24 * 60 * 60 * 1000): Array<AirQuality & { at: number }> {
  const cutoff = Date.now() - sinceMs;
  return samples.filter((sample) => sample.at >= cutoff && (!location || sample.location === location));
}

export type TrendBucket = { label: string; aqi: number | null; pm25: number | null; pm10: number | null; samples: number };

function bucketize(rows: Array<{ at: number } & AirQuality>, buckets: number, spanMs: number): TrendBucket[] {
  const now = Date.now();
  const width = spanMs / buckets;
  const totals = Array.from({ length: buckets }, () => ({ aqi: 0, pm25: 0, pm10: 0, count: 0, pmCount: 0 }));
  for (const row of rows) {
    // Bucket 0 is the oldest window, the last bucket is the most recent.
    const ageIndex = Math.floor((now - row.at) / width);
    const index = Math.min(buckets - 1, Math.max(0, buckets - 1 - ageIndex));
    totals[index].aqi += row.aqi;
    if (row.pm25 !== null) {
      totals[index].pm25 += row.pm25;
      totals[index].pm10 += row.pm10 ?? 0;
      totals[index].pmCount += 1;
    }
    totals[index].count += 1;
  }
  return totals.map((total, index) => ({
    label: new Date(now - (buckets - 1 - index) * width).toISOString(),
    aqi: total.count ? Math.round(total.aqi / total.count) : null,
    pm25: total.pmCount ? Math.round(total.pm25 / total.pmCount) : null,
    pm10: total.pmCount ? Math.round(total.pm10 / total.pmCount) : null,
    samples: total.count
  }));
}

/**
 * Average AQI trend per location. Falls back to a single "observed now" bucket so
 * a freshly booted server returns the current reading rather than zeros.
 */
export function getTrend(location: string, buckets = 7, spanMs = 7 * 24 * 60 * 60 * 1000): TrendBucket[] {
  const rows = getSamples(location, spanMs);
  const trend = bucketize(rows, buckets, spanMs);
  const latest = rows.at(-1);
  if (latest && !trend.some((bucket) => bucket.samples > 0)) {
    trend[buckets - 1] = { label: new Date().toISOString(), aqi: latest.aqi, pm25: latest.pm25, pm10: latest.pm10, samples: 1 };
  }
  return trend;
}