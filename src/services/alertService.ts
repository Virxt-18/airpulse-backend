import { Alert } from '../types';
import { routeAuthority } from './authorityService';
import { predictAirQuality } from './predictionService';
import { detectHotspots } from './hotspotService';
import { MONITORED_CITIES } from './environmentDataService';

const alerts: Alert[] = [];
const COOLDOWN_MS = 30 * 60 * 1000;

export function alertCount(): number { return alerts.length; }
export async function listAlerts(): Promise<Alert[]> { return alerts; }

function severityFor(predictedAqi: number, threshold: number): Alert['severity'] {
  if (predictedAqi >= threshold + 80 || predictedAqi >= 250) return 'critical';
  if (predictedAqi >= threshold + 25) return 'warning';
  return 'watch';
}

/**
 * An alert should only fire on evidence an authority can act on. A fresh station
 * reading may trip on the AQI threshold alone; a modelled forecast has to clear a
 * much wider margin before it pages anyone.
 */
function shouldRaiseAlert(prediction: { predictedAqi: number; spikeProbability: number; dataBasis: 'station' | 'stale-station' | 'estimate' }, threshold: number): boolean {
  if (prediction.predictedAqi < threshold) return false;
  const margin = prediction.dataBasis === 'station' ? 0 : prediction.dataBasis === 'stale-station' ? 25 : 40;
  return prediction.predictedAqi >= threshold + margin && prediction.spikeProbability >= 70;
}

export async function subscribeAlert(location: string, threshold: number): Promise<Alert> {
  const alert: Alert = {
    id: crypto.randomUUID(),
    location,
    threshold,
    enabled: true,
    status: 'active',
    origin: 'rule',
    severity: severityFor(threshold, threshold),
    authority: routeAuthority(location),
    triggeredAt: new Date().toISOString()
  };
  alerts.unshift(alert);
  return alert;
}

/**
 * Evaluate the monitored cities and raise alerts for predicted spikes, routed to
 * the responsible authority. Deduplicated per location within a cooldown window so
 * repeated evaluations do not spam authorities.
 */
export async function evaluateAlerts(options: { refresh?: boolean } = {}): Promise<{ evaluated: number; raised: Alert[] }> {
  const cities = Object.keys(MONITORED_CITIES);
  const hotspots = await detectHotspots({ refresh: options.refresh });
  const raised: Alert[] = [];

  const evaluations = await Promise.all(cities.map(async (city) => {
    const coordinates = MONITORED_CITIES[city];
    try {
      const prediction = await predictAirQuality(city, 24, coordinates.latitude, coordinates.longitude);
      return { city, prediction };
    } catch {
      return null;
    }
  }));

  for (const evaluation of evaluations) {
    if (!evaluation) continue;
    const { city, prediction } = evaluation;
    const threshold = 150;
    if (!shouldRaiseAlert(prediction, threshold)) continue;

    const existing = alerts.find((alert) => alert.origin === 'auto' && alert.location === city && alert.status === 'active');
    if (existing) {
      if (Date.now() - Date.parse(existing.triggeredAt) < COOLDOWN_MS) continue;
      existing.predictedAqi = prediction.predictedAqi;
      existing.spikeProbability = prediction.spikeProbability;
      existing.dataBasis = prediction.dataBasis;
      existing.severity = severityFor(prediction.predictedAqi, threshold);
      existing.triggeredAt = new Date().toISOString();
      raised.push(existing);
      continue;
    }

    const hotspot = hotspots.find((item) => item.location.toLowerCase().startsWith(city.toLowerCase()));
    const alert: Alert = {
      id: crypto.randomUUID(),
      location: hotspot?.location || city,
      threshold,
      enabled: true,
      status: 'active',
      origin: 'auto',
      severity: severityFor(prediction.predictedAqi, threshold),
      predictedAqi: prediction.predictedAqi,
      spikeProbability: prediction.spikeProbability,
      dataBasis: prediction.dataBasis,
      authority: routeAuthority(hotspot?.location || city),
      triggeredAt: new Date().toISOString()
    };
    alerts.unshift(alert);
    raised.push(alert);
  }

  return { evaluated: cities.length, raised };
}

export async function updateAlert(id: string, action: 'resolve' | 'enable' | 'disable'): Promise<Alert | undefined> {
  const alert = alerts.find((item) => item.id === id);
  if (!alert) return undefined;
  if (action === 'resolve') alert.status = 'resolved';
  if (action === 'enable') alert.enabled = true;
  if (action === 'disable') alert.enabled = false;
  return alert;
}

/** Open incidents across raised alerts and detected hotspots, for the response console. */
export async function listIncidents() {
  const hotspots = await detectHotspots();
  const openAlerts = alerts.filter((alert) => alert.status === 'active');
  return openAlerts.map((alert) => {
    const hotspot = hotspots.find((item) => item.location === alert.location);
    return {
      id: alert.id,
      location: alert.location,
      severity: alert.severity,
      origin: alert.origin,
      predictedAqi: alert.predictedAqi ?? hotspot?.aqi ?? null,
      spikeProbability: alert.spikeProbability ?? null,
      dataBasis: alert.dataBasis ?? (hotspot ? 'station' : 'estimate'),
      evidence: hotspot?.evidence ?? null,
      attribution: hotspot?.attribution ?? {},
      authority: alert.authority,
      triggeredAt: alert.triggeredAt,
      status: alert.status
    };
  });
}