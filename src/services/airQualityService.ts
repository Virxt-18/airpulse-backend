import { AirQuality } from '../types';
import { getAqicnAirQuality, MONITORED_CITIES } from './environmentDataService';
import { recordAirQualitySample } from './historyService';
import { haversineKm } from './geo';

/**
 * Corridor reference levels from published annual city profiles. Used only as the
 * modelled fallback when no fresh station reading exists, and always reported as a
 * modelled value so it is never mistaken for a measurement.
 */
const REFERENCE_LEVELS: Record<string, { aqi: number; pm25: number; pm10: number }> = {
  Delhi: { aqi: 162, pm25: 88, pm10: 136 },
  Ranchi: { aqi: 148, pm25: 79, pm10: 121 },
  Kolkata: { aqi: 128, pm25: 62, pm10: 108 },
  Hyderabad: { aqi: 112, pm25: 51, pm10: 91 },
  Mumbai: { aqi: 96, pm25: 42, pm10: 77 },
  Chennai: { aqi: 84, pm25: 35, pm10: 68 },
  Bengaluru: { aqi: 78, pm25: 31, pm10: 64 }
};

/** Resolve a location label ("Kolkata metro cluster") to a monitored city, if any. */
export function resolveCity(location: string): string | undefined {
  const cleaned = location.replace(/\s*metro cluster$/i, '').trim().toLowerCase();
  if (!cleaned) return undefined; // an empty label must not match the first city
  return Object.keys(REFERENCE_LEVELS).find(
    (city) =>
      city.toLowerCase() === cleaned ||
      cleaned.includes(city.toLowerCase()) ||
      city.toLowerCase().includes(cleaned)
  );
}

/** Reference stations report hourly; anything older cannot drive a live alert. */
const MAX_STATION_AGE_HOURS = 3;
/** A station further than this is a regional stand-in, not a local reading. */
const MAX_STATION_DISTANCE_KM = 60;

function readingAgeHours(measuredAt: string): number {
  const timestamp = Date.parse(measuredAt);
  if (!Number.isFinite(timestamp)) return Number.POSITIVE_INFINITY;
  return (Date.now() - timestamp) / 3_600_000;
}

export function categoryForAqi(aqi: number): string {
  if (aqi >= 201) return 'Very Unhealthy';
  if (aqi >= 151) return 'Unhealthy';
  if (aqi >= 101) return 'Unhealthy for sensitive groups';
  if (aqi >= 51) return 'Moderate';
  return 'Good';
}

/**
 * Modelled fallback. A monitored city uses its own reference profile; anywhere else
 * is projected from the nearest monitored city with distance decay.
 */
function spatialEstimate(latitude?: number, longitude?: number, cityName?: string): { aqi: number; pm25: number; pm10: number; nearestCity: string } {
  if (cityName && REFERENCE_LEVELS[cityName]) return { ...REFERENCE_LEVELS[cityName], nearestCity: cityName };

  const candidates = Object.entries(REFERENCE_LEVELS).filter(([city]) => MONITORED_CITIES[city]);
  const fallback = candidates[candidates.length - 1];
  if (latitude === undefined || longitude === undefined) return { ...fallback[1], nearestCity: fallback[0] };

  const nearest = candidates.reduce((best, candidate) => {
    const coordinates = MONITORED_CITIES[candidate[0]];
    const distance = haversineKm(latitude, longitude, coordinates.latitude, coordinates.longitude);
    return distance < best.distance ? { city: candidate[0], value: candidate[1], distance } : best;
  }, { city: fallback[0], value: fallback[1], distance: Number.POSITIVE_INFINITY });

  const decay = 1 / (1 + nearest.distance / 120);
  return {
    aqi: Math.round(nearest.value.aqi * decay),
    pm25: Math.round(nearest.value.pm25 * decay),
    pm10: Math.round(nearest.value.pm10 * decay),
    nearestCity: nearest.city
  };
}

/**
 * Resolve the reading for a location. A station reading is only used when it is
 * genuinely current: AQICN's free feed happily returns stations that stopped
 * reporting months ago, and acting on those would be worse than useless. Stale
 * readings are surfaced as evidence but never as the live value.
 */
export async function getCurrentAirQuality(location: string | undefined, latitude?: number, longitude?: number): Promise<AirQuality> {
  const hasCoordinates = latitude !== undefined && longitude !== undefined;
  const rawLocation = location?.trim() ?? '';
  // Resolve the monitored city so a bare "?location=Mumbai" targets Mumbai's own
  // coordinates and reference profile instead of defaulting to a single city.
  const cityName = resolveCity(rawLocation);
  const cityCoordinates = cityName ? MONITORED_CITIES[cityName] : undefined;
  const lat = latitude ?? cityCoordinates?.latitude;
  const lon = longitude ?? cityCoordinates?.longitude;
  // A coordinates-only query must not inherit another city's name.
  const normalizedLocation = rawLocation
    || (hasCoordinates ? `Location ${latitude!.toFixed(2)}, ${longitude!.toFixed(2)}` : 'Bengaluru');

  let station: { aqi: number; pm25: number | null; pm10: number | null; measuredAt: string; station: string; ageHours: number; distanceKm: number | null } | undefined;
  try {
    const live = await getAqicnAirQuality(normalizedLocation, lat, lon);
    station = { ...live, ageHours: readingAgeHours(live.measuredAt), distanceKm: live.stationDistanceKm };
  } catch {
    // No station for this location.
  }

  const tooFar = station?.distanceKm !== null && station?.distanceKm !== undefined
    && station.distanceKm > MAX_STATION_DISTANCE_KM;
  const usable = station && station.ageHours <= MAX_STATION_AGE_HOURS && !tooFar;

  if (usable && station) {
    const airQuality: AirQuality = {
      location: station.station === 'AQICN station' ? normalizedLocation : station.station,
      aqi: station.aqi,
      category: categoryForAqi(station.aqi),
      pm25: station.pm25,
      pm10: station.pm10,
      measuredAt: station.measuredAt,
      readingAgeHours: Math.round(station.ageHours * 10) / 10,
      station: station.station,
      source: 'station'
    };
    recordAirQualitySample(airQuality);
    return airQuality;
  }

  const estimate = spatialEstimate(lat, lon, cityName);
  const staleNote = station
    ? tooFar
      ? `nearest station is ${station.distanceKm} km away and ${Math.round(station.ageHours / 24)}d old (AQI ${station.aqi})`
      : `last report ${Math.round(station.ageHours / 24)}d old (AQI ${station.aqi})`
    : 'no station in range';
  const airQuality: AirQuality = {
    location: normalizedLocation,
    aqi: estimate.aqi,
    category: categoryForAqi(estimate.aqi),
    pm25: estimate.pm25,
    pm10: estimate.pm10,
    measuredAt: new Date().toISOString(),
    // The station age is known here (it is what `staleNote` reports) - surface it
    // structurally so the UI can show freshness instead of a bare null.
    readingAgeHours: station ? Math.round(station.ageHours * 10) / 10 : null,
    station: estimate.nearestCity === cityName
      ? `Reference profile for ${cityName} - station ${staleNote}`
      : `Modelled estimate near ${estimate.nearestCity} - station ${staleNote}`,
    source: station ? 'stale-station' : 'estimate',
    lastStationAqi: station?.aqi
  };
  recordAirQualitySample(airQuality);
  return airQuality;
}

export function getReferenceLevel(location: string): number | null {
  return REFERENCE_LEVELS[location]?.aqi ?? null;
}