import { getCurrentAirQuality } from '../services/airQualityService';
import { listHotspots } from '../services/hotspotService';
import { getCorridorForecasts } from '../services/corridorService';
import { listIncidents } from '../services/alertService';

/** Command-centre snapshot: live reading, hidden hotspots, corridor risk, open incidents. */
export async function getOverview(location?: string) {
  const [airQuality, hotspots, corridors, incidents] = await Promise.all([
    getCurrentAirQuality(location),
    listHotspots(),
    getCorridorForecasts(),
    listIncidents()
  ]);
  return {
    airQuality,
    hotspots: hotspots.slice(0, 5),
    corridors,
    incidents,
    updatedAt: new Date().toISOString()
  };
}