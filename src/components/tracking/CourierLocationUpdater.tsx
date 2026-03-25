import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Navigation, Loader2, CheckCircle2, XCircle, Radio, Satellite, AlertTriangle } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface CourierLocationUpdaterProps {
  orderId: string;
  isActive?: boolean;
}

export default function CourierLocationUpdater({ orderId, isActive = true }: CourierLocationUpdaterProps) {
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [updateCount, setUpdateCount] = useState(0);
  const watchIdRef = useRef<number | null>(null);
  const updateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPositionRef = useRef<GeolocationPosition | null>(null);

  const updateLocation = useCallback(async (position: GeolocationPosition) => {
    if (!isActive) return;

    setIsUpdating(true);
    setError(null);
    setAccuracy(position.coords.accuracy);
    lastPositionRef.current = position;

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
      setUpdateCount(prev => prev + 1);
      console.log("📍 Location updated:", position.coords.latitude, position.coords.longitude);
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
        message = "يرجى السماح بالوصول للموقع من إعدادات المتصفح";
        break;
      case error.POSITION_UNAVAILABLE:
        message = "الموقع غير متاح حالياً";
        break;
      case error.TIMEOUT:
        message = "انتهت مهلة الحصول على الموقع";
        break;
    }
    
    setError(message);
  }, []);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError("المتصفح لا يدعم تحديد الموقع");
      toast({
        title: "خطأ",
        description: "المتصفح لا يدعم تحديد الموقع",
        variant: "destructive"
      });
      return;
    }

    setIsTracking(true);
    setError(null);
    setUpdateCount(0);

    // Get initial position
    navigator.geolocation.getCurrentPosition(
      updateLocation,
      handleLocationError,
      { enableHighAccuracy: true, timeout: 15000 }
    );

    // Start watching position
    const id = navigator.geolocation.watchPosition(
      updateLocation,
      handleLocationError,
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 3000
      }
    );

    watchIdRef.current = id;

    // Also update every 10 seconds even if position hasn't changed significantly
    updateIntervalRef.current = setInterval(() => {
      if (lastPositionRef.current) {
        updateLocation(lastPositionRef.current);
      }
    }, 10000);

    toast({
      title: "✅ تم تفعيل تتبع GPS",
      description: "موقعك يُرسل للعميل الآن لمتابعة الطلب"
    });
  }, [updateLocation, handleLocationError, toast]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }
    setIsTracking(false);
    
    toast({
      title: "تم إيقاف التتبع",
      description: "لن يتم تحديث موقعك للعميل"
    });
  }, [toast]);

  // Auto-start tracking when component mounts and isActive
  useEffect(() => {
    if (isActive && !isTracking) {
      // Small delay to ensure component is ready
      const timer = setTimeout(() => {
        startTracking();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isActive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, []);

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
    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border-2 border-blue-200 dark:border-blue-800 rounded-2xl p-5 space-y-4 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isTracking ? 'bg-emerald-500' : 'bg-gray-400'}`}>
            <Satellite className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-lg">تتبع GPS المباشر</h3>
            <p className="text-sm text-muted-foreground">يراك العميل على الخريطة</p>
          </div>
        </div>
        
        {/* Toggle Switch */}
        <div className="flex items-center gap-3">
          <span className={`text-sm font-medium ${isTracking ? 'text-emerald-600' : 'text-gray-500'}`}>
            {isTracking ? 'مفعّل' : 'معطّل'}
          </span>
          <Switch
            checked={isTracking}
            onCheckedChange={(checked) => {
              if (checked) {
                startTracking();
              } else {
                stopTracking();
              }
            }}
          />
        </div>
      </div>

      {/* Status Indicator */}
      {isTracking && (
        <div className="flex items-center gap-4 p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
              جاري البث المباشر
            </span>
          </div>
          
          {accuracy && (
            <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
              <Radio className="w-3 h-3" />
              دقة: {Math.round(accuracy)} متر
            </div>
          )}
          
          {updateCount > 0 && (
            <div className="text-xs text-emerald-600 dark:text-emerald-400">
              تحديثات: {updateCount}
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-destructive" />
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive">{error}</p>
            <p className="text-xs text-destructive/70">تأكد من تفعيل الموقع في المتصفح</p>
          </div>
          <Button size="sm" variant="outline" onClick={startTracking}>
            إعادة المحاولة
          </Button>
        </div>
      )}

      {/* Last Update Info */}
      {lastUpdate && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">آخر تحديث للموقع:</span>
          <span className="font-medium">{lastUpdate.toLocaleTimeString("ar-SA")}</span>
        </div>
      )}

      {/* Manual Update Button */}
      {isTracking && (
        <Button 
          variant="outline"
          className="w-full"
          onClick={() => {
            navigator.geolocation.getCurrentPosition(updateLocation, handleLocationError, {
              enableHighAccuracy: true,
              timeout: 10000
            });
          }}
          disabled={isUpdating}
        >
          {isUpdating ? (
            <>
              <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              جاري تحديث الموقع...
            </>
          ) : (
            <>
              <MapPin className="w-4 h-4 ml-2" />
              تحديث الموقع الآن
            </>
          )}
        </Button>
      )}

      {/* Info Text */}
      <p className="text-xs text-center text-muted-foreground">
        📍 موقعك يظهر للعميل على الخريطة مباشرة لمتابعة الطلب
      </p>
    </div>
  );
}
