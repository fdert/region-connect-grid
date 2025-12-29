// Calculate distance between two coordinates using Haversine formula
export const calculateDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
};

const toRad = (deg: number): number => {
  return deg * (Math.PI / 180);
};

// Calculate delivery fee based on distance
export const calculateDeliveryFee = (
  distanceKm: number,
  baseDeliveryFee: number = 5,
  pricePerKm: number = 2,
  freeDeliveryRadiusKm: number = 0
): number => {
  if (distanceKm <= freeDeliveryRadiusKm) {
    return 0;
  }
  
  const chargeableDistance = distanceKm - freeDeliveryRadiusKm;
  const fee = baseDeliveryFee + (chargeableDistance * pricePerKm);
  
  return Math.round(fee * 100) / 100; // Round to 2 decimal places
};

// Parse coordinates from address string or location URL
export const parseCoordinatesFromUrl = (url: string): { lat: number; lng: number } | null => {
  try {
    // Google Maps URL patterns
    // https://www.google.com/maps?q=24.7136,46.6753
    // https://maps.google.com/?q=24.7136,46.6753
    // https://goo.gl/maps/...
    // https://www.google.com/maps/@24.7136,46.6753,15z
    
    const patterns = [
      /[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
      /@(-?\d+\.?\d*),(-?\d+\.?\d*)/,
      /\/place\/.*\/@(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return {
          lat: parseFloat(match[1]),
          lng: parseFloat(match[2])
        };
      }
    }
    
    return null;
  } catch {
    return null;
  }
};

// Extract coordinates from otp_sessions location data
export interface LocationData {
  lat: number;
  lng: number;
  address?: string;
}

export const extractLocationFromSession = (session: {
  location_lat?: number | null;
  location_lng?: number | null;
  location_url?: string | null;
  location_address?: string | null;
}): LocationData | null => {
  if (session.location_lat && session.location_lng) {
    return {
      lat: session.location_lat,
      lng: session.location_lng,
      address: session.location_address || undefined
    };
  }
  
  if (session.location_url) {
    const coords = parseCoordinatesFromUrl(session.location_url);
    if (coords) {
      return {
        ...coords,
        address: session.location_address || undefined
      };
    }
  }
  
  return null;
};
