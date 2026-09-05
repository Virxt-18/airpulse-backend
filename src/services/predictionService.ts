import { Prediction } from '../types';

export async function predictAirQuality(location = 'Bengaluru', horizonHours = 24): Promise<Prediction> {
  return { location, predictedAqi: 84, horizonHours, confidence: 0.86 };
}
