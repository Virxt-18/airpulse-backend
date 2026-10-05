import { Hotspot } from '../types';
import { getCurrentAirQuality } from './airQualityService';
import { getFirePoints, countFiresNear } from './fireService';
import { getPredictionWeather, MONITORED_CITIES } from './environmentDataService';
import { getReportsByLocation } from './reportService';
import { haversineKm } from './geo';

const CACHE_MS = 5 * 60 * 1000;
const RADIUS_KM = 60;

let cache: { at: number; hotspots: Hotspot[] } | null = null;

type Evidence = { fires: number; fireRadiusKm: number; reports: number; categories: Record<string, number> };

/**
 * Source attribution from the signals actually available: satellite fire
 * detections, citizen report categories, and wind transport. Weights sum to 1,
 * and the dominant signal becomes the reported `source`.
 */
function attributeSource(evidence: Evidence, windSpeed: number, humidity: number): { source: string; attribution: Hotspot['attribution'] } {
  const industrial = (evidence.categories.Industrial ?? 0) * 2 + (evidence.categories['Garbage burning'] ?? 0);
  const biomass = evidence.fires * (evidence.categories['Crop burning'] ? 2 : 1) * 3;
  const traffic = (evidence.categories.Traffic ?? 0) * 2 + (evidence.categories.Dust ?? 0);
  const dust = windSpeed > 14 ? 6 : 0;
  const humidityLoad = humidity > 75 ? 4 : 0;

  const raw: Array<[string, number]> = [
    ['Biomass burning', biomass + humidityLoad],
    ['Industrial emissions', industrial],
    ['Traffic congestion', traffic],
    ['Dust resuspension', dust]
  ];
  const total = raw.reduce((sum, [, weight]) => sum + weight, 0);
  if (total === 0) return { source: 'Unattributed local emission', attribution: {} };

  const attribution = Object.fromEntries(raw.map(([label, weight]) => [label, Number((weight / total).toFixed(2))])) as Hotspot['attribution'];
  const [source] = raw.reduce((top, candidate) => (candidate[1] > top[1] ? candidate : top));
  return { source: source === 'Biomass burning' && evidence.fires === 0 ? 'Humidity-driven haze' : source, attribution };
}

function severityFor(aqi: number): Hotspot['severity'] {
  if (aqi >= 200) return 'critical';
  if (aqi >= 150) return 'high';
  if (aqi >= 100) return 'moderate';
  return 'normal';
}

/** Confidence grows with independent corroborating signals, not with AQI alone. */
function confidenceFor(evidence: Evidence, live: boolean): number {
  let confidence = 0.42;
  if (live) confidence += 0.22;
  if (evidence.fires > 0) confidence += 0.15;
  if (evidence.reports > 0) confidence += 0.1;
  if (evidence.reports >= 5) confidence += 0.08;
  return Number(Math.min(0.97, confidence).toFixed(2));
}

/**
 * Detect hyper-local pollution hotspots by fusing ground stations (AQICN),
 * satellite fire detections (NASA FIRMS) and citizen reports for every city in
 * the monitored corridors. This replaces the previous hardcoded hotspot list.
 */
export async function detectHotspots(options: { refresh?: boolean } = {}): Promise<Hotspot[]> {
  if (!options.refresh && cache && Date.now() - cache.at < CACHE_MS) return cache.hotspots;

  const cities = Object.keys(MONITORED_CITIES);
  const fires = await getFirePoints();
  const reports = await getReportsByLocation();

  const hotspots = await Promise.all(cities.map(async (city) => {
    const coordinates = MONITORED_CITIES[city];
    const [airQuality, weather] = await Promise.all([
      getCurrentAirQuality(city, coordinates.latitude, coordinates.longitude),
      getPredictionWeather(coordinates.latitude, coordinates.longitude).catch(() => null)
    ]);

    const nearbyFires = countFiresNear(fires, coordinates.latitude, coordinates.longitude, 120);
    const cityReports = reports.filter((report) =>
      haversineKm(coordinates.latitude, coordinates.longitude, report.latitude, report.longitude) <= RADIUS_KM ||
      report.location.toLowerCase().startsWith(city.toLowerCase())
    );
    const evidence: Evidence = {
      fires: nearbyFires.length,
      fireRadiusKm: nearbyFires.length ? Math.round(Math.min(...nearbyFires.map((fire) =>
        haversineKm(coordinates.latitude, coordinates.longitude, fire.latitude, fire.longitude)))) : 0,
      reports: cityReports.length,
      categories: cityReports.reduce<Record<string, number>>((counts, report) => {
        counts[report.category] = (counts[report.category] ?? 0) + 1;
        return counts;
      }, {})
    };

    const windSpeed = weather?.windSpeed ?? 0;
    const humidity = weather?.humidity ?? 0;
    const { source, attribution } = attributeSource(evidence, windSpeed, humidity);

    return {
      location: `${city} metro cluster`,
      aqi: airQuality.aqi,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      severity: severityFor(airQuality.aqi),
      pm25: airQuality.pm25,
      source,
      attribution,
      confidence: confidenceFor(evidence, airQuality.source === 'station'),
      evidence: { fireDetections: evidence.fires, citizenReports: evidence.reports, windSpeed, humidity },
      detectedAt: new Date().toISOString()
    };
  }));

  const ranked = hotspots
    .filter((hotspot) => hotspot.aqi >= 80 || hotspot.evidence.fireDetections > 0 || hotspot.evidence.citizenReports > 0)
    .sort((a, b) => b.aqi - a.aqi);

  cache = { at: Date.now(), hotspots: ranked };
  return ranked;
}

export async function listHotspots(location?: string): Promise<Hotspot[]> {
  const hotspots = await detectHotspots();
  if (!location) return hotspots;
  const query = location.toLowerCase();
  return hotspots.filter((hotspot) => hotspot.location.toLowerCase().includes(query));
}

export async function topHotspots(limit = 3): Promise<Hotspot[]> {
  return (await detectHotspots()).slice(0, limit);
}