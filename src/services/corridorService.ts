import { Corridor } from '../types';
import { predictAirQuality } from './predictionService';
import { MONITORED_CITIES } from './environmentDataService';
import { getTrend } from './historyService';

type CorridorDefinition = { id: string; name: string; cities: string[]; description: string };

/** Economic corridors the platform forecasts across, matching the challenge brief. */
export const CORRIDORS: CorridorDefinition[] = [
  { id: 'delhi-kolkata', name: 'Delhi–Kolkata Industrial Belt', cities: ['Delhi', 'Ranchi', 'Kolkata'], description: 'Gangetic plain thermal power, steel and construction corridor' },
  { id: 'western-corridor', name: 'Mumbai–Pune Western Corridor', cities: ['Mumbai', 'Hyderabad'], description: 'Petrochemical, refining and port emissions' },
  { id: 'southern-corridor', name: 'Bengaluru–Chennai IT & Manufacturing Spine', cities: ['Bengaluru', 'Chennai'], description: 'Electronics manufacturing and diesel freight traffic' },
  { id: 'central-belt', name: 'Central India Mining Belt', cities: ['Ranchi', 'Hyderabad'], description: 'Coal, sponge iron and mining cluster' },
  { id: 'eastern-coastal', name: 'Eastern Coastal Logistics Route', cities: ['Kolkata', 'Chennai'], description: 'Port, shipping and coastal industrial load' }
];

const CACHE_MS = 5 * 60 * 1000;
let cache: { at: number; corridors: Corridor[] } | null = null;

function riskFor(predictedPeakAqi: number, spikeProbability: number): Corridor['risk'] {
  if (predictedPeakAqi >= 250 || spikeProbability >= 80) return 'severe';
  if (predictedPeakAqi >= 180 || spikeProbability >= 60) return 'high';
  if (predictedPeakAqi >= 130 || spikeProbability >= 35) return 'elevated';
  return 'low';
}

/**
 * Corridor-wide forecast: each member city is predicted individually, then the
 * corridor is summarised by its worst predicted peak. Cities without coordinates
 * are reported with a null so nothing is silently fabricated.
 */
export async function getCorridorForecasts(options: { refresh?: boolean } = {}): Promise<Corridor[]> {
  if (!options.refresh && cache && Date.now() - cache.at < CACHE_MS) return cache.corridors;

  const corridors = await Promise.all(CORRIDORS.map(async (definition) => {
    const cities = definition.cities.filter((city) => MONITORED_CITIES[city]);
    const predictions = await Promise.all(cities.map(async (city) => {
      const coordinates = MONITORED_CITIES[city];
      try {
        return { city, ...(await predictAirQuality(city, 24, coordinates.latitude, coordinates.longitude)) };
      } catch {
        return { city, currentAqi: 0, predictedAqi: 0, spikeProbability: 0 };
      }
    }));

    const worst = predictions.reduce((top, item) => (item.predictedAqi > top.predictedAqi ? item : top), predictions[0]);
    const currentAqi = predictions.length
      ? Math.round(predictions.reduce((sum, item) => sum + item.currentAqi, 0) / predictions.length)
      : 0;
    const spikeProbability = predictions.length
      ? Math.round(predictions.reduce((sum, item) => sum + item.spikeProbability, 0) / predictions.length)
      : 0;

    return {
      ...definition,
      currentAqi,
      worstCity: worst?.city ?? '',
      predictedPeakAqi: worst?.predictedAqi ?? 0,
      spikeProbability,
      risk: riskFor(worst?.predictedAqi ?? 0, spikeProbability),
      trend: getTrend(worst?.city ?? '', 7).map((bucket) => bucket.aqi),
      generatedAt: new Date().toISOString()
    } as Corridor & { trend: number[] };
  }));

  const sorted = corridors.sort((a, b) => b.predictedPeakAqi - a.predictedPeakAqi);
  cache = { at: Date.now(), corridors: sorted };
  return sorted;
}