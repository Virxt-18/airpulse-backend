import { AirQuality } from '../types';

const sample: AirQuality = { location: 'Bengaluru', aqi: 78, category: 'Moderate', pm25: 31, pm10: 64, measuredAt: new Date().toISOString() };

export async function getCurrentAirQuality(location = 'Bengaluru'): Promise<AirQuality> {
  return { ...sample, location, measuredAt: new Date().toISOString() };
}
