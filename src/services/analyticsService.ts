import { listReports } from './reportService';
import { alertCount } from './alertService';
import { detectHotspots } from './hotspotService';
import { getTrend, getSamples } from './historyService';
import { listAuthorities } from './authorityService';
import { federationStats } from './networkService';
import { getCorridorForecasts } from './corridorService';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Analytics are computed from recorded observations - no placeholder series. */
export async function getAnalytics(location?: string) {
  const [reports, hotspots, corridors, federation] = await Promise.all([
    listReports(),
    detectHotspots(),
    getCorridorForecasts(),
    Promise.resolve(federationStats())
  ]);

  const cityTrend = location ? [getTrend(location, 7)] : [...new Set(getSamples().map((sample) => sample.location))]
    .slice(0, 6)
    .map((city) => getTrend(city, 7));

  const day = DAY_MS;
  const observed = getSamples(location, day).length;
  const previous = getSamples(location, 2 * day).filter((sample) => sample.at < Date.now() - day);

  return {
    metrics: {
      reports: reports.length,
      activeAlerts: alertCount(),
      hotspots: hotspots.length,
      monitoredCities: new Set(getSamples().map((sample) => sample.location)).size,
      observedReadings: observed,
      previousPeriodReadings: previous.length,
      federatedNodes: federation.contributingNodes,
      globalModelAccuracy: federation.globalAccuracy
    },
    trend: {
      aqi: cityTrend[0]?.map((bucket) => bucket.aqi) ?? [],
      pm25: cityTrend[0]?.map((bucket) => bucket.pm25) ?? [],
      pm10: cityTrend[0]?.map((bucket) => bucket.pm10) ?? [],
      perCity: cityTrend.map((trend) => ({
        location: location || 'All cities',
        points: trend.map((bucket) => ({ at: bucket.label, aqi: bucket.aqi, samples: bucket.samples }))
      }))
    },
    fireSignal: {
      hotspotsWithFireEvidence: hotspots.filter((hotspot) => (hotspot.evidence?.fireDetections ?? 0) > 0).length,
      totalFireLinkedHotspots: hotspots.reduce((sum, hotspot) => sum + (hotspot.evidence?.fireDetections ?? 0), 0)
    },
    affectedZones: hotspots.slice(0, 5).map((hotspot) => ({
      location: hotspot.location,
      aqi: hotspot.aqi,
      severity: hotspot.severity,
      source: hotspot.source
    })),
    corridors: corridors.map((corridor) => ({
      id: corridor.id,
      name: corridor.name,
      risk: corridor.risk,
      predictedPeakAqi: corridor.predictedPeakAqi
    })),
    authorityCoverage: listAuthorities().length,
    federation,
    generatedAt: new Date().toISOString(),
    dataNote: observed === 0
      ? 'No readings recorded yet - trends populate as the network polls stations.'
      : `Computed from ${observed} observed reading(s) in the last 24h.`
  };
}