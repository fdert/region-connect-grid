import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

// Loud notification sound for new orders
const NOTIFICATION_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2645/2645-preview.mp3';

export const useMerchantNotifications = (storeId: string | undefined) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef<boolean>(false);

  // Play notification sound multiple times
  const playNotificationSound = useCallback(async (repeatCount: number = 3) => {
    if (isPlayingRef.current) return;
    isPlayingRef.current = true;

    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
        audioRef.current.volume = 1.0;
      }

      for (let i = 0; i < repeatCount; i++) {
        audioRef.current.currentTime = 0;
        await audioRef.current.play().catch(err => {
          console.log('Could not play notification sound:', err);
        });
        
        // Wait for sound to finish + small delay before repeating
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    } catch (error) {
      console.error('Error playing sound:', error);
    } finally {
      isPlayingRef.current = false;
    }
  }, []);

  // Request browser notification permission
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }, []);

  // Show browser push notification
  const showBrowserNotification = useCallback((title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        requireInteraction: true,
        tag: 'merchant-new-order',
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Auto close after 30 seconds
      setTimeout(() => notification.close(), 30000);
    }
  }, []);

  // Request permission on mount
  useEffect(() => {
    requestNotificationPermission();
  }, [requestNotificationPermission]);

  useEffect(() => {
    if (!storeId) return;

    console.log('Setting up merchant notifications for store:', storeId);

    // Subscribe to new orders for this store
    const channel = supabase
      .channel(`merchant-orders-${storeId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `store_id=eq.${storeId}`
        },
        (payload) => {
          console.log('New order for merchant:', payload);
          const newOrder = payload.new as any;
          
          // Play sound multiple times (3 times) and show browser notification
          playNotificationSound(3);
          showBrowserNotification(
            '🛒 طلب جديد!',
            `طلب جديد رقم ${newOrder.order_number} - المبلغ: ${newOrder.total} ر.س`
          );
          
          toast({
            title: "🛒 طلب جديد!",
            description: `طلب جديد رقم ${newOrder.order_number}`,
            duration: 15000,
          });
          
          // Invalidate queries to refresh data
          queryClient.invalidateQueries({ queryKey: ['merchant-orders'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `store_id=eq.${storeId}`
        },
        (payload) => {
          console.log('Order updated for merchant:', payload);
          const updatedOrder = payload.new as any;
          const oldOrder = payload.old as any;
          
          // Notify when courier picks up or delivers
          if (updatedOrder.status === 'picked_up' && oldOrder.status !== 'picked_up') {
            playNotificationSound(1);
            toast({
              title: "📦 تم استلام الطلب",
              description: `المندوب استلم الطلب رقم ${updatedOrder.order_number}`,
              duration: 8000,
            });
          } else if (updatedOrder.status === 'delivered' && oldOrder.status !== 'delivered') {
            playNotificationSound(1);
            toast({
              title: "✅ تم التوصيل",
              description: `تم توصيل الطلب رقم ${updatedOrder.order_number} بنجاح`,
              duration: 8000,
            });
          }
          
          // Invalidate queries to refresh data
          queryClient.invalidateQueries({ queryKey: ['merchant-orders'] });
        }
      )
      .subscribe((status) => {
        console.log('Merchant subscription status:', status);
      });

    return () => {
      console.log('Cleaning up merchant notifications');
      supabase.removeChannel(channel);
    };
  }, [storeId, toast, queryClient, playNotificationSound, showBrowserNotification]);

  return { playNotificationSound, requestNotificationPermission };
};
