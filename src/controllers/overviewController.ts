import { getCurrentAirQuality } from '../services/airQualityService';
import { listHotspots } from '../services/hotspotService';

export async function getOverview() {
  const [airQuality, hotspots] = await Promise.all([getCurrentAirQuality(), listHotspots()]);
  return { airQuality, hotspots, updatedAt: new Date().toISOString() };
}
