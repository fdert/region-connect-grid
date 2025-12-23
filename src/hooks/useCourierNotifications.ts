import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

// Notification sound URL (using a free sound)
const NOTIFICATION_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

export const useCourierNotifications = (userId: string | undefined) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playNotificationSound = useCallback(() => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
        audioRef.current.volume = 1.0;
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(err => {
        console.log('Could not play notification sound:', err);
      });
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  }, []);

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
            
            // Play sound and show notification
            playNotificationSound();
            
            toast({
              title: "🔔 طلب جديد متاح!",
              description: `يوجد طلب جديد جاهز للتوصيل`,
              duration: 8000,
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
          
          // If order just became ready and has no courier
          if (
            updatedOrder.status === 'ready' && 
            oldOrder.status !== 'ready' && 
            !updatedOrder.courier_id
          ) {
            queryClient.invalidateQueries({ queryKey: ['available-orders'] });
            
            playNotificationSound();
            
            toast({
              title: "🔔 طلب جاهز للتوصيل!",
              description: `الطلب ${updatedOrder.order_number} جاهز للاستلام`,
              duration: 8000,
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
  }, [userId, toast, queryClient, playNotificationSound]);

  return { playNotificationSound };
};
