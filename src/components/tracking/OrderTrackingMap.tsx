import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OrderTrackingMapProps {
  orderId: string;
  storeLocation?: { lat: number; lng: number } | null;
  customerLocation?: { lat: number; lng: number } | null;
  storeName?: string;
}

export default function OrderTrackingMap({ 
  orderId, 
  storeLocation, 
  customerLocation,
  storeName 
}: OrderTrackingMapProps) {
  const [courierLocation, setCourierLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // Validate coordinates
  const isValidCoord = (lat: number, lng: number) => {
    return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  };

  // Fetch initial courier location
  useEffect(() => {
    const fetchCourierLocation = async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("courier_location_lat, courier_location_lng, courier_location_updated_at")
        .eq("id", orderId)
        .single();

      if (!error && data?.courier_location_lat && data?.courier_location_lng) {
        setCourierLocation({
          lat: data.courier_location_lat,
          lng: data.courier_location_lng
        });
        if (data.courier_location_updated_at) {
          setLastUpdated(new Date(data.courier_location_updated_at));
        }
      }
      setIsLoading(false);
    };

    fetchCourierLocation();
  }, [orderId]);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel(`order-tracking-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`
        },
        (payload) => {
          const newData = payload.new as any;
          if (newData.courier_location_lat && newData.courier_location_lng) {
            setCourierLocation({
              lat: newData.courier_location_lat,
              lng: newData.courier_location_lng
            });
            if (newData.courier_location_updated_at) {
              setLastUpdated(new Date(newData.courier_location_updated_at));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  // Initialize map with vanilla Leaflet (not react-leaflet to avoid context issues)
  useEffect(() => {
    if (isLoading || !mapContainerRef.current) return;

    const initMap = async () => {
      try {
        const L = await import("leaflet");

        // If map already exists, just update it
        if (mapInstanceRef.current) {
          updateMarkers(L.default);
          return;
        }

        // Calculate center and bounds
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
          setMapReady(true);
          return;
        }

        const center: [number, number] = points.length > 0 
          ? [points[0][0], points[0][1]] 
          : [24.7136, 46.6753];

        // Create map
        const map = L.default.map(mapContainerRef.current, {
          center: center,
          zoom: 13,
          scrollWheelZoom: false
        });

        // Add tile layer
        L.default.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);

        mapInstanceRef.current = map;

        // Add markers
        updateMarkers(L.default);

        // Fit bounds if multiple points
        if (points.length > 1) {
          const bounds = L.default.latLngBounds(points);
          map.fitBounds(bounds, { padding: [50, 50] });
        }

        setMapReady(true);
      } catch (error) {
        console.error("Failed to initialize map:", error);
        setMapReady(true);
      }
    };

    const updateMarkers = (L: any) => {
      if (!mapInstanceRef.current) return;

      // Clear existing markers
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];

      const createIcon = (color: string, iconSvg: string) => {
        return L.divIcon({
          className: "custom-marker",
          html: `<div style="background-color: ${color}; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.3); border: 3px solid white;">${iconSvg}</div>`,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });
      };

      const storeIcon = createIcon("#10b981", '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/></svg>');
      const courierIcon = createIcon("#3b82f6", '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>');
      const customerIcon = createIcon("#ef4444", '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>');

      // Add store marker
      if (storeLocation && isValidCoord(storeLocation.lat, storeLocation.lng)) {
        const marker = L.marker([storeLocation.lat, storeLocation.lng], { icon: storeIcon })
          .addTo(mapInstanceRef.current)
          .bindPopup(`<div style="text-align:center;font-weight:500;">${storeName || "المتجر"}</div>`);
        markersRef.current.push(marker);
      }

      // Add customer marker
      if (customerLocation && isValidCoord(customerLocation.lat, customerLocation.lng)) {
        const marker = L.marker([customerLocation.lat, customerLocation.lng], { icon: customerIcon })
          .addTo(mapInstanceRef.current)
          .bindPopup('<div style="text-align:center;font-weight:500;">موقع التوصيل</div>');
        markersRef.current.push(marker);
      }

      // Add courier marker
      if (courierLocation && isValidCoord(courierLocation.lat, courierLocation.lng)) {
        const popup = lastUpdated 
          ? `<div style="text-align:center;"><p style="font-weight:500;">المندوب</p><p style="font-size:12px;color:#666;">آخر تحديث: ${lastUpdated.toLocaleTimeString("ar-SA")}</p></div>`
          : '<div style="text-align:center;font-weight:500;">المندوب</div>';
        const marker = L.marker([courierLocation.lat, courierLocation.lng], { icon: courierIcon })
          .addTo(mapInstanceRef.current)
          .bindPopup(popup);
        markersRef.current.push(marker);
      }

      // Add polyline
      const linePoints: [number, number][] = [];
      if (storeLocation && isValidCoord(storeLocation.lat, storeLocation.lng)) {
        linePoints.push([storeLocation.lat, storeLocation.lng]);
      }
      if (courierLocation && isValidCoord(courierLocation.lat, courierLocation.lng)) {
        linePoints.push([courierLocation.lat, courierLocation.lng]);
      }
      if (customerLocation && isValidCoord(customerLocation.lat, customerLocation.lng)) {
        linePoints.push([customerLocation.lat, customerLocation.lng]);
      }

      if (linePoints.length >= 2) {
        const polyline = L.polyline(linePoints, {
          color: "#3b82f6",
          weight: 3,
          opacity: 0.7,
          dashArray: "10, 10"
        }).addTo(mapInstanceRef.current);
        markersRef.current.push(polyline);
      }
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isLoading, storeLocation, customerLocation, courierLocation, storeName, lastUpdated]);

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
      <div className="h-[300px] rounded-xl bg-muted flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  // Show fallback with buttons if no valid locations
  if (!hasValidPoints) {
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
    <div className="space-y-2">
      <div 
        ref={mapContainerRef} 
        className="h-[300px] rounded-xl overflow-hidden border"
        style={{ minHeight: "300px" }}
      />

      {/* Legend and quick links */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span>المتجر</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span>المندوب</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span>موقع التوصيل</span>
        </div>
        {lastUpdated && (
          <div className="mr-auto">
            آخر تحديث: {lastUpdated.toLocaleTimeString("ar-SA")}
          </div>
        )}
      </div>

      {/* Quick links to Google Maps */}
      <div className="flex flex-wrap gap-2">
        {storeLocation && isValidCoord(storeLocation.lat, storeLocation.lng) && (
          <Button variant="ghost" size="sm" className="gap-1 text-xs h-7" onClick={() => openInGoogleMaps(storeLocation.lat, storeLocation.lng)}>
            <ExternalLink className="w-3 h-3" />
            فتح موقع المتجر
          </Button>
        )}
        {customerLocation && isValidCoord(customerLocation.lat, customerLocation.lng) && (
          <Button variant="ghost" size="sm" className="gap-1 text-xs h-7" onClick={() => openInGoogleMaps(customerLocation.lat, customerLocation.lng)}>
            <ExternalLink className="w-3 h-3" />
            فتح موقع التوصيل
          </Button>
        )}
        {courierLocation && isValidCoord(courierLocation.lat, courierLocation.lng) && (
          <Button variant="ghost" size="sm" className="gap-1 text-xs h-7" onClick={() => openInGoogleMaps(courierLocation.lat, courierLocation.lng)}>
            <ExternalLink className="w-3 h-3" />
            فتح موقع المندوب
          </Button>
        )}
      </div>
    </div>
  );
}
