import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

// Notification sound URL - loud and clear alert sound
const NOTIFICATION_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2645/2645-preview.mp3';

export const useCourierNotifications = (userId: string | undefined) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef<boolean>(false);

  // Play notification sound multiple times (3 times with delay)
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
        tag: 'new-order',
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
    if (!userId) return;

    console.log('Setting up courier notifications for user:', userId);

    // Subscribe to orders assigned to this courier
    const channel = supabase
      .channel('courier-order-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `courier_id=eq.${userId}`
        },
        (payload) => {
          console.log('Order updated for courier:', payload);
          
          // Invalidate queries to refresh data
          queryClient.invalidateQueries({ queryKey: ['courier-orders'] });
          queryClient.invalidateQueries({ queryKey: ['courier-all-orders'] });
          queryClient.invalidateQueries({ queryKey: ['available-orders'] });
          
          // Play sound and show notification
          playNotificationSound();
          
          toast({
            title: "🚚 تحديث طلب",
            description: `تم تحديث حالة الطلب ${(payload.new as any).order_number}`,
            duration: 5000,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('New order created:', payload);
          
          // Check if order is ready for pickup (no courier assigned yet)
          const newOrder = payload.new as any;
          if (!newOrder.courier_id && (newOrder.status === 'ready' || newOrder.status === 'accepted_by_merchant')) {
            // Invalidate available orders query
            queryClient.invalidateQueries({ queryKey: ['available-orders'] });
            
            // Play sound multiple times (3 times) and show browser notification
            playNotificationSound(3);
            showBrowserNotification(
              '🔔 طلب جديد متاح للتوصيل!',
              `يوجد طلب جديد جاهز للتوصيل - رقم الطلب: ${newOrder.order_number}`
            );
            
            toast({
              title: "🔔 طلب جديد متاح!",
              description: `يوجد طلب جديد جاهز للتوصيل`,
              duration: 15000,
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('Courier subscription status:', status);
      });

    // Also listen for orders that become ready (status update to ready without courier)
    const readyOrdersChannel = supabase
      .channel('ready-orders-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          const updatedOrder = payload.new as any;
          const oldOrder = payload.old as any;
          
          // If order just became ready or accepted_by_merchant and has no courier
          if (
            (updatedOrder.status === 'ready' || updatedOrder.status === 'accepted_by_merchant') && 
            oldOrder.status !== 'ready' && 
            oldOrder.status !== 'accepted_by_merchant' &&
            !updatedOrder.courier_id
          ) {
            queryClient.invalidateQueries({ queryKey: ['available-orders'] });
            
            // Play sound multiple times (3 times) and show browser notification
            playNotificationSound(3);
            showBrowserNotification(
              '🔔 طلب جاهز للتوصيل!',
              `الطلب ${updatedOrder.order_number} جاهز للاستلام من المتجر`
            );
            
            toast({
              title: "🔔 طلب جاهز للتوصيل!",
              description: `الطلب ${updatedOrder.order_number} جاهز للاستلام`,
              duration: 15000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up courier notifications');
      supabase.removeChannel(channel);
      supabase.removeChannel(readyOrdersChannel);
    };
  }, [userId, toast, queryClient, playNotificationSound, showBrowserNotification]);

  return { playNotificationSound, requestNotificationPermission };
};
