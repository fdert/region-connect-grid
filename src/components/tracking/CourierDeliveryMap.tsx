import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertCircle, ExternalLink, Clock, Navigation, Car, AlertTriangle, ChevronDown, ChevronUp, MapPin, CornerDownRight, Route } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getRouteGeometry, TrafficSegment, DirectionInstruction } from "@/lib/distance";
import { useMapSettings } from "@/hooks/useMapSettings";
import "leaflet/dist/leaflet.css";

interface CourierDeliveryMapProps {
  orderId: string;
  storeLocation?: { lat: number; lng: number } | null;
  customerLocation?: { lat: number; lng: number } | null;
  courierLocation?: { lat: number; lng: number } | null;
  storeName?: string;
  destinationType?: 'store' | 'customer';
}

// Traffic level colors
const trafficColors = {
  low: '#22c55e',
  moderate: '#f59e0b',
  heavy: '#ef4444',
  severe: '#7c2d12'
};

const trafficLabels = {
  low: 'حركة سلسة',
  moderate: 'حركة متوسطة',
  heavy: 'ازدحام',
  severe: 'ازدحام شديد'
};

// Format distance
const formatDistance = (meters: number): string => {
  if (meters < 1000) return `${Math.round(meters)} م`;
  return `${(meters / 1000).toFixed(1)} كم`;
};

// Format duration
const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  if (minutes < 1) return `${Math.round(seconds)} ث`;
  return `${minutes} د`;
};

export default function CourierDeliveryMap({ 
  orderId, 
  storeLocation, 
  customerLocation,
  courierLocation: initialCourierLocation,
  storeName,
  destinationType = 'customer'
}: CourierDeliveryMapProps) {
  const [courierLocation, setCourierLocation] = useState<{ lat: number; lng: number } | null>(initialCourierLocation || null);
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);
  const [trafficLevel, setTrafficLevel] = useState<'low' | 'moderate' | 'heavy' | 'severe' | null>(null);
  const [trafficSegments, setTrafficSegments] = useState<TrafficSegment[]>([]);
  const [directions, setDirections] = useState<DirectionInstruction[]>([]);
  const [showDirections, setShowDirections] = useState(false);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mapError, setMapError] = useState(false);
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const leafletRef = useRef<any>(null);
  
  const { isMapbox, mapboxApiKey, isLoading: isMapSettingsLoading } = useMapSettings();

  const isValidCoord = useCallback((lat: number, lng: number) => {
    return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }, []);

  // Fetch route from courier to customer
  const fetchRoute = useCallback(async () => {
    if (!courierLocation || !customerLocation) return;
    if (!isValidCoord(courierLocation.lat, courierLocation.lng) || !isValidCoord(customerLocation.lat, customerLocation.lng)) return;

    try {
      const result = await getRouteGeometry(
        courierLocation.lat,
        courierLocation.lng,
        customerLocation.lat,
        customerLocation.lng
      );

      if (result.success) {
        setRouteCoordinates(result.coordinates);
        setEstimatedMinutes(Math.ceil(result.duration_minutes));
        setDistanceKm(result.distance_km);
        if (result.traffic_level) setTrafficLevel(result.traffic_level);
        if (result.traffic_segments) setTrafficSegments(result.traffic_segments);
        if (result.directions) setDirections(result.directions);
      }
    } catch (error) {
      console.error("Error fetching route:", error);
    }
  }, [courierLocation, customerLocation, isValidCoord]);

  // Update courier location from prop
  useEffect(() => {
    if (initialCourierLocation) {
      setCourierLocation(initialCourierLocation);
    }
  }, [initialCourierLocation]);

  // Fetch initial route
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      await fetchRoute();
      setIsLoading(false);
    };
    fetchInitialData();
  }, [fetchRoute]);

  // Update markers and route
  const updateMarkersAndRoute = useCallback((L: any, map: any) => {
    if (!map) return;

    // Clear existing
    markersRef.current.forEach(marker => marker?.remove?.());
    markersRef.current = [];

    const createIcon = (type: 'store' | 'courier' | 'customer') => {
      const configs = {
        store: {
          color: '#10b981',
          pulseColor: 'rgba(16, 185, 129, 0.4)',
          icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/></svg>',
          label: 'المتجر'
        },
        courier: {
          color: '#3b82f6',
          pulseColor: 'rgba(59, 130, 246, 0.4)',
          icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>',
          label: 'موقعك'
        },
        customer: {
          color: '#ef4444',
          pulseColor: 'rgba(239, 68, 68, 0.4)',
          icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
          label: 'العميل'
        }
      };
      
      const config = configs[type];
      return L.divIcon({
        className: "custom-marker",
        html: `
          <div style="position:relative;width:48px;height:48px;">
            <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:48px;height:48px;border-radius:50%;background:${config.pulseColor};animation:markerPulse 2s ease-out infinite;"></div>
            <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:40px;height:40px;border-radius:50%;background:${config.color};box-shadow:0 4px 15px ${config.color}80;display:flex;align-items:center;justify-content:center;border:3px solid white;">
              ${config.icon}
            </div>
            <div style="position:absolute;bottom:-18px;left:50%;transform:translateX(-50%);background:${config.color};color:white;padding:2px 8px;border-radius:8px;font-size:9px;font-weight:600;white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,0.2);">${config.label}</div>
          </div>
        `,
        iconSize: [48, 66],
        iconAnchor: [24, 33],
        popupAnchor: [0, -35]
      });
    };

    const allPoints: [number, number][] = [];

    // Add store marker
    if (storeLocation && isValidCoord(storeLocation.lat, storeLocation.lng)) {
      const marker = L.marker([storeLocation.lat, storeLocation.lng], { icon: createIcon('store') })
        .addTo(map)
        .bindPopup(`<div style="text-align:center;font-weight:600;">${storeName || "المتجر"}</div>`);
      markersRef.current.push(marker);
      allPoints.push([storeLocation.lat, storeLocation.lng]);
    }

    // Add customer marker
    if (customerLocation && isValidCoord(customerLocation.lat, customerLocation.lng)) {
      const marker = L.marker([customerLocation.lat, customerLocation.lng], { icon: createIcon('customer') })
        .addTo(map)
        .bindPopup('<div style="text-align:center;font-weight:600;">موقع التوصيل</div>');
      markersRef.current.push(marker);
      allPoints.push([customerLocation.lat, customerLocation.lng]);
    }

    // Add courier marker
    if (courierLocation && isValidCoord(courierLocation.lat, courierLocation.lng)) {
      const marker = L.marker([courierLocation.lat, courierLocation.lng], { icon: createIcon('courier') })
        .addTo(map)
        .bindPopup('<div style="text-align:center;font-weight:600;">موقعك الحالي</div>');
      markersRef.current.push(marker);
      allPoints.push([courierLocation.lat, courierLocation.lng]);
    }

    // Draw route with traffic colors
    if (trafficSegments.length > 0) {
      // Shadow
      const shadow = L.polyline(routeCoordinates, {
        color: "#1e3a5f",
        weight: 10,
        opacity: 0.3,
        lineJoin: "round",
        lineCap: "round"
      }).addTo(map);
      markersRef.current.push(shadow);

      // Traffic segments
      trafficSegments.forEach((segment) => {
        const segmentColor = trafficColors[segment.congestionLevel];
        
        const glow = L.polyline(segment.coordinates, {
          color: segmentColor,
          weight: 8,
          opacity: 0.4,
          lineJoin: "round",
          lineCap: "round"
        }).addTo(map);
        markersRef.current.push(glow);

        const line = L.polyline(segment.coordinates, {
          color: segmentColor,
          weight: 5,
          opacity: 1,
          lineJoin: "round",
          lineCap: "round"
        }).addTo(map);
        markersRef.current.push(line);

        line.bindPopup(`
          <div style="text-align:center;direction:rtl;">
            <p style="font-weight:600;">${trafficLabels[segment.congestionLevel]}</p>
            <p style="font-size:11px;color:#666;">${(segment.distance / 1000).toFixed(1)} كم</p>
          </div>
        `);
      });

      // Animated line
      const animated = L.polyline(routeCoordinates, {
        color: "#ffffff",
        weight: 2,
        opacity: 0.8,
        dashArray: "4, 12",
        lineCap: "round",
        className: "animated-route-line"
      }).addTo(map);
      markersRef.current.push(animated);

      routeCoordinates.forEach(coord => allPoints.push(coord));
    } else if (routeCoordinates.length > 1) {
      // Fallback single color route
      const shadow = L.polyline(routeCoordinates, {
        color: "#1e3a5f",
        weight: 8,
        opacity: 0.3,
        lineJoin: "round",
        lineCap: "round"
      }).addTo(map);
      markersRef.current.push(shadow);

      const route = L.polyline(routeCoordinates, {
        color: "#3b82f6",
        weight: 5,
        opacity: 1,
        lineJoin: "round",
        lineCap: "round"
      }).addTo(map);
      markersRef.current.push(route);

      const animated = L.polyline(routeCoordinates, {
        color: "#ffffff",
        weight: 2,
        opacity: 0.8,
        dashArray: "4, 12",
        lineCap: "round",
        className: "animated-route-line"
      }).addTo(map);
      markersRef.current.push(animated);

      routeCoordinates.forEach(coord => allPoints.push(coord));
    }

    // Add turn markers
    if (directions.length > 1) {
      const turnDirections = directions.slice(1, -1);
      turnDirections.forEach((direction, index) => {
        if (direction.location && direction.location.length === 2) {
          const turnIcon = L.divIcon({
            className: "turn-marker",
            html: `
              <div style="width:24px;height:24px;border-radius:50%;background:linear-gradient(135deg, #8b5cf6, #6366f1);border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:bold;color:white;box-shadow:0 2px 8px rgba(139, 92, 246, 0.4);cursor:pointer;">
                ${index + 1}
              </div>
            `,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
            popupAnchor: [0, -15]
          });

          const marker = L.marker([direction.location[0], direction.location[1]], { icon: turnIcon })
            .addTo(map)
            .bindPopup(`
              <div style="text-align:center;direction:rtl;min-width:140px;">
                <p style="font-weight:600;margin-bottom:4px;font-size:12px;">${direction.instruction}</p>
                ${direction.streetName ? `<p style="font-size:10px;color:#888;">${direction.streetName}</p>` : ''}
                <div style="display:flex;justify-content:center;gap:10px;margin-top:4px;font-size:10px;">
                  <span style="color:#3b82f6;">${formatDistance(direction.distance)}</span>
                  <span style="color:#888;">${formatDuration(direction.duration)}</span>
                </div>
              </div>
            `);
          markersRef.current.push(marker);
        }
      });
    }

    // Fit bounds
    if (allPoints.length > 1) {
      const bounds = L.latLngBounds(allPoints);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [storeLocation, customerLocation, courierLocation, storeName, isValidCoord, routeCoordinates, trafficSegments, directions]);

  // Initialize map
  useEffect(() => {
    if (isLoading || isMapSettingsLoading) return;
    
    const initMap = async () => {
      if (!mapContainerRef.current) return;

      try {
        const L = await import("leaflet");
        leafletRef.current = L.default;

        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }

        const points: [number, number][] = [];
        if (storeLocation && isValidCoord(storeLocation.lat, storeLocation.lng)) {
          points.push([storeLocation.lat, storeLocation.lng]);
        }
        if (customerLocation && isValidCoord(customerLocation.lat, customerLocation.lng)) {
          points.push([customerLocation.lat, customerLocation.lng]);
        }
        if (courierLocation && isValidCoord(courierLocation.lat, courierLocation.lng)) {
          points.push([courierLocation.lat, courierLocation.lng]);
        }

        if (points.length === 0) {
          setMapError(true);
          return;
        }

        const avgLat = points.reduce((sum, p) => sum + p[0], 0) / points.length;
        const avgLng = points.reduce((sum, p) => sum + p[1], 0) / points.length;

        const map = L.default.map(mapContainerRef.current, {
          center: [avgLat, avgLng],
          zoom: 14,
          scrollWheelZoom: false,
          zoomControl: true
        });

        if (isMapbox && mapboxApiKey) {
          L.default.tileLayer(
            `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=${mapboxApiKey}`,
            { attribution: '&copy; Mapbox', maxZoom: 19, tileSize: 512, zoomOffset: -1 }
          ).addTo(map);
        } else {
          L.default.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; OpenStreetMap', maxZoom: 19
          }).addTo(map);
        }

        mapInstanceRef.current = map;
        updateMarkersAndRoute(L.default, map);

        setTimeout(() => map?.invalidateSize?.(), 200);
      } catch (error) {
        console.error("Map init error:", error);
        setMapError(true);
      }
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isLoading, isMapSettingsLoading, isMapbox, mapboxApiKey, storeLocation, customerLocation, isValidCoord]);

  // Update markers on route/location change
  useEffect(() => {
    if (mapInstanceRef.current && leafletRef.current) {
      updateMarkersAndRoute(leafletRef.current, mapInstanceRef.current);
    }
  }, [courierLocation, routeCoordinates, updateMarkersAndRoute]);

  const openInGoogleMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  const hasValidPoints = (
    (storeLocation && isValidCoord(storeLocation.lat, storeLocation.lng)) ||
    (customerLocation && isValidCoord(customerLocation.lat, customerLocation.lng)) ||
    (courierLocation && isValidCoord(courierLocation.lat, courierLocation.lng))
  );

  if (isLoading) {
    return (
      <div className="h-[300px] rounded-xl bg-muted flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasValidPoints || mapError) {
    return (
      <div className="h-[150px] rounded-xl bg-muted flex flex-col items-center justify-center gap-2">
        <AlertCircle className="w-6 h-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">لا تتوفر إحداثيات للخريطة</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* ETA & Distance */}
      {estimatedMinutes && distanceKm && (
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-3 border border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">الوقت المتوقع</p>
                <p className="text-lg font-bold text-primary">{estimatedMinutes} دقيقة</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-semibold">{distanceKm} كم</span>
                <Route className="w-4 h-4 text-primary" />
              </div>
              {trafficLevel && (
                <div 
                  className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium text-white"
                  style={{ backgroundColor: trafficColors[trafficLevel] }}
                >
                  {trafficLevel === 'heavy' || trafficLevel === 'severe' ? (
                    <AlertTriangle className="w-3 h-3" />
                  ) : (
                    <Car className="w-3 h-3" />
                  )}
                  {trafficLabels[trafficLevel]}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Map */}
      <div 
        ref={mapContainerRef} 
        className="h-[300px] w-full rounded-xl overflow-hidden border border-border bg-muted shadow-md"
        style={{ minHeight: "300px", position: "relative", zIndex: 0 }}
      />

      {/* Directions Panel */}
      {directions.length > 0 && (
        <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
          <button
            onClick={() => setShowDirections(!showDirections)}
            className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <CornerDownRight className="w-4 h-4 text-primary" />
              </div>
              <div className="text-right">
                <p className="font-semibold text-sm">اتجاهات المسار</p>
                <p className="text-xs text-muted-foreground">{directions.length} خطوة</p>
              </div>
            </div>
            {showDirections ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
          
          {showDirections && (
            <div className="border-t border-border/50 max-h-[250px] overflow-y-auto">
              {directions.map((direction, index) => (
                <div 
                  key={index}
                  className={`flex items-start gap-2 p-2.5 ${index !== directions.length - 1 ? 'border-b border-border/30' : ''} hover:bg-muted/30`}
                >
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs leading-relaxed">{direction.instruction}</p>
                    {direction.streetName && (
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {direction.streetName}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0 text-left">
                    <p className="text-xs font-medium text-primary">{formatDistance(direction.distance)}</p>
                    <p className="text-xs text-muted-foreground">{formatDuration(direction.duration)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick Navigation */}
      {customerLocation && isValidCoord(customerLocation.lat, customerLocation.lng) && (
        <Button 
          className="w-full gap-2" 
          onClick={() => openInGoogleMaps(customerLocation.lat, customerLocation.lng)}
        >
          <Navigation className="w-4 h-4" />
          فتح الملاحة في Google Maps
        </Button>
      )}

      {/* Traffic Legend */}
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-1.5 rounded-full" style={{ backgroundColor: trafficColors.low }} />
          <span>سلسة</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-1.5 rounded-full" style={{ backgroundColor: trafficColors.moderate }} />
          <span>متوسطة</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-1.5 rounded-full" style={{ backgroundColor: trafficColors.heavy }} />
          <span>مزدحمة</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-1.5 rounded-full" style={{ backgroundColor: trafficColors.severe }} />
          <span>شديدة</span>
        </div>
      </div>
    </div>
  );
}
