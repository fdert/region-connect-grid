import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, MapPin, Store, Truck, AlertCircle } from "lucide-react";

// Fix for default marker icons in Leaflet with Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Custom icons
const createIcon = (color: string, iconHtml: string) => {
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="background-color: ${color}; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.3); border: 3px solid white;">${iconHtml}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
};

const storeIcon = createIcon("#10b981", '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7"/></svg>');

const courierIcon = createIcon("#3b82f6", '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>');

const customerIcon = createIcon("#ef4444", '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>');

interface OrderTrackingMapProps {
  orderId: string;
  storeLocation?: { lat: number; lng: number } | null;
  customerLocation?: { lat: number; lng: number } | null;
  storeName?: string;
}

// Component to fit bounds
function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  
  useEffect(() => {
    if (points.length > 0) {
      const bounds = L.latLngBounds(points.map(p => [p[0], p[1]]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [points, map]);
  
  return null;
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

  // Validate coordinates - check if they're within reasonable bounds for Saudi Arabia
  const isValidCoord = (lat: number, lng: number) => {
    return lat >= 15 && lat <= 33 && lng >= 34 && lng <= 56;
  };

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

  // Default center (Saudi Arabia)
  const defaultCenter: [number, number] = points.length > 0 
    ? [points[0][0], points[0][1]] 
    : [24.7136, 46.6753];

  if (isLoading) {
    return (
      <div className="h-[300px] rounded-xl bg-muted flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  // Show message if no valid locations
  if (points.length === 0) {
    return (
      <div className="h-[300px] rounded-xl bg-muted flex flex-col items-center justify-center gap-3">
        <AlertCircle className="w-8 h-8 text-muted-foreground" />
        <p className="text-muted-foreground text-center">لا تتوفر إحداثيات صحيحة للخريطة</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="h-[300px] rounded-xl overflow-hidden border">
        <MapContainer
          key={`map-${orderId}`}
          center={defaultCenter}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {points.length > 1 && <FitBounds points={points} />}

          {/* Store marker */}
          {storeLocation && (
            <Marker position={[storeLocation.lat, storeLocation.lng]} icon={storeIcon}>
              <Popup>
                <div className="text-center">
                  <Store className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
                  <p className="font-medium">{storeName || "المتجر"}</p>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Customer marker */}
          {customerLocation && (
            <Marker position={[customerLocation.lat, customerLocation.lng]} icon={customerIcon}>
              <Popup>
                <div className="text-center">
                  <MapPin className="w-4 h-4 mx-auto mb-1 text-red-600" />
                  <p className="font-medium">موقع التوصيل</p>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Courier marker */}
          {courierLocation && (
            <Marker position={[courierLocation.lat, courierLocation.lng]} icon={courierIcon}>
              <Popup>
                <div className="text-center">
                  <Truck className="w-4 h-4 mx-auto mb-1 text-blue-600" />
                  <p className="font-medium">المندوب</p>
                  {lastUpdated && (
                    <p className="text-xs text-muted-foreground">
                      آخر تحديث: {lastUpdated.toLocaleTimeString("ar-SA")}
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          )}

          {/* Route line */}
          {storeLocation && customerLocation && (
            <Polyline
              positions={[
                [storeLocation.lat, storeLocation.lng],
                ...(courierLocation ? [[courierLocation.lat, courierLocation.lng] as [number, number]] : []),
                [customerLocation.lat, customerLocation.lng]
              ]}
              color="#3b82f6"
              weight={3}
              opacity={0.7}
              dashArray="10, 10"
            />
          )}
        </MapContainer>
      </div>

      {/* Legend */}
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
          <div className="mr-auto text-muted-foreground">
            آخر تحديث للموقع: {lastUpdated.toLocaleTimeString("ar-SA")}
          </div>
        )}
      </div>
    </div>
  );
}
