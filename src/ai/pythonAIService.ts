import axios from 'axios';
import { env } from '../config/env';

export type PredictionInput = Record<string, number> & {
  current_aqi: number;
  horizon_hours: number;
};

export type PredictionOutput = {
  predictedAqi: number;
  spikeProbability: number;
  confidence: number;
};

export async function requestPrediction(features: PredictionInput): Promise<PredictionOutput> {
  const response = await axios.post(`${env.PYTHON_AI_URL}/predict`, { features }, { timeout: 5000 });
  return response.data;
}
