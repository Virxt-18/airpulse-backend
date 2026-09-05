import { getCurrentAirQuality } from '../services/airQualityService';

export async function getAirQuality(location?: string) { return getCurrentAirQuality(location); }
