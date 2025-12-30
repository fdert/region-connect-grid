import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Navigation, Loader2, CheckCircle2, XCircle } from "lucide-react";

interface CourierLocationUpdaterProps {
  orderId: string;
  isActive?: boolean; // Only update when order is in delivery status
}

export default function CourierLocationUpdater({ orderId, isActive = true }: CourierLocationUpdaterProps) {
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateLocation = useCallback(async (position: GeolocationPosition) => {
    if (!isActive) return;

    setIsUpdating(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          courier_location_lat: position.coords.latitude,
          courier_location_lng: position.coords.longitude,
          courier_location_updated_at: new Date().toISOString()
        })
        .eq("id", orderId);

      if (updateError) throw updateError;

      setLastUpdate(new Date());
      console.log("Location updated:", position.coords.latitude, position.coords.longitude);
    } catch (err) {
      console.error("Error updating location:", err);
      setError("فشل في تحديث الموقع");
    } finally {
      setIsUpdating(false);
    }
  }, [orderId, isActive]);

  const handleLocationError = useCallback((error: GeolocationPositionError) => {
    console.error("Geolocation error:", error);
    let message = "فشل في الحصول على الموقع";
    
    switch (error.code) {
      case error.PERMISSION_DENIED:
        message = "تم رفض إذن الموقع. يرجى السماح بالوصول للموقع من إعدادات المتصفح.";
        break;
      case error.POSITION_UNAVAILABLE:
        message = "الموقع غير متاح حالياً";
        break;
      case error.TIMEOUT:
        message = "انتهت مهلة الحصول على الموقع";
        break;
    }
    
    setError(message);
    toast({
      title: "خطأ في الموقع",
      description: message,
      variant: "destructive"
    });
  }, [toast]);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError("المتصفح لا يدعم تحديد الموقع");
      return;
    }

    setIsTracking(true);
    setError(null);

    // Get initial position
    navigator.geolocation.getCurrentPosition(
      updateLocation,
      handleLocationError,
      { enableHighAccuracy: true, timeout: 10000 }
    );

    // Start watching position
    const id = navigator.geolocation.watchPosition(
      updateLocation,
      handleLocationError,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000 // Update every 5 seconds at most
      }
    );

    setWatchId(id);

    toast({
      title: "تتبع الموقع مفعّل",
      description: "سيتم تحديث موقعك للعميل تلقائياً"
    });
  }, [updateLocation, handleLocationError, toast]);

  const stopTracking = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setIsTracking(false);
    
    toast({
      title: "تم إيقاف التتبع",
      description: "لن يتم تحديث موقعك للعميل"
    });
  }, [watchId, toast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  // Stop tracking if order is no longer active
  useEffect(() => {
    if (!isActive && isTracking) {
      stopTracking();
    }
  }, [isActive, isTracking, stopTracking]);

  if (!isActive) {
    return null;
  }

  return (
    <div className="bg-card border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium flex items-center gap-2">
          <Navigation className="w-5 h-5 text-primary" />
          تتبع الموقع المباشر
        </h3>
        {isTracking && (
          <span className="flex items-center gap-1 text-xs text-emerald-600">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            نشط
          </span>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-2">
          <XCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {lastUpdate && (
        <p className="text-xs text-muted-foreground">
          آخر تحديث: {lastUpdate.toLocaleTimeString("ar-SA")}
        </p>
      )}

      <div className="flex gap-2">
        {!isTracking ? (
          <Button onClick={startTracking} className="flex-1">
            <MapPin className="w-4 h-4 ml-2" />
            بدء تتبع الموقع
          </Button>
        ) : (
          <>
            <Button variant="outline" onClick={stopTracking} className="flex-1">
              إيقاف التتبع
            </Button>
            <Button 
              variant="secondary"
              onClick={() => navigator.geolocation.getCurrentPosition(updateLocation, handleLocationError)}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
            </Button>
          </>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        سيتم مشاركة موقعك مع العميل لتتبع الطلب على الخريطة
      </p>
    </div>
  );
}
