type Coordinates = { latitude: number; longitude: number };
export type CitySuggestion = Coordinates & { city: string; displayName: string };

const knownCities: CitySuggestion[] = [
  { city: 'Bengaluru', displayName: 'Bengaluru, Karnataka, India', latitude: 12.9716, longitude: 77.5946 },
  { city: 'Ranchi', displayName: 'Ranchi, Jharkhand, India', latitude: 23.3441, longitude: 85.3096 },
  { city: 'Delhi', displayName: 'New Delhi, Delhi, India', latitude: 28.6139, longitude: 77.209 },
  { city: 'Mumbai', displayName: 'Mumbai, Maharashtra, India', latitude: 19.076, longitude: 72.8777 },
  { city: 'Chennai', displayName: 'Chennai, Tamil Nadu, India', latitude: 13.0827, longitude: 80.2707 },
  { city: 'Hyderabad', displayName: 'Hyderabad, Telangana, India', latitude: 17.385, longitude: 78.4867 },
  { city: 'Kolkata', displayName: 'Kolkata, West Bengal, India', latitude: 22.5726, longitude: 88.3639 }
];

function nearestKnownCity(latitude: number, longitude: number): CitySuggestion {
  return knownCities.reduce((nearest, city) => {
    const distance = Math.hypot(city.latitude - latitude, city.longitude - longitude);
    const nearestDistance = Math.hypot(nearest.latitude - latitude, nearest.longitude - longitude);
    return distance < nearestDistance ? city : nearest;
  });
}

export async function reverseGeocode(latitude: number, longitude: number): Promise<CitySuggestion> {
  const fallback = nearestKnownCity(latitude, longitude);
  try {
    const params = new URLSearchParams({ format: 'jsonv2', lat: String(latitude), lon: String(longitude), zoom: '10' });
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
      headers: { 'User-Agent': 'AirGuard climate intelligence prototype' }
    });
    if (!response.ok) return fallback;
    const data = await response.json() as { display_name?: string; address?: Record<string, string> };
    const address = data.address || {};
    const city = address.city || address.town || address.municipality || address.county || fallback.city;
    return { city, displayName: data.display_name || `${city}, India`, latitude, longitude };
  } catch {
    return fallback;
  }
}

export async function searchCities(query: string): Promise<CitySuggestion[]> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return knownCities;
  try {
    const params = new URLSearchParams({ format: 'jsonv2', q: `${normalizedQuery}, India`, countrycodes: 'in', addressdetails: '1', limit: '6' });
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { 'User-Agent': 'AirGuard climate intelligence prototype' }
    });
    if (!response.ok) return knownCities.filter((city) => city.city.toLowerCase().includes(normalizedQuery.toLowerCase()));
    const results = await response.json() as Array<{ display_name: string; lat: string; lon: string; address?: Record<string, string> }>;
    return results.map((result) => ({
      city: result.address?.city || result.address?.town || result.address?.municipality || normalizedQuery,
      displayName: result.display_name,
      latitude: Number(result.lat),
      longitude: Number(result.lon)
    }));
  } catch {
    return knownCities.filter((city) => city.city.toLowerCase().includes(normalizedQuery.toLowerCase()));
  }
}
