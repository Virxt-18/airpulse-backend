import axios from 'axios';
import { env } from '../config/env';

export async function requestPrediction(features: Record<string, number>) {
  const response = await axios.post(`${env.PYTHON_AI_URL}/predict`, { features }, { timeout: 5000 });
  return response.data;
}
