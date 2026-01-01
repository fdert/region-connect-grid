import { supabase } from "@/integrations/supabase/client";

export interface RoadDistanceResult {
  success: true;
  distance_km: number;
  duration_minutes: number;
}

export interface RoadDistanceError {
  success: false;
  error: string;
}

export type RoadDistanceResponse = RoadDistanceResult | RoadDistanceError;

// Calculate road distance using OSRM API via edge function
export const calculateRoadDistance = async (
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): Promise<RoadDistanceResponse> => {
  try {
    const { data, error } = await supabase.functions.invoke('calculate-road-distance', {
      body: {
        origin_lat: originLat,
        origin_lng: originLng,
        destination_lat: destLat,
        destination_lng: destLng
      }
    });

    if (error) {
      console.error('Error calling road distance function:', error);
      return { success: false, error: 'فشل في الاتصال بخدمة حساب المسافة' };
    }

    return data;
  } catch (error) {
    console.error('Error calculating road distance:', error);
    return { success: false, error: 'فشل في حساب المسافة - حدث خطأ غير متوقع' };
  }
};

// Get route geometry (actual road path) from OSRM
export interface TrafficSegment {
  coordinates: [number, number][];
  congestionLevel: 'low' | 'moderate' | 'heavy' | 'severe';
  duration: number;
  distance: number;
}

// Direction instruction for turn-by-turn navigation
export interface DirectionInstruction {
  type: string;
  modifier?: string;
  instruction: string;
  distance: number; // meters
  duration: number; // seconds
  streetName: string;
  location: [number, number]; // [lat, lng]
  bearing?: number;
}

export interface RouteGeometryResult {
  success: true;
  coordinates: [number, number][];
  distance_km: number;
  duration_minutes: number;
  base_duration_minutes?: number;
  traffic_level?: 'low' | 'moderate' | 'heavy' | 'severe';
  traffic_segments?: TrafficSegment[];
  directions?: DirectionInstruction[];
  summary?: string;
}

export interface RouteGeometryError {
  success: false;
  error: string;
}

export type RouteGeometryResponse = RouteGeometryResult | RouteGeometryError;

export const getRouteGeometry = async (
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): Promise<RouteGeometryResponse> => {
  try {
    const { data, error } = await supabase.functions.invoke('get-route-geometry', {
      body: {
        origin_lat: originLat,
        origin_lng: originLng,
        destination_lat: destLat,
        destination_lng: destLng
      }
    });

    if (error) {
      console.error('Error calling route geometry function:', error);
      return { success: false, error: 'فشل في تحميل مسار الطريق' };
    }

    return data;
  } catch (error) {
    console.error('Error getting route geometry:', error);
    return { success: false, error: 'فشل في تحميل مسار الطريق' };
  }
};

// Calculate delivery fee based on distance
// Formula: Delivery Fee = Price per km × Distance
export const calculateDeliveryFee = (
  distanceKm: number,
  pricePerKm: number = 2,
  minDeliveryFee: number = 0,
  maxDeliveryFee: number = 0
): number => {
  // Simple formula: price per km × distance
  let fee = distanceKm * pricePerKm;
  
  // Apply minimum fee if set
  if (minDeliveryFee > 0 && fee < minDeliveryFee) {
    fee = minDeliveryFee;
  }
  
  // Apply maximum fee if set
  if (maxDeliveryFee > 0 && fee > maxDeliveryFee) {
    fee = maxDeliveryFee;
  }
  
  return Math.round(fee * 100) / 100; // Round to 2 decimal places
};

// Parse coordinates from address string or location URL
export const parseCoordinatesFromUrl = (url: string): { lat: number; lng: number } | null => {
  try {
    if (!url || typeof url !== 'string') return null;
    
    // Helper to validate coordinates (basic validation for reasonable lat/lng)
    const isValidCoord = (lat: number, lng: number) => {
      return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
    };

    // Priority 0: Check if it's just raw coordinates "lat,lng" or "lat, lng"
    const rawCoordsMatch = url.trim().match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
    if (rawCoordsMatch) {
      const lat = parseFloat(rawCoordsMatch[1]);
      const lng = parseFloat(rawCoordsMatch[2]);
      if (isValidCoord(lat, lng)) {
        return { lat, lng };
      }
    }

    // Priority 1: Extract from !3d (lat) and !4d (lng) parameters - these are the actual place coordinates
    const place3dMatch = url.match(/!3d(-?\d+\.?\d*)/);
    const place4dMatch = url.match(/!4d(-?\d+\.?\d*)/);
    if (place3dMatch && place4dMatch) {
      const lat = parseFloat(place3dMatch[1]);
      const lng = parseFloat(place4dMatch[1]);
      if (isValidCoord(lat, lng)) {
        return { lat, lng };
      }
    }

    // Priority 2: Extract from q= parameter (direct coordinates)
    const qMatch = url.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (qMatch) {
      const lat = parseFloat(qMatch[1]);
      const lng = parseFloat(qMatch[2]);
      if (isValidCoord(lat, lng)) {
        return { lat, lng };
      }
    }

    // Priority 3: Extract from place/ path in Google Maps
    const placeMatch = url.match(/place\/(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (placeMatch) {
      const lat = parseFloat(placeMatch[1]);
      const lng = parseFloat(placeMatch[2]);
      if (isValidCoord(lat, lng)) {
        return { lat, lng };
      }
    }

    // Priority 4: Extract from ll= parameter
    const llMatch = url.match(/[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (llMatch) {
      const lat = parseFloat(llMatch[1]);
      const lng = parseFloat(llMatch[2]);
      if (isValidCoord(lat, lng)) {
        return { lat, lng };
      }
    }

    // Priority 5: Extract from /dir/ path with coordinates
    const dirMatch = url.match(/\/dir\/.*?\/(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (dirMatch) {
      const lat = parseFloat(dirMatch[1]);
      const lng = parseFloat(dirMatch[2]);
      if (isValidCoord(lat, lng)) {
        return { lat, lng };
      }
    }

    // Priority 6: Extract from @ symbol (view coordinates - less accurate for places)
    const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (atMatch) {
      const lat = parseFloat(atMatch[1]);
      const lng = parseFloat(atMatch[2]);
      if (isValidCoord(lat, lng)) {
        return { lat, lng };
      }
    }

    // Priority 7: Extract any pair of decimal numbers that look like coordinates
    const generalMatch = url.match(/(-?\d{1,3}\.\d{4,}),\s*(-?\d{1,3}\.\d{4,})/);
    if (generalMatch) {
      const lat = parseFloat(generalMatch[1]);
      const lng = parseFloat(generalMatch[2]);
      if (isValidCoord(lat, lng)) {
        return { lat, lng };
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
