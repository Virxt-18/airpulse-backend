import { Prediction } from '../types';
import { requestPrediction } from '../ai/pythonAIService';
import { getCurrentAirQuality } from './airQualityService';
import { getFirePoints, countFiresNear } from './fireService';
import { getReportsByLocation } from './reportService';
import { getPredictionWeather, MONITORED_CITIES } from './environmentDataService';
import { searchCities } from './geocodingService';
import { haversineKm } from './geo';

async function resolveCoordinates(location: string, latitude?: number, longitude?: number) {
  if (latitude !== undefined && longitude !== undefined) return { latitude, longitude };
  const known = Object.keys(MONITORED_CITIES).find((city) => city.toLowerCase() === location.toLowerCase());
  if (known) return MONITORED_CITIES[known];
  const match = (await searchCities(location).catch(() => []))[0];
  return match ? { latitude: match.latitude, longitude: match.longitude } : null;
}

/**
 * Forecast AQI for a point using ground readings, satellite fire load, citizen
 * pressure and weather, via the Python model service. The heuristic fallback keeps
 * the corridor view alive when the model service is down.
 */
export async function predictAirQuality(location = 'Bengaluru', horizonHours = 24, latitude?: number, longitude?: number): Promise<Prediction> {
  const safeHorizon = Math.min(Math.max(Math.round(horizonHours || 24), 1), 168);
  const coordinates = (await resolveCoordinates(location, latitude, longitude)) || MONITORED_CITIES.Bengaluru;

  const [airQuality, fires, reports] = await Promise.all([
    getCurrentAirQuality(location, coordinates.latitude, coordinates.longitude),
    getFirePoints().catch(() => []),
    getReportsByLocation().catch(() => [])
  ]);
  const weather = await getPredictionWeather(coordinates.latitude, coordinates.longitude)
    .catch(() => ({ temperature: 28, humidity: 60, windSpeed: 8 }));

  // Satellite fire load within the transport radius of this point.
  const nearbyFires = countFiresNear(fires, coordinates.latitude, coordinates.longitude, 150);
  const fireLoad = Number(nearbyFires.reduce((sum, fire) => sum + (fire.frp || 1), 0).toFixed(1));
  const citizenReports = reports.filter((report) =>
    haversineKm(coordinates.latitude, coordinates.longitude, report.latitude, report.longitude) <= 100).length;

  const features = {
    current_aqi: airQuality.aqi,
    pm25: airQuality.pm25 ?? 0,
    pm10: airQuality.pm10 ?? 0,
    temperature: weather.temperature,
    humidity: weather.humidity,
    wind_speed: weather.windSpeed,
    fire_detections: nearbyFires.length,
    fire_load: fireLoad,
    citizen_reports: citizenReports,
    horizon_hours: safeHorizon
  };

  let modelPrediction;
  try {
    modelPrediction = await requestPrediction(features);
  } catch {
    modelPrediction = heuristicForecast(features);
  }

  return {
    location: airQuality.location,
    currentAqi: airQuality.aqi,
    predictedAqi: Math.round(modelPrediction.predictedAqi),
    horizonHours: safeHorizon,
    spikeProbability: modelPrediction.spikeProbability,
    confidence: modelPrediction.confidence,
    dataBasis: airQuality.source,
    factors: {
      temperature: weather.temperature,
      humidity: weather.humidity,
      windSpeed: weather.windSpeed,
      fireDetections: nearbyFires.length,
      citizenReports
    }
  };
}

/** Physics-flavoured fallback: stagnation, smoke load and citizen pressure drive accumulation. */
function heuristicForecast(features: Record<string, number>): { predictedAqi: number; spikeProbability: number; confidence: number } {
  const stagnation = Math.max(0, 12 - features.wind_speed) * 1.2;
  const humidityLoad = Math.max(0, features.humidity - 70) * 0.08;
  // Log-scaled smoke load, capped, so a few large fires cannot dominate.
  const smoke = Math.min(45, 4 * Math.log1p(features.fire_load)) + Math.min(20, features.fire_detections * 2);
  const pressure = Math.min(12, features.citizen_reports * 1.5);
  const horizonFactor = Math.min(features.horizon_hours, 24) / 24;
  const increase = (stagnation + humidityLoad + smoke + pressure) * horizonFactor;
  const predictedAqi = Math.max(features.current_aqi, features.current_aqi + increase);
  return {
    predictedAqi: Number(predictedAqi.toFixed(2)),
    spikeProbability: Math.min(99, Math.max(5, Math.round(35 + increase * 2.5))),
    confidence: Number(Math.min(0.9, Math.max(0.5, 0.55 + Math.min(features.fire_detections, 5) * 0.03)).toFixed(2))
  };
}