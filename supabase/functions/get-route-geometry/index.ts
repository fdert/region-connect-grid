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
    legs?: Array<{
      steps?: Array<{
        distance: number;
        duration: number;
        geometry: {
          coordinates: [number, number][];
        };
        maneuver: {
          type: string;
          modifier?: string;
          location: [number, number];
        };
        name: string;
        mode: string;
      }>;
      summary: string;
      duration: number;
      distance: number;
    }>;
  }>;
}

// Traffic multipliers based on time of day (simulated traffic patterns)
const getTrafficMultiplier = (hour: number): { multiplier: number; level: 'low' | 'moderate' | 'heavy' | 'severe' } => {
  // Peak hours: 7-9 AM and 4-7 PM
  if ((hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 19)) {
    return { multiplier: 1.5, level: 'heavy' };
  }
  // Moderate: 9-11 AM and 2-4 PM
  if ((hour >= 9 && hour <= 11) || (hour >= 14 && hour <= 16)) {
    return { multiplier: 1.25, level: 'moderate' };
  }
  // Late night: 11 PM - 6 AM
  if (hour >= 23 || hour <= 6) {
    return { multiplier: 0.9, level: 'low' };
  }
  // Normal traffic
  return { multiplier: 1.1, level: 'moderate' };
};

// Segment traffic conditions for visual display
interface TrafficSegment {
  coordinates: [number, number][];
  congestionLevel: 'low' | 'moderate' | 'heavy' | 'severe';
  duration: number; // seconds
  distance: number; // meters
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

    // OSRM uses lng,lat format - request full geometry with steps for traffic simulation
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${origin_lng},${origin_lat};${destination_lng},${destination_lat}?overview=full&geometries=geojson&steps=true&annotations=true`;
    
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
    const coordinates: [number, number][] = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
    
    const distanceKm = Math.round((route.distance / 1000) * 100) / 100;
    
    // Get current hour for traffic estimation
    const currentHour = new Date().getHours();
    const traffic = getTrafficMultiplier(currentHour);
    
    // Apply traffic multiplier to duration
    const baseDurationMinutes = route.duration / 60;
    const adjustedDurationMinutes = Math.round(baseDurationMinutes * traffic.multiplier);

    // Generate traffic segments for visualization
    // Simulate varying traffic conditions along the route
    const trafficSegments: TrafficSegment[] = [];
    const segmentSize = Math.ceil(coordinates.length / 5); // Divide route into ~5 segments
    
    const congestionLevels: ('low' | 'moderate' | 'heavy' | 'severe')[] = ['low', 'moderate', 'heavy', 'severe'];
    
    for (let i = 0; i < coordinates.length - 1; i += segmentSize) {
      const endIndex = Math.min(i + segmentSize, coordinates.length);
      const segmentCoords = coordinates.slice(i, endIndex + 1);
      
      // Simulate traffic level based on position in route
      // Middle segments tend to have more traffic
      let congestionLevel: 'low' | 'moderate' | 'heavy' | 'severe';
      const normalizedPosition = (i + segmentSize / 2) / coordinates.length;
      
      if (traffic.level === 'heavy') {
        // During peak hours, more heavy/severe segments
        if (normalizedPosition > 0.3 && normalizedPosition < 0.7) {
          congestionLevel = Math.random() > 0.5 ? 'severe' : 'heavy';
        } else {
          congestionLevel = Math.random() > 0.5 ? 'heavy' : 'moderate';
        }
      } else if (traffic.level === 'moderate') {
        if (normalizedPosition > 0.4 && normalizedPosition < 0.6) {
          congestionLevel = Math.random() > 0.5 ? 'heavy' : 'moderate';
        } else {
          congestionLevel = Math.random() > 0.5 ? 'moderate' : 'low';
        }
      } else {
        congestionLevel = Math.random() > 0.7 ? 'moderate' : 'low';
      }
      
      const segmentRatio = segmentCoords.length / coordinates.length;
      trafficSegments.push({
        coordinates: segmentCoords,
        congestionLevel,
        duration: Math.round(route.duration * segmentRatio),
        distance: Math.round(route.distance * segmentRatio)
      });
    }

    console.log('Route has', coordinates.length, 'points, distance:', distanceKm, 'km, traffic:', traffic.level);

    return new Response(
      JSON.stringify({ 
        success: true,
        coordinates,
        distance_km: distanceKm,
        duration_minutes: adjustedDurationMinutes,
        base_duration_minutes: Math.round(baseDurationMinutes),
        traffic_level: traffic.level,
        traffic_segments: trafficSegments,
        summary: route.legs?.[0]?.summary || ''
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
