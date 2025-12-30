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

    console.log('Received coordinates:', { origin_lat, origin_lng, destination_lat, destination_lng });

    // Validate coordinates
    if (origin_lat === undefined || origin_lng === undefined || 
        destination_lat === undefined || destination_lng === undefined) {
      console.error('Missing coordinates');
      return new Response(
        JSON.stringify({ success: false, error: 'الإحداثيات غير مكتملة' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate coordinate ranges
    if (Math.abs(origin_lat) > 90 || Math.abs(destination_lat) > 90 ||
        Math.abs(origin_lng) > 180 || Math.abs(destination_lng) > 180) {
      console.error('Invalid coordinate ranges:', { origin_lat, origin_lng, destination_lat, destination_lng });
      return new Response(
        JSON.stringify({ success: false, error: 'الإحداثيات غير صحيحة - خارج النطاق المسموح' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // OSRM uses lng,lat format (not lat,lng)
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${origin_lng},${origin_lat};${destination_lng},${destination_lat}?overview=false`;
    
    console.log('Calling OSRM API:', osrmUrl);
    
    const response = await fetch(osrmUrl);
    
    if (!response.ok) {
      console.error('OSRM API HTTP error:', response.status, response.statusText);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `فشل في الاتصال بخدمة حساب المسافة (HTTP ${response.status})` 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data: OSRMResponse = await response.json();
    
    console.log('OSRM response code:', data.code);
    
    if (data.code !== 'Ok') {
      console.error('OSRM returned error code:', data.code);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `لا يمكن حساب المسافة عبر الطريق - تأكد من صحة المواقع (${data.code})` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!data.routes || data.routes.length === 0) {
      console.error('OSRM returned no routes');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'لا يوجد طريق متاح بين الموقعين' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const route = data.routes[0];
    const distanceKm = Math.round((route.distance / 1000) * 100) / 100; // Convert meters to km
    const durationMinutes = Math.round(route.duration / 60); // Convert seconds to minutes

    console.log('OSRM distance:', distanceKm, 'km, duration:', durationMinutes, 'minutes');

    return new Response(
      JSON.stringify({ 
        success: true,
        distance_km: distanceKm,
        duration_minutes: durationMinutes
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error calculating road distance:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'فشل في حساب المسافة - حدث خطأ غير متوقع' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
