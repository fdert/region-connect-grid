import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertCircle, ExternalLink, Clock, Navigation, Car, AlertTriangle, ChevronDown, ChevronUp, MapPin, CornerDownRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { calculateRoadDistance, getRouteGeometry, TrafficSegment, DirectionInstruction } from "@/lib/distance";
import { useMapSettings } from "@/hooks/useMapSettings";
import "leaflet/dist/leaflet.css";

interface OrderTrackingMapProps {
  orderId: string;
  storeLocation?: { lat: number; lng: number } | null;
  customerLocation?: { lat: number; lng: number } | null;
  storeName?: string;
}

// Traffic level colors
const trafficColors = {
  low: '#22c55e',      // green
  moderate: '#f59e0b', // amber
  heavy: '#ef4444',    // red
  severe: '#7c2d12'    // dark red
};

const trafficLabels = {
  low: 'حركة سلسة',
  moderate: 'حركة متوسطة',
  heavy: 'ازدحام',
  severe: 'ازدحام شديد'
};

// Format distance for display
const formatDistance = (meters: number): string => {
  if (meters < 1000) {
    return `${Math.round(meters)} م`;
  }
  return `${(meters / 1000).toFixed(1)} كم`;
};

// Format duration for display
const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  if (minutes < 1) {
    return `${Math.round(seconds)} ث`;
  }
  return `${minutes} د`;
};

export default function OrderTrackingMap({ 
  orderId, 
  storeLocation, 
  customerLocation,
  storeName 
}: OrderTrackingMapProps) {
  const [courierLocation, setCourierLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mapError, setMapError] = useState(false);
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | null>(null);
  const [baseDurationMinutes, setBaseDurationMinutes] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);
  const [trafficLevel, setTrafficLevel] = useState<'low' | 'moderate' | 'heavy' | 'severe' | null>(null);
  const [trafficSegments, setTrafficSegments] = useState<TrafficSegment[]>([]);
  const [directions, setDirections] = useState<DirectionInstruction[]>([]);
  const [showDirections, setShowDirections] = useState(false);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const routeLineRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const etaIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Get map settings
  const { isMapbox, mapboxApiKey, isLoading: isMapSettingsLoading } = useMapSettings();

  // Validate coordinates
  const isValidCoord = useCallback((lat: number, lng: number) => {
    return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }, []);

  // Get route geometry between two points
  const fetchRouteGeometry = useCallback(async (
    fromLat: number, 
    fromLng: number, 
    toLat: number, 
    toLng: number
  ) => {
    try {
      const result = await getRouteGeometry(fromLat, fromLng, toLat, toLng);
      if (result.success) {
        return result.coordinates;
      }
    } catch (error) {
      console.error("Error fetching route geometry:", error);
    }
    return null;
  }, []);

  // Calculate ETA and fetch route based on courier and customer locations
  const calculateETAAndRoute = useCallback(async (courierLat: number, courierLng: number) => {
    if (!customerLocation || !isValidCoord(customerLocation.lat, customerLocation.lng)) {
      return;
    }

    try {
      // First try to get the full route from courier to customer
      const routeResult = await getRouteGeometry(
        courierLat,
        courierLng,
        customerLocation.lat,
        customerLocation.lng
      );

      if (routeResult.success) {
        setRouteCoordinates(routeResult.coordinates);
        const minutes = Math.ceil(routeResult.duration_minutes);
        setEstimatedMinutes(minutes);
        setRemainingSeconds(minutes * 60);
        setDistanceKm(routeResult.distance_km);
        
        // Set traffic data
        if (routeResult.traffic_level) {
          setTrafficLevel(routeResult.traffic_level);
        }
        if (routeResult.base_duration_minutes) {
          setBaseDurationMinutes(routeResult.base_duration_minutes);
        }
        if (routeResult.traffic_segments) {
          setTrafficSegments(routeResult.traffic_segments);
        }
        // Set directions
        if (routeResult.directions) {
          setDirections(routeResult.directions);
        }
      } else {
        // Fallback to simple distance calculation
        const result = await calculateRoadDistance(
          courierLat,
          courierLng,
          customerLocation.lat,
          customerLocation.lng
        );

        if (result.success) {
          const minutes = Math.ceil(result.duration_minutes);
          setEstimatedMinutes(minutes);
          setRemainingSeconds(minutes * 60);
          setDistanceKm(result.distance_km);
        }
      }
    } catch (error) {
      console.error("Error calculating ETA:", error);
    }
  }, [customerLocation, isValidCoord]);

  // Countdown timer for remaining time
  useEffect(() => {
    if (remainingSeconds > 0) {
      etaIntervalRef.current = setInterval(() => {
        setRemainingSeconds(prev => Math.max(0, prev - 1));
      }, 1000);
    }

    return () => {
      if (etaIntervalRef.current) {
        clearInterval(etaIntervalRef.current);
      }
    };
  }, [remainingSeconds > 0]);

  // Format remaining time
  const formatRemainingTime = (seconds: number) => {
    if (seconds <= 0) return "وصل";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins} دقيقة ${secs > 0 ? `و ${secs} ثانية` : ''}`;
    }
    return `${secs} ثانية`;
  };

  // Fetch initial courier location
  useEffect(() => {
    const fetchCourierLocation = async () => {
      try {
        const { data, error } = await supabase
          .from("orders")
          .select("courier_location_lat, courier_location_lng, courier_location_updated_at")
          .eq("id", orderId)
          .single();

        if (!error && data?.courier_location_lat && data?.courier_location_lng) {
          const newLocation = {
            lat: Number(data.courier_location_lat),
            lng: Number(data.courier_location_lng)
          };
          setCourierLocation(newLocation);
          if (data.courier_location_updated_at) {
            setLastUpdated(new Date(data.courier_location_updated_at));
          }
          // Calculate initial ETA and route
          await calculateETAAndRoute(newLocation.lat, newLocation.lng);
        } else if (customerLocation && isValidCoord(customerLocation.lat, customerLocation.lng)) {
          // If no courier location yet, use customer location as initial courier position
          // This shows the courier at customer's location when GPS starts
          setCourierLocation({
            lat: customerLocation.lat,
            lng: customerLocation.lng
          });
        }
      } catch (err) {
        console.error("Error fetching courier location:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourierLocation();
  }, [orderId, calculateETAAndRoute, customerLocation, isValidCoord]);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel(`order-tracking-live-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`
        },
        async (payload) => {
          const newData = payload.new as any;
          if (newData.courier_location_lat && newData.courier_location_lng) {
            const newLocation = {
              lat: Number(newData.courier_location_lat),
              lng: Number(newData.courier_location_lng)
            };
            setCourierLocation(newLocation);
            if (newData.courier_location_updated_at) {
              setLastUpdated(new Date(newData.courier_location_updated_at));
            }
            // Recalculate ETA and route on courier location update
            await calculateETAAndRoute(newLocation.lat, newLocation.lng);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, calculateETAAndRoute]);

  // Update markers and route function
  const updateMarkersAndRoute = useCallback((L: any, map: any) => {
    if (!map) return;

    // Clear existing markers
    markersRef.current.forEach(marker => {
      if (marker && marker.remove) marker.remove();
    });
    markersRef.current = [];

    // Clear existing route line
    if (routeLineRef.current) {
      routeLineRef.current.remove();
      routeLineRef.current = null;
    }

    // Professional animated marker creator with pulse effect
    const createProfessionalIcon = (type: 'store' | 'courier' | 'customer') => {
      const configs = {
        store: {
          color: '#10b981',
          pulseColor: 'rgba(16, 185, 129, 0.4)',
          icon: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/></svg>',
          label: 'المتجر'
        },
        courier: {
          color: '#3b82f6',
          pulseColor: 'rgba(59, 130, 246, 0.4)',
          icon: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>',
          label: 'المندوب'
        },
        customer: {
          color: '#ef4444',
          pulseColor: 'rgba(239, 68, 68, 0.4)',
          icon: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
          label: 'التوصيل'
        }
      };
      
      const config = configs[type];
      
      return L.divIcon({
        className: "custom-professional-marker",
        html: `
          <div class="marker-container" style="position: relative; width: 56px; height: 56px;">
            <div class="marker-pulse" style="
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: 56px;
              height: 56px;
              border-radius: 50%;
              background: ${config.pulseColor};
              animation: markerPulse 2s ease-out infinite;
            "></div>
            <div class="marker-outer" style="
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: 48px;
              height: 48px;
              border-radius: 50%;
              background: linear-gradient(145deg, ${config.color}, ${config.color}dd);
              box-shadow: 0 4px 20px ${config.color}80, 0 2px 8px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
              border: 3px solid white;
            ">
              ${config.icon}
            </div>
            <div class="marker-label" style="
              position: absolute;
              bottom: -20px;
              left: 50%;
              transform: translateX(-50%);
              background: ${config.color};
              color: white;
              padding: 2px 8px;
              border-radius: 10px;
              font-size: 10px;
              font-weight: 600;
              white-space: nowrap;
              box-shadow: 0 2px 6px rgba(0,0,0,0.2);
            ">${config.label}</div>
          </div>
        `,
        iconSize: [56, 76],
        iconAnchor: [28, 38],
        popupAnchor: [0, -40]
      });
    };

    const storeIcon = createProfessionalIcon('store');
    const courierIcon = createProfessionalIcon('courier');
    const customerIcon = createProfessionalIcon('customer');

    const allPoints: [number, number][] = [];

    // Add store marker
    if (storeLocation && isValidCoord(storeLocation.lat, storeLocation.lng)) {
      const marker = L.marker([storeLocation.lat, storeLocation.lng], { icon: storeIcon })
        .addTo(map)
        .bindPopup(`<div style="text-align:center;font-weight:600;font-size:14px;">${storeName || "المتجر"}</div>`);
      markersRef.current.push(marker);
      allPoints.push([storeLocation.lat, storeLocation.lng]);
    }

    // Add customer marker
    if (customerLocation && isValidCoord(customerLocation.lat, customerLocation.lng)) {
      const marker = L.marker([customerLocation.lat, customerLocation.lng], { icon: customerIcon })
        .addTo(map)
        .bindPopup('<div style="text-align:center;font-weight:600;font-size:14px;">موقع التوصيل</div>');
      markersRef.current.push(marker);
      allPoints.push([customerLocation.lat, customerLocation.lng]);
    }

    // Add courier marker
    if (courierLocation && isValidCoord(courierLocation.lat, courierLocation.lng)) {
      const popup = lastUpdated 
        ? `<div style="text-align:center;"><p style="font-weight:600;font-size:14px;">🚴 المندوب</p><p style="font-size:12px;color:#666;">آخر تحديث: ${lastUpdated.toLocaleTimeString("ar-SA")}</p></div>`
        : '<div style="text-align:center;font-weight:600;font-size:14px;">🚴 المندوب</div>';
      const marker = L.marker([courierLocation.lat, courierLocation.lng], { icon: courierIcon })
        .addTo(map)
        .bindPopup(popup);
      markersRef.current.push(marker);
      allPoints.push([courierLocation.lat, courierLocation.lng]);
    }

    // Draw traffic-colored route segments if available
    if (trafficSegments.length > 0) {
      // Draw shadow first
      const routeShadow = L.polyline(routeCoordinates, {
        color: "#1e3a5f",
        weight: 12,
        opacity: 0.3,
        lineJoin: "round",
        lineCap: "round"
      }).addTo(map);
      markersRef.current.push(routeShadow);

      // Draw each traffic segment with its color
      trafficSegments.forEach((segment, index) => {
        const segmentColor = trafficColors[segment.congestionLevel];
        
        // Outer glow for segment
        const segmentGlow = L.polyline(segment.coordinates, {
          color: segmentColor,
          weight: 10,
          opacity: 0.4,
          lineJoin: "round",
          lineCap: "round"
        }).addTo(map);
        markersRef.current.push(segmentGlow);

        // Main segment line
        const segmentLine = L.polyline(segment.coordinates, {
          color: segmentColor,
          weight: 6,
          opacity: 1,
          lineJoin: "round",
          lineCap: "round"
        }).addTo(map);
        markersRef.current.push(segmentLine);

        // Add popup with traffic info
        const trafficLabel = trafficLabels[segment.congestionLevel];
        segmentLine.bindPopup(`
          <div style="text-align:center;direction:rtl;">
            <p style="font-weight:600;margin-bottom:4px;">${trafficLabel}</p>
            <p style="font-size:12px;color:#666;">المسافة: ${(segment.distance / 1000).toFixed(1)} كم</p>
          </div>
        `);
      });

      // Add animated direction indicator on top
      const animatedRoute = L.polyline(routeCoordinates, {
        color: "#ffffff",
        weight: 2,
        opacity: 0.8,
        dashArray: "4, 12",
        lineCap: "round",
        className: "animated-route-line"
      }).addTo(map);
      markersRef.current.push(animatedRoute);

      // Add route coordinates to bounds
      routeCoordinates.forEach(coord => {
        allPoints.push(coord);
      });
    } else if (routeCoordinates.length > 1) {
      // Fallback: Draw the actual road route with single color
      const routeShadow = L.polyline(routeCoordinates, {
        color: "#1e3a5f",
        weight: 10,
        opacity: 0.4,
        lineJoin: "round",
        lineCap: "round"
      }).addTo(map);
      markersRef.current.push(routeShadow);

      // Main route line
      const routeOuter = L.polyline(routeCoordinates, {
        color: "#60a5fa",
        weight: 8,
        opacity: 0.8,
        lineJoin: "round",
        lineCap: "round"
      }).addTo(map);
      markersRef.current.push(routeOuter);

      routeLineRef.current = L.polyline(routeCoordinates, {
        color: "#3b82f6",
        weight: 5,
        opacity: 1,
        lineJoin: "round",
        lineCap: "round"
      }).addTo(map);

      const animatedRoute = L.polyline(routeCoordinates, {
        color: "#ffffff",
        weight: 3,
        opacity: 0.9,
        dashArray: "4, 16",
        lineCap: "round",
        className: "animated-route-line"
      }).addTo(map);
      markersRef.current.push(animatedRoute);
      
      routeCoordinates.forEach(coord => {
        allPoints.push(coord);
      });
    } else if (courierLocation && customerLocation && 
               isValidCoord(courierLocation.lat, courierLocation.lng) &&
               isValidCoord(customerLocation.lat, customerLocation.lng)) {
      // Fallback: draw styled dashed line if no route available
      const fallbackShadow = L.polyline([
        [courierLocation.lat, courierLocation.lng],
        [customerLocation.lat, customerLocation.lng]
      ], {
        color: "#1e3a5f",
        weight: 8,
        opacity: 0.3,
        dashArray: "1, 0"
      }).addTo(map);
      markersRef.current.push(fallbackShadow);

      routeLineRef.current = L.polyline([
        [courierLocation.lat, courierLocation.lng],
        [customerLocation.lat, customerLocation.lng]
      ], {
        color: "#3b82f6",
        weight: 4,
        opacity: 0.8,
        dashArray: "12, 8"
      }).addTo(map);
    }

    // Add direction markers (turn points) on the map
    if (directions.length > 1) {
      // Skip first (depart) and last (arrive) for cleaner display
      const turnDirections = directions.slice(1, -1);
      
      turnDirections.forEach((direction, index) => {
        if (direction.location && direction.location.length === 2) {
          const turnIcon = L.divIcon({
            className: "direction-marker",
            html: `
              <div style="
                width: 24px;
                height: 24px;
                border-radius: 50%;
                background: linear-gradient(135deg, #8b5cf6, #6366f1);
                border: 2px solid white;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 10px;
                font-weight: bold;
                color: white;
                box-shadow: 0 2px 8px rgba(139, 92, 246, 0.4);
                cursor: pointer;
              ">${index + 1}</div>
            `,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
            popupAnchor: [0, -15]
          });

          const marker = L.marker([direction.location[0], direction.location[1]], { icon: turnIcon })
            .addTo(map)
            .bindPopup(`
              <div style="text-align:center;direction:rtl;min-width:150px;">
                <p style="font-weight:600;margin-bottom:4px;font-size:13px;">${direction.instruction}</p>
                ${direction.streetName ? `<p style="font-size:11px;color:#888;margin-bottom:2px;">${direction.streetName}</p>` : ''}
                <div style="display:flex;justify-content:center;gap:12px;margin-top:6px;font-size:11px;">
                  <span style="color:#3b82f6;font-weight:500;">${formatDistance(direction.distance)}</span>
                  <span style="color:#888;">${formatDuration(direction.duration)}</span>
                </div>
              </div>
            `);
          markersRef.current.push(marker);
        }
      });
    }

    // Fit bounds to show all markers and route
    if (allPoints.length > 1) {
      const bounds = L.latLngBounds(allPoints);
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
    }
  }, [storeLocation, customerLocation, courierLocation, storeName, lastUpdated, isValidCoord, routeCoordinates, trafficSegments, directions]);

  // Initialize map
  useEffect(() => {
    if (isLoading || isMapSettingsLoading) return;
    
    const initMap = async () => {
      if (!mapContainerRef.current) return;

      try {
        const L = await import("leaflet");
        leafletRef.current = L.default;

        // Clean up existing map
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }

        // Calculate valid points
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

        // Calculate center
        const avgLat = points.reduce((sum, p) => sum + p[0], 0) / points.length;
        const avgLng = points.reduce((sum, p) => sum + p[1], 0) / points.length;

        // Create map
        const map = L.default.map(mapContainerRef.current, {
          center: [avgLat, avgLng],
          zoom: 14,
          scrollWheelZoom: false,
          zoomControl: true
        });

        // Add tile layer based on selected provider
        if (isMapbox && mapboxApiKey) {
          // Use Mapbox tiles
          L.default.tileLayer(
            `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=${mapboxApiKey}`,
            {
              attribution: '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a>',
              maxZoom: 19,
              tileSize: 512,
              zoomOffset: -1
            }
          ).addTo(map);
        } else {
          // Use OpenStreetMap tiles (default - free)
          L.default.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; OpenStreetMap',
            maxZoom: 19
          }).addTo(map);
        }

        mapInstanceRef.current = map;

        // Add markers and route
        updateMarkersAndRoute(L.default, map);

        // Fix map size after a delay
        setTimeout(() => {
          if (map && map.invalidateSize) {
            map.invalidateSize();
          }
        }, 200);

        // Also fix on window resize
        const handleResize = () => {
          if (map && map.invalidateSize) {
            map.invalidateSize();
          }
        };
        window.addEventListener('resize', handleResize);

        return () => {
          window.removeEventListener('resize', handleResize);
        };

      } catch (error) {
        console.error("Failed to initialize map:", error);
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

  // Update markers when courier location or route changes
  useEffect(() => {
    if (mapInstanceRef.current && leafletRef.current) {
      updateMarkersAndRoute(leafletRef.current, mapInstanceRef.current);
    }
  }, [courierLocation, routeCoordinates, updateMarkersAndRoute]);

  // Open in Google Maps
  const openInGoogleMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  // Check if we have any valid points
  const hasValidPoints = (
    (storeLocation && isValidCoord(storeLocation.lat, storeLocation.lng)) ||
    (customerLocation && isValidCoord(customerLocation.lat, customerLocation.lng)) ||
    (courierLocation && isValidCoord(courierLocation.lat, courierLocation.lng))
  );

  if (isLoading) {
    return (
      <div className="h-[350px] rounded-xl bg-muted flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  // Show fallback with buttons if no valid locations or map error
  if (!hasValidPoints || mapError) {
    return (
      <div className="space-y-4">
        <div className="h-[200px] rounded-xl bg-muted flex flex-col items-center justify-center gap-3">
          <AlertCircle className="w-8 h-8 text-muted-foreground" />
          <p className="text-muted-foreground text-center">لا تتوفر إحداثيات للخريطة</p>
        </div>
        <div className="flex flex-wrap gap-2 justify-center">
          {storeLocation && (
            <Button variant="outline" size="sm" className="gap-2" onClick={() => openInGoogleMaps(storeLocation.lat, storeLocation.lng)}>
              <ExternalLink className="w-4 h-4" />
              موقع المتجر
            </Button>
          )}
          {customerLocation && (
            <Button variant="outline" size="sm" className="gap-2" onClick={() => openInGoogleMaps(customerLocation.lat, customerLocation.lng)}>
              <ExternalLink className="w-4 h-4" />
              موقع التوصيل
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* ETA & Traffic Display */}
      {courierLocation && remainingSeconds > 0 && (
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-4 border border-primary/20">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
                <Clock className="w-7 h-7 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">الوقت المتبقي للوصول</p>
                <p className="text-2xl font-bold text-primary">{formatRemainingTime(remainingSeconds)}</p>
                {baseDurationMinutes && trafficLevel && baseDurationMinutes !== estimatedMinutes && (
                  <p className="text-xs text-muted-foreground">
                    الوقت الأساسي: {baseDurationMinutes} دقيقة
                    {estimatedMinutes && estimatedMinutes > baseDurationMinutes && (
                      <span className="text-amber-600 mr-1">(+{estimatedMinutes - baseDurationMinutes} دقيقة بسبب المرور)</span>
                    )}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-2">
              {distanceKm && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-semibold">{distanceKm} كم</span>
                  <Navigation className="w-4 h-4 text-primary" />
                </div>
              )}
              {trafficLevel && (
                <div 
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium text-white"
                  style={{ backgroundColor: trafficColors[trafficLevel] }}
                >
                  {trafficLevel === 'heavy' || trafficLevel === 'severe' ? (
                    <AlertTriangle className="w-3.5 h-3.5" />
                  ) : (
                    <Car className="w-3.5 h-3.5" />
                  )}
                  {trafficLabels[trafficLevel]}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Map Container */}
      <div 
        ref={mapContainerRef} 
        className="h-[400px] w-full rounded-xl overflow-hidden border-2 border-border bg-muted shadow-lg"
        style={{ minHeight: "400px", position: "relative", zIndex: 0 }}
      />

      {/* Directions Panel */}
      {directions.length > 0 && (
        <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
          <button
            onClick={() => setShowDirections(!showDirections)}
            className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <CornerDownRight className="w-5 h-5 text-primary" />
              </div>
              <div className="text-right">
                <p className="font-semibold">اتجاهات المسار</p>
                <p className="text-xs text-muted-foreground">{directions.length} خطوة</p>
              </div>
            </div>
            {showDirections ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </button>
          
          {showDirections && (
            <div className="border-t border-border/50 max-h-[300px] overflow-y-auto">
              {directions.map((direction, index) => (
                <div 
                  key={index}
                  className={`flex items-start gap-3 p-3 ${index !== directions.length - 1 ? 'border-b border-border/30' : ''} hover:bg-muted/30 transition-colors`}
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm leading-relaxed">{direction.instruction}</p>
                    {direction.streetName && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
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

      {/* Traffic Legend */}
      <div className="bg-card rounded-xl p-3 border border-border/50">
        <p className="text-xs font-medium text-muted-foreground mb-2">دليل ألوان حركة المرور:</p>
        <div className="flex flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-2 rounded-full" style={{ backgroundColor: trafficColors.low }} />
            <span>سلسة</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-2 rounded-full" style={{ backgroundColor: trafficColors.moderate }} />
            <span>متوسطة</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-2 rounded-full" style={{ backgroundColor: trafficColors.heavy }} />
            <span>مزدحمة</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-2 rounded-full" style={{ backgroundColor: trafficColors.severe }} />
            <span>ازدحام شديد</span>
          </div>
        </div>
      </div>

      {/* Markers Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-emerald-500 shadow-sm" />
          <span className="font-medium">المتجر</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-blue-500 shadow-sm" />
          <span className="font-medium">المندوب</span>
          {!lastUpdated && courierLocation && <span className="text-xs text-muted-foreground">(موقع مبدئي)</span>}
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-red-500 shadow-sm" />
          <span className="font-medium">موقع التوصيل</span>
        </div>
        {lastUpdated && (
          <div className="mr-auto text-xs text-muted-foreground">
            آخر تحديث للموقع: {lastUpdated.toLocaleTimeString("ar-SA")}
          </div>
        )}
      </div>

      {/* Quick links to Google Maps */}
      <div className="flex flex-wrap gap-2">
        {storeLocation && isValidCoord(storeLocation.lat, storeLocation.lng) && (
          <Button variant="outline" size="sm" className="gap-2" onClick={() => openInGoogleMaps(storeLocation.lat, storeLocation.lng)}>
            <ExternalLink className="w-4 h-4" />
            فتح موقع المتجر
          </Button>
        )}
        {customerLocation && isValidCoord(customerLocation.lat, customerLocation.lng) && (
          <Button variant="outline" size="sm" className="gap-2" onClick={() => openInGoogleMaps(customerLocation.lat, customerLocation.lng)}>
            <ExternalLink className="w-4 h-4" />
            فتح موقع التوصيل
          </Button>
        )}
        {courierLocation && isValidCoord(courierLocation.lat, courierLocation.lng) && lastUpdated && (
          <Button variant="outline" size="sm" className="gap-2" onClick={() => openInGoogleMaps(courierLocation.lat, courierLocation.lng)}>
            <ExternalLink className="w-4 h-4" />
            فتح موقع المندوب
          </Button>
        )}
      </div>
    </div>
  );
}
