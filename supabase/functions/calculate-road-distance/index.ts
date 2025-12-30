import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RouteRequest {
  origin_lat: number;
  origin_lng: number;
  destination_lat: number;
  destination_lng: number;
}

interface OSRMResponse {
  code: string;
  routes?: Array<{
    distance: number; // in meters
    duration: number; // in seconds
  }>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { origin_lat, origin_lng, destination_lat, destination_lng }: RouteRequest = await req.json();

    // Validate coordinates
    if (!origin_lat || !origin_lng || !destination_lat || !destination_lng) {
      return new Response(
        JSON.stringify({ error: 'Missing coordinates' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate coordinate ranges
    if (Math.abs(origin_lat) > 90 || Math.abs(destination_lat) > 90 ||
        Math.abs(origin_lng) > 180 || Math.abs(destination_lng) > 180) {
      return new Response(
        JSON.stringify({ error: 'Invalid coordinates' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // OSRM uses lng,lat format (not lat,lng)
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${origin_lng},${origin_lat};${destination_lng},${destination_lat}?overview=false`;
    
    console.log('Calling OSRM API:', osrmUrl);
    
    const response = await fetch(osrmUrl);
    
    if (!response.ok) {
      console.error('OSRM API error:', response.status, response.statusText);
      // Fallback to Haversine formula if OSRM fails
      const haversineDistance = calculateHaversineDistance(origin_lat, origin_lng, destination_lat, destination_lng);
      return new Response(
        JSON.stringify({ 
          distance_km: haversineDistance,
          duration_minutes: 0,
          source: 'haversine_fallback'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data: OSRMResponse = await response.json();
    
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      console.error('OSRM returned no routes:', data);
      // Fallback to Haversine formula
      const haversineDistance = calculateHaversineDistance(origin_lat, origin_lng, destination_lat, destination_lng);
      return new Response(
        JSON.stringify({ 
          distance_km: haversineDistance,
          duration_minutes: 0,
          source: 'haversine_fallback'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const route = data.routes[0];
    const distanceKm = Math.round((route.distance / 1000) * 100) / 100; // Convert meters to km
    const durationMinutes = Math.round(route.duration / 60); // Convert seconds to minutes

    console.log('OSRM distance:', distanceKm, 'km, duration:', durationMinutes, 'minutes');

    return new Response(
      JSON.stringify({ 
        distance_km: distanceKm,
        duration_minutes: durationMinutes,
        source: 'osrm'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error calculating road distance:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to calculate distance' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Haversine formula as fallback
function calculateHaversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 100) / 100;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
