import { Hotspot } from '../types';

export async function listHotspots(): Promise<Hotspot[]> {
  return [
    { location: 'Peenya', aqi: 156, latitude: 13.028, longitude: 77.519 },
    { location: 'Silk Board', aqi: 132, latitude: 12.917, longitude: 77.623 },
    { location: 'Whitefield', aqi: 101, latitude: 12.969, longitude: 77.75 }
  ];
}
