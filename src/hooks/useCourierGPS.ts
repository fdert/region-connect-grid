import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GPSState {
  isTracking: boolean;
  isUpdating: boolean;
  lastUpdate: Date | null;
  accuracy: number | null;
  error: string | null;
  position: { lat: number; lng: number } | null;
}

export function useCourierGPS(orderId: string | null, isActive: boolean = true) {
  const [state, setState] = useState<GPSState>({
    isTracking: false,
    isUpdating: false,
    lastUpdate: null,
    accuracy: null,
    error: null,
    position: null,
  });

  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPositionRef = useRef<GeolocationPosition | null>(null);

  const updateLocation = useCallback(async (position: GeolocationPosition) => {
    if (!orderId || !isActive) return;

    setState(prev => ({ ...prev, isUpdating: true, error: null }));
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

      setState(prev => ({
        ...prev,
        isUpdating: false,
        lastUpdate: new Date(),
        accuracy: position.coords.accuracy,
        position: { lat: position.coords.latitude, lng: position.coords.longitude },
      }));
      
      console.log("📍 GPS: Location updated", position.coords.latitude, position.coords.longitude);
    } catch (err) {
      console.error("GPS update error:", err);
      setState(prev => ({ ...prev, isUpdating: false, error: "فشل في تحديث الموقع" }));
    }
  }, [orderId, isActive]);

  const handleError = useCallback((error: GeolocationPositionError) => {
    console.error("GPS error:", error);
    let message = "فشل في الحصول على الموقع";
    
    switch (error.code) {
      case error.PERMISSION_DENIED:
        message = "يرجى السماح بالوصول للموقع من إعدادات الجهاز";
        break;
      case error.POSITION_UNAVAILABLE:
        message = "الموقع غير متاح حالياً";
        break;
      case error.TIMEOUT:
        message = "انتهت مهلة الحصول على الموقع";
        break;
    }
    
    setState(prev => ({ ...prev, error: message }));
  }, []);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setState(prev => ({ ...prev, error: "الجهاز لا يدعم تحديد الموقع" }));
      toast.error("الجهاز لا يدعم تحديد الموقع");
      return;
    }

    if (!orderId) {
      setState(prev => ({ ...prev, error: "لا يوجد طلب محدد" }));
      return;
    }

    setState(prev => ({ ...prev, isTracking: true, error: null }));

    // Get initial position
    navigator.geolocation.getCurrentPosition(
      updateLocation,
      handleError,
      { enableHighAccuracy: true, timeout: 15000 }
    );

    // Start watching position
    const id = navigator.geolocation.watchPosition(
      updateLocation,
      handleError,
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 3000
      }
    );
    watchIdRef.current = id;

    // Also update every 10 seconds even if position hasn't changed
    intervalRef.current = setInterval(() => {
      if (lastPositionRef.current) {
        updateLocation(lastPositionRef.current);
      }
    }, 10000);

    toast.success("✅ تم تفعيل تتبع GPS");
  }, [orderId, updateLocation, handleError]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setState(prev => ({ ...prev, isTracking: false }));
    toast.info("تم إيقاف تتبع GPS");
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Auto-start when orderId is set and isActive
  useEffect(() => {
    if (orderId && isActive && !state.isTracking) {
      const timer = setTimeout(startTracking, 500);
      return () => clearTimeout(timer);
    } else if (!isActive && state.isTracking) {
      stopTracking();
    }
  }, [orderId, isActive, state.isTracking, startTracking, stopTracking]);

  return {
    ...state,
    startTracking,
    stopTracking,
  };
}
