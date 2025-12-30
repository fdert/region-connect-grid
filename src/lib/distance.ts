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
    // Google Maps URL patterns
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
