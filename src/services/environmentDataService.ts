import { env } from '../config/env';
import { haversineKm } from './geo';

const DEFAULT_LATITUDE = 12.9716;
const DEFAULT_LONGITUDE = 77.5946;
const DEFAULT_BBOX = '77.45,12.85,77.75,13.15';

function coordinates(latitude?: number, longitude?: number) {
  return {
    latitude: latitude ?? DEFAULT_LATITUDE,
    longitude: longitude ?? DEFAULT_LONGITUDE
  };
}

async function requestJson(url: string, init?: RequestInit) {
  const response = await fetch(url, { signal: AbortSignal.timeout(8000), ...init });
  if (!response.ok) {
    throw new Error(`Provider returned HTTP ${response.status}`);
  }
  return response.json();
}

export async function getOpenMeteo(latitude?: number, longitude?: number) {
  const point = coordinates(latitude, longitude);
  const params = new URLSearchParams({
    latitude: String(point.latitude),
    longitude: String(point.longitude),
    current: 'temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,precipitation',
    hourly: 'pm10,pm2_5,us_aqi',
    forecast_days: '1',
    timezone: 'auto'
  });
  return requestJson(`https://api.open-meteo.com/v1/forecast?${params}`);
}

export async function getAqicn(latitude?: number, longitude?: number, location?: string) {
  if (!env.AQICN_TOKEN) throw new Error('AQICN_TOKEN is not configured');
  if (location?.trim()) {
    const citySlug = location.trim().toLowerCase().replace(/\s+/g, '-');
    const cityResponse = await requestJson(`https://api.waqi.info/feed/${encodeURIComponent(citySlug)}/?token=${encodeURIComponent(env.AQICN_TOKEN)}`) as { status?: string };
    if (cityResponse.status === 'ok') return cityResponse;
  }
  if (latitude === undefined || longitude === undefined) throw new Error('AQICN coordinates are required when no city feed is available');
  const point = coordinates(latitude, longitude);
  return requestJson(`https://api.waqi.info/feed/geo:${point.latitude};${point.longitude}/?token=${encodeURIComponent(env.AQICN_TOKEN)}`);
}

type AqicnResponse = {
  status: string;
  data?: {
    aqi?: number | string;
    city?: { name?: string; geo?: [number, number] };
    time?: { iso?: string };
    iaqi?: { pm25?: { v?: number }; pm10?: { v?: number } };
  };
};

// AQICN `iaqi.*.v` values are AQI sub-indices, not concentrations. Convert them
// back to µg/m³ with the EPA piecewise-linear breakpoints so the UI never labels
// an index as a concentration.
const PM25_BREAKPOINTS: Array<[number, number, number, number]> = [
  [0, 50, 0.0, 9.0], [51, 100, 9.1, 35.4], [101, 150, 35.5, 55.4],
  [151, 200, 55.5, 125.4], [201, 300, 125.5, 225.4], [301, 400, 225.5, 250.4],
  [401, 500, 250.5, 500.4]
];
const PM10_BREAKPOINTS: Array<[number, number, number, number]> = [
  [0, 50, 0, 54], [51, 100, 55, 154], [101, 150, 155, 254],
  [151, 200, 255, 354], [201, 300, 355, 424], [301, 400, 425, 504],
  [401, 500, 505, 604]
];

function subIndexToConcentration(index: number, breakpoints: Array<[number, number, number, number]>): number {
  const band = breakpoints.find(([low]) => index <= low) ?? breakpoints[breakpoints.length - 1];
  const [indexLow, indexHigh, concentrationLow, concentrationHigh] = band;
  const span = indexHigh - indexLow || 1;
  const ratio = Math.max(0, Math.min(1, (index - indexLow) / span));
  return Number((concentrationLow + ratio * (concentrationHigh - concentrationLow)).toFixed(1));
}

export async function getAqicnAirQuality(location: string, latitude?: number, longitude?: number) {
  const response = await getAqicn(latitude, longitude, location) as AqicnResponse;
  if (response.status !== 'ok' || !response.data) throw new Error('AQICN returned no usable station data');
  const aqi = Number(response.data.aqi);
  if (!Number.isFinite(aqi)) throw new Error('AQICN returned an invalid AQI');
  const subIndex = (value: { v?: number } | undefined, table: typeof PM25_BREAKPOINTS) =>
    value?.v === undefined || !Number.isFinite(Number(value.v))
      ? null
      : subIndexToConcentration(Number(value.v), table);
  const stationGeo = response.data.city?.geo;
  const distanceKm = stationGeo && latitude !== undefined && longitude !== undefined
    ? haversineKm(latitude, longitude, Number(stationGeo[0]), Number(stationGeo[1]))
    : null;
  return {
    aqi: Math.max(0, Math.round(aqi)),
    pm25: subIndex(response.data.iaqi?.pm25, PM25_BREAKPOINTS),
    pm10: subIndex(response.data.iaqi?.pm10, PM10_BREAKPOINTS),
    measuredAt: response.data.time?.iso || new Date().toISOString(),
    station: response.data.city?.name || 'AQICN station',
    stationDistanceKm: distanceKm === null ? null : Math.round(distanceKm)
  };
}

/** Raw FIRMS area query, the satellite fire layer used by hotspot detection. */
export async function fetchFirmsCsv(bbox = DEFAULT_BBOX, days = 1): Promise<string> {
  if (!env.NASA_FIRMS_MAP_KEY) {
    throw new Error('NASA_FIRMS_MAP_KEY is not configured');
  }
  const safeDays = Math.min(Math.max(days, 1), 10);
  const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${env.NASA_FIRMS_MAP_KEY}/VIIRS_SNPP_NRT/${bbox}/${safeDays}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`NASA FIRMS returned HTTP ${response.status}`);
  return response.text();
}

export async function getNasaFirms(bbox = DEFAULT_BBOX, days = 1) {
  return { format: 'csv', data: await fetchFirmsCsv(bbox, days) };
}

/** Cities across the monitored economic corridors; the geo lookup is shared with the frontend. */
export const MONITORED_CITIES: Record<string, { latitude: number; longitude: number }> = {
  Bengaluru: { latitude: 12.9716, longitude: 77.5946 },
  Ranchi: { latitude: 23.3441, longitude: 85.3096 },
  Delhi: { latitude: 28.6139, longitude: 77.209 },
  Mumbai: { latitude: 19.076, longitude: 72.8777 },
  Chennai: { latitude: 13.0827, longitude: 80.2707 },
  Hyderabad: { latitude: 17.385, longitude: 78.4867 },
  Kolkata: { latitude: 22.5726, longitude: 88.3639 }
};

export function resolveCityCoordinates(location: string) {
  return Object.keys(MONITORED_CITIES).find((city) => city.toLowerCase() === location.trim().toLowerCase());
}

export async function getPredictionWeather(latitude?: number, longitude?: number) {
  const point = coordinates(latitude, longitude);
  const params = new URLSearchParams({
    latitude: String(point.latitude),
    longitude: String(point.longitude),
    current: 'temperature_2m,relative_humidity_2m,wind_speed_10m',
    timezone: 'auto'
  });
  const data = await requestJson(`https://api.open-meteo.com/v1/forecast?${params}`) as {
    current?: {
      temperature_2m?: number;
      relative_humidity_2m?: number;
      wind_speed_10m?: number;
    };
  };
  return {
    temperature: data.current?.temperature_2m ?? 28,
    humidity: data.current?.relative_humidity_2m ?? 60,
    windSpeed: data.current?.wind_speed_10m ?? 8
  };
}

