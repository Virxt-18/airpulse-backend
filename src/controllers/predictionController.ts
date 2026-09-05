import { predictAirQuality } from '../services/predictionService';

export async function getPrediction(location?: string, horizonHours?: number) {
  return predictAirQuality(location, horizonHours);
}
