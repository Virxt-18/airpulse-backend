export type AirQuality = {
  location: string;
  aqi: number;
  category: string;
  pm25: number;
  pm10: number;
  measuredAt: string;
};

export type Hotspot = { location: string; aqi: number; latitude: number; longitude: number };
export type Prediction = {
  location: string;
  currentAqi: number;
  predictedAqi: number;
  horizonHours: number;
  spikeProbability: number;
  confidence: number;
  factors: {
    temperature: number;
    humidity: number;
    windSpeed: number;
    fireDetections: number;
    citizenReports: number;
  };
};
export type Report = { id: string; location: string; status: 'received' | 'reviewed'; description: string; createdAt: string };
export type Alert = { id: string; location: string; threshold: number; enabled: boolean };
