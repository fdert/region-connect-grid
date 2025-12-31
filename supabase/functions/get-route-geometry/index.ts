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
    distance: number;
    duration: number;
    geometry: {
      coordinates: [number, number][];
      type: string;
    };
  }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { origin_lat, origin_lng, destination_lat, destination_lng }: RouteRequest = await req.json();

    console.log('Get route geometry:', { origin_lat, origin_lng, destination_lat, destination_lng });

    if (origin_lat === undefined || origin_lng === undefined || 
        destination_lat === undefined || destination_lng === undefined) {
      return new Response(
        JSON.stringify({ success: false, error: 'الإحداثيات غير مكتملة' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (Math.abs(origin_lat) > 90 || Math.abs(destination_lat) > 90 ||
        Math.abs(origin_lng) > 180 || Math.abs(destination_lng) > 180) {
      return new Response(
        JSON.stringify({ success: false, error: 'الإحداثيات غير صحيحة' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // OSRM uses lng,lat format - request full geometry
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${origin_lng},${origin_lat};${destination_lng},${destination_lat}?overview=full&geometries=geojson`;
    
    console.log('Calling OSRM API:', osrmUrl);
    
    const response = await fetch(osrmUrl);
    
    if (!response.ok) {
      return new Response(
        JSON.stringify({ success: false, error: `فشل في الاتصال بخدمة الطرق (HTTP ${response.status})` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data: OSRMResponse = await response.json();
    
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'لا يوجد طريق متاح بين الموقعين' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const route = data.routes[0];
    // OSRM returns [lng, lat], convert to [lat, lng] for Leaflet
    const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
    
    const distanceKm = Math.round((route.distance / 1000) * 100) / 100;
    const durationMinutes = Math.round(route.duration / 60);

    console.log('Route has', coordinates.length, 'points, distance:', distanceKm, 'km');

    return new Response(
      JSON.stringify({ 
        success: true,
        coordinates,
        distance_km: distanceKm,
        duration_minutes: durationMinutes
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error getting route geometry:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'فشل في تحميل بيانات الطريق' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
