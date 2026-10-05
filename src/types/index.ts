export type AirQuality = {
  location: string;
  aqi: number;
  category: string;
  /** Null when the provider does not report this pollutant. */
  pm25: number | null;
  pm10: number | null;
  measuredAt: string;
  /** Hours since the station reported; null when no reading was available. */
  readingAgeHours: number | null;
  station?: string;
  /**
   * `station` = fresh reference data, `stale-station` = the station exists but its
   * last report is too old to trust, `estimate` = corridor model fallback.
   */
  source: 'station' | 'stale-station' | 'estimate';
  /** Last value the station did report, kept for transparency when it is stale. */
  lastStationAqi?: number;
};

export type HotspotAttribution = Partial<Record<'Industrial emissions' | 'Biomass burning' | 'Traffic congestion' | 'Dust resuspension', number>>;

export type Hotspot = {
  location: string;
  aqi: number;
  latitude: number;
  longitude: number;
  severity: 'critical' | 'high' | 'moderate' | 'normal';
  pm25: number | null;
  source: string;
  confidence: number;
  attribution: HotspotAttribution;
  evidence: { fireDetections: number; citizenReports: number; windSpeed: number; humidity: number };
  detectedAt: string;
};

export type Prediction = {
  location: string;
  currentAqi: number;
  predictedAqi: number;
  horizonHours: number;
  spikeProbability: number;
  confidence: number;
  /** Provenance of the reading the forecast is based on. */
  dataBasis: 'station' | 'stale-station' | 'estimate';
  factors: {
    temperature: number;
    humidity: number;
    windSpeed: number;
    fireDetections: number;
    citizenReports: number;
  };
};

export type Report = {
  id: string;
  location: string;
  status: 'received' | 'reviewed' | 'under-investigation' | 'actioned';
  category: string;
  description: string;
  latitude: number;
  longitude: number;
  imageName?: string;
  imagePath?: string;
  aiClassification?: string;
  aiConfidence?: number;
  aiModel?: string;
  createdAt: string;
};

export type Alert = {
  id: string;
  location: string;
  threshold: number;
  enabled: boolean;
  status: 'active' | 'resolved';
  /** `rule` = user subscribed, `auto` = raised by the prediction engine. */
  origin: 'rule' | 'auto';
  severity: 'watch' | 'warning' | 'critical';
  predictedAqi?: number;
  spikeProbability?: number;
  dataBasis?: 'station' | 'stale-station' | 'estimate';
  authority: Authority;
  triggeredAt: string;
};

export type Authority = {
  zone: string;
  body: string;
  officer: string;
  channel: string;
};

export type NetworkNode = {
  city: string;
  modelVersion: string;
  accuracy: number;
  status: 'online' | 'syncing' | 'offline';
  samples: number;
  lastSync: string;
};

export type FederatedNetwork = {
  nodes: NetworkNode[];
  globalModel: { version: string; accuracy: number; lastAggregation: string; rawDataShared: false };
  models: SharedModel[];
};

export type SharedModel = {
  city: string;
  version: string;
  accuracy: number;
  publishedAt: string;
  /** Gradient statistics only - no raw citizen readings ever leave a city node. */
  update: { samples: number; meanResidual: number; drift: number };
};

export type Corridor = {
  id: string;
  name: string;
  cities: string[];
  description: string;
  currentAqi: number;
  worstCity: string;
  predictedPeakAqi: number;
  spikeProbability: number;
  risk: 'low' | 'elevated' | 'high' | 'severe';
  trend: number[];
  generatedAt: string;
};