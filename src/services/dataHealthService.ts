import { env } from '../config/env';
import { getAqicn, fetchFirmsCsv } from './environmentDataService';
import { getFirePoints } from './fireService';
import { requestPrediction } from '../ai/pythonAIService';

type ProviderState = {
  name: string;
  status: 'live' | 'degraded' | 'offline' | 'not-configured';
  detail: string;
};

async function pingReferenceStations(): Promise<ProviderState> {
  if (!env.AQICN_TOKEN) return { name: 'Reference stations (AQICN)', status: 'not-configured', detail: 'AQICN_TOKEN missing' };
  try {
    const response = await getAqicn(28.6139, 77.209) as { status?: string; data?: { time?: { iso?: string } } };
    const iso = response.data?.time?.iso;
    if (response.status !== 'ok' || !iso) return { name: 'Reference stations (AQICN)', status: 'degraded', detail: 'no usable station data' };
    const ageHours = (Date.now() - Date.parse(iso)) / 3_600_000;
    return {
      name: 'Reference stations (AQICN)',
      status: ageHours <= 3 ? 'live' : 'degraded',
      detail: `Delhi station last reported ${ageHours < 1 ? `${Math.round(ageHours * 60)} min` : `${Math.round(ageHours)} h`} ago`
    };
  } catch (error) {
    return { name: 'Reference stations (AQICN)', status: 'offline', detail: (error as Error).message };
  }
}

async function pingSatellite(): Promise<ProviderState> {
  if (!env.NASA_FIRMS_MAP_KEY) return { name: 'Satellite fires (NASA FIRMS)', status: 'not-configured', detail: 'NASA_FIRMS_MAP_KEY missing' };
  try {
    await fetchFirmsCsv('77.5,12.8,77.7,13.1', 1);
    return { name: 'Satellite fires (NASA FIRMS)', status: 'live', detail: 'area query returned data' };
  } catch (error) {
    return { name: 'Satellite fires (NASA FIRMS)', status: 'offline', detail: (error as Error).message };
  }
}

async function pingWeather(): Promise<ProviderState> {
  try {
    const response = await fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=28.61&longitude=77.21&current=temperature_2m&forecast_days=1',
      { signal: AbortSignal.timeout(6000) }
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json() as { current?: { time?: string } };
    return { name: 'Weather (Open-Meteo)', status: 'live', detail: `current observation ${data.current?.time ?? 'unknown'}` };
  } catch (error) {
    return { name: 'Weather (Open-Meteo)', status: 'offline', detail: (error as Error).message };
  }
}

async function pingModel(): Promise<ProviderState> {
  try {
    const result = await requestPrediction({ current_aqi: 100, horizon_hours: 6 });
    return {
      name: 'Forecast model service',
      status: 'live',
      detail: `${result.model ?? 'estimator'} · confidence ${result.confidence}`
    };
  } catch (error) {
    return { name: 'Forecast model service', status: 'degraded', detail: `using heuristic fallback (${(error as Error).message})` };
  }
}

/** Live provenance check so operators can tell measured data from model output. */
export async function getDataHealth() {
  const providers = await Promise.all([pingReferenceStations(), pingSatellite(), pingWeather(), pingModel()]);
  const fires = providers.find((provider) => provider.name.startsWith('Satellite'))?.status === 'live'
    ? (await getFirePoints()).length
    : 0;
  return {
    providers,
    firePointsAvailable: fires,
    degraded: providers.filter((provider) => provider.status !== 'live').map((provider) => provider.name),
    citizenReports: 'in-memory (resets on restart)',
    note: 'Only providers marked live contribute measured data. Everything else is flagged as modelled.'
  };
}