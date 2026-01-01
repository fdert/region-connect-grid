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

interface Maneuver {
  type: string;
  modifier?: string;
  location: [number, number];
  bearing_before?: number;
  bearing_after?: number;
}

interface Step {
  distance: number;
  duration: number;
  geometry: {
    coordinates: [number, number][];
    type: string;
  };
  maneuver: Maneuver;
  name: string;
  mode: string;
  ref?: string;
  destinations?: string;
}

interface Leg {
  steps: Step[];
  summary: string;
  duration: number;
  distance: number;
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
    legs?: Leg[];
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

// Direction instruction interface
interface DirectionInstruction {
  type: string;
  modifier?: string;
  instruction: string;
  distance: number; // meters
  duration: number; // seconds
  streetName: string;
  location: [number, number]; // [lat, lng]
  bearing?: number;
}

// Convert maneuver type and modifier to Arabic instruction
const getArabicInstruction = (type: string, modifier?: string, streetName?: string): string => {
  const street = streetName && streetName !== '' ? ` إلى ${streetName}` : '';
  
  const maneuverTypes: { [key: string]: string } = {
    'depart': `ابدأ الرحلة${street}`,
    'arrive': 'لقد وصلت إلى وجهتك',
    'turn': modifier === 'left' ? `انعطف يساراً${street}` :
            modifier === 'right' ? `انعطف يميناً${street}` :
            modifier === 'slight left' ? `انحرف قليلاً لليسار${street}` :
            modifier === 'slight right' ? `انحرف قليلاً لليمين${street}` :
            modifier === 'sharp left' ? `انعطف بشدة لليسار${street}` :
            modifier === 'sharp right' ? `انعطف بشدة لليمين${street}` :
            modifier === 'uturn' ? `استدر للخلف${street}` :
            `تابع${street}`,
    'merge': modifier === 'left' ? `اندمج يساراً${street}` :
             modifier === 'right' ? `اندمج يميناً${street}` :
             `اندمج${street}`,
    'on ramp': `ادخل إلى المنحدر${street}`,
    'off ramp': `اخرج من المنحدر${street}`,
    'fork': modifier === 'left' ? `خذ المفترق الأيسر${street}` :
            modifier === 'right' ? `خذ المفترق الأيمن${street}` :
            `تابع في المفترق${street}`,
    'end of road': modifier === 'left' ? `في نهاية الطريق، انعطف يساراً${street}` :
                   modifier === 'right' ? `في نهاية الطريق، انعطف يميناً${street}` :
                   `نهاية الطريق${street}`,
    'continue': `تابع السير${street}`,
    'roundabout': `ادخل الدوار${street}`,
    'rotary': `ادخل الدوار${street}`,
    'roundabout turn': modifier === 'left' ? `انعطف يساراً في الدوار${street}` :
                       modifier === 'right' ? `انعطف يميناً في الدوار${street}` :
                       `تابع في الدوار${street}`,
    'exit roundabout': `اخرج من الدوار${street}`,
    'exit rotary': `اخرج من الدوار${street}`,
    'notification': `تنبيه${street}`,
    'new name': `الطريق يتغير إلى${street}`,
  };

  return maneuverTypes[type] || `تابع${street}`;
};

// Get direction icon based on maneuver type
const getManeuverIcon = (type: string, modifier?: string): string => {
  if (type === 'arrive') return '🏁';
  if (type === 'depart') return '🚀';
  if (type === 'roundabout' || type === 'rotary') return '🔄';
  
  if (modifier?.includes('left')) return '⬅️';
  if (modifier?.includes('right')) return '➡️';
  if (modifier === 'uturn') return '↩️';
  if (modifier === 'straight') return '⬆️';
  
  return '➡️';
};

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
    const trafficSegments: TrafficSegment[] = [];
    const segmentSize = Math.ceil(coordinates.length / 5);
    
    for (let i = 0; i < coordinates.length - 1; i += segmentSize) {
      const endIndex = Math.min(i + segmentSize, coordinates.length);
      const segmentCoords = coordinates.slice(i, endIndex + 1);
      
      let congestionLevel: 'low' | 'moderate' | 'heavy' | 'severe';
      const normalizedPosition = (i + segmentSize / 2) / coordinates.length;
      
      if (traffic.level === 'heavy') {
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

    // Extract turn-by-turn directions from steps
    const directions: DirectionInstruction[] = [];
    
    if (route.legs && route.legs.length > 0) {
      const leg = route.legs[0];
      if (leg.steps && leg.steps.length > 0) {
        for (const step of leg.steps) {
          const instruction = getArabicInstruction(
            step.maneuver.type,
            step.maneuver.modifier,
            step.name
          );
          
          const icon = getManeuverIcon(step.maneuver.type, step.maneuver.modifier);
          
          directions.push({
            type: step.maneuver.type,
            modifier: step.maneuver.modifier,
            instruction: `${icon} ${instruction}`,
            distance: Math.round(step.distance),
            duration: Math.round(step.duration),
            streetName: step.name || '',
            location: [step.maneuver.location[1], step.maneuver.location[0]], // Convert to [lat, lng]
            bearing: step.maneuver.bearing_after
          });
        }
      }
    }

    console.log('Route has', coordinates.length, 'points, distance:', distanceKm, 'km, traffic:', traffic.level, 'directions:', directions.length);

    return new Response(
      JSON.stringify({ 
        success: true,
        coordinates,
        distance_km: distanceKm,
        duration_minutes: adjustedDurationMinutes,
        base_duration_minutes: Math.round(baseDurationMinutes),
        traffic_level: traffic.level,
        traffic_segments: trafficSegments,
        directions,
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