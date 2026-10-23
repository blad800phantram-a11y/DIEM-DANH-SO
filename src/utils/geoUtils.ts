/**
 * Geolocation utility functions for Vietnam Youth Union attendance verification
 */

// Default reference coordinates: Trường Cao đẳng Kiên Giang (Cơ sở 425 Mạc Cửu, TP. Rạch Giá, Kiên Giang)
export const KGC_CAMPUS_COORDS = {
  latitude: 10.0275,
  longitude: 105.0805,
  name: 'Trường Cao đẳng Kiên Giang (Cơ sở 425 Mạc Cửu, TP. Rạch Giá)',
  defaultRadiusMeters: 800, // 800m covers the campus & surrounding event areas
};

/**
 * Calculates Haversine distance in meters between two GPS coordinates
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c); // returns distance in meters
}

/**
 * Formats coordinates for display
 */
export function formatCoordinates(lat: number, lng: number): string {
  const latDir = lat >= 0 ? 'B (N)' : 'N (S)';
  const lngDir = lng >= 0 ? 'Đ (E)' : 'T (W)';
  return `${Math.abs(lat).toFixed(5)}° ${latDir}, ${Math.abs(lng).toFixed(5)}° ${lngDir}`;
}
