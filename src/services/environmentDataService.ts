import { env } from '../config/env';

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
  const response = await fetch(url, init);
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

export async function getOpenAq(latitude?: number, longitude?: number) {
  if (!env.OPENAQ_API_KEY) {
    throw new Error('OPENAQ_API_KEY is not configured');
  }
  const point = coordinates(latitude, longitude);
  const params = new URLSearchParams({
    coordinates: `${point.latitude},${point.longitude}`,
    radius: '25000',
    limit: '100'
  });
  return requestJson(`https://api.openaq.org/v3/latest?${params}`, {
    headers: env.OPENAQ_API_KEY ? { 'X-API-Key': env.OPENAQ_API_KEY } : undefined
  });
}

export async function getNasaFirms(bbox = DEFAULT_BBOX, days = 1) {
  if (!env.NASA_FIRMS_MAP_KEY) {
    throw new Error('NASA_FIRMS_MAP_KEY is not configured');
  }
  const safeDays = Math.min(Math.max(days, 1), 10);
  const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${env.NASA_FIRMS_MAP_KEY}/VIIRS_SNPP_NRT/${bbox}/${safeDays}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`NASA FIRMS returned HTTP ${response.status}`);
  return { format: 'csv', data: await response.text() };
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

