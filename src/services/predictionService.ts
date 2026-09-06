import { Prediction } from '../types';
import { requestPrediction } from '../ai/pythonAIService';
import { getCurrentAirQuality } from './airQualityService';
import { listHotspots } from './hotspotService';
import { listReports } from './reportService';
import { getPredictionWeather } from './environmentDataService';

export async function predictAirQuality(location = 'Bengaluru', horizonHours = 24): Promise<Prediction> {
  const safeHorizon = Math.min(Math.max(Math.round(horizonHours), 1), 168);
  const airQuality = await getCurrentAirQuality(location);
  const [weather, hotspots, reports] = await Promise.all([
    getPredictionWeather().catch(() => ({ temperature: 28, humidity: 60, windSpeed: 8 })),
    listHotspots(),
    listReports()
  ]);
  const fireDetections = hotspots.filter((hotspot) => hotspot.aqi >= 150).length;
  const features = {
    current_aqi: airQuality.aqi,
    pm25: airQuality.pm25,
    pm10: airQuality.pm10,
    temperature: weather.temperature,
    humidity: weather.humidity,
    wind_speed: weather.windSpeed,
    fire_detections: fireDetections,
    citizen_reports: reports.length,
    horizon_hours: safeHorizon
  };

  let modelPrediction;
  try {
    modelPrediction = await requestPrediction(features);
  } catch {
    const stagnationFactor = Math.max(0, 12 - weather.windSpeed) * 1.2;
    const fireFactor = fireDetections * 4;
    const reportFactor = reports.length * 1.5;
    const predictedAqi = airQuality.aqi + stagnationFactor + fireFactor + reportFactor;
    const spikeProbability = Math.min(99, Math.max(5, Math.round((predictedAqi - airQuality.aqi) * 3)));
    modelPrediction = {
      predictedAqi,
      spikeProbability,
      confidence: 0.6
    };
  }

  return {
    location,
    currentAqi: airQuality.aqi,
    predictedAqi: Math.round(modelPrediction.predictedAqi),
    horizonHours: safeHorizon,
    spikeProbability: modelPrediction.spikeProbability,
    confidence: modelPrediction.confidence,
    factors: {
      temperature: weather.temperature,
      humidity: weather.humidity,
      windSpeed: weather.windSpeed,
      fireDetections,
      citizenReports: reports.length
    }
  };
}
