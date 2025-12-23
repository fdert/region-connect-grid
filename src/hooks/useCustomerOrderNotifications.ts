import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

const statusLabels: Record<string, string> = {
  "new": "جديد",
  "accepted_by_merchant": "تم قبول طلبك من المتجر",
  "preparing": "جاري تحضير طلبك",
  "ready": "طلبك جاهز للاستلام",
  "assigned_to_courier": "تم تعيين مندوب لتوصيل طلبك",
  "picked_up": "المندوب استلم طلبك من المتجر",
  "on_the_way": "طلبك في الطريق إليك",
  "delivered": "تم تسليم طلبك بنجاح",
  "cancelled": "تم إلغاء طلبك",
  "failed": "فشل توصيل طلبك"
};

export const useCustomerOrderNotifications = () => {
  const { user } = useAuth();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const permissionRequested = useRef(false);

  // Request notification permission
  const requestPermission = async () => {
    if (permissionRequested.current) return;
    permissionRequested.current = true;

    if ('Notification' in window && Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch (error) {
        console.log('Notification permission denied');
      }
    }
  };

  // Play notification sound
  const playNotificationSound = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleD0tl+Pt4oVfQzyS4/TjhGBDO4vh9OOEYENAie/256VxSzhz4PfprWQ+O3zl+u6ySUE3dcvx7bVYQ0B34P79rmxLQG/S8v/Ao21OQGzW9P/JpG9PQG3X9f/No3BRQG/Y9f/RonJSQHTa9f/UoXRUQHnc9f/XoHZWQH7d9f/an3hYQIPe9f/dnnlbQIjf9f/gnXpdQI3g9f/jnHxfQJHh9f/lm31hQJbi9f/om4BiQJrj9f/qmoFkQJ7k9f/smYJmQKLl9f/umINoQKbm9f/wl4RqQKrn9f/ylYVsQK7o9f/0lIZuQLLp9f/2k4dwQLbq9f/4kolyQLrr9f/5kYp0QL7s9f/7kIt2QMLt9f/8j4x4QMbu9f/+jo16QMrv9f//jY58QM7w9f//jI9+QNLx9f//i5CAQMH29f//ipGCQMP39f//iZKEQMX49f//iJOGQMf59f//h5SIQM/69f//hpWKQNH79f//hZaMQNP89f//hJeOQNX99f//g5iQQNf+9f//gpmSQNn/9f//gZqUQNv/9f//gJuWQN3/9f/+f5yYQN//9f/+fpyaQOD/9f/+fZ2bQOH/9f/+fJ6cQOL/9f/9e5+dQOP/9f/9ep+eQOT/9f/9eaCfQOX/9f/8eKGgQOb/9f/8d6KhQOf/9f/8dqOiQOj/9f/7daOjQOn/9f/7dKSkQOr/9f/7c6WlQOv/9f/6cqamQOz/9f/6caalQO3/9f/6cKemQO7/9f/5b6enQO//9f/5bqioQPD/9f/5baipQPH/9f/4bKmqQPL/9f/4a6qrQPP/9f/4aqusQPT/9f/3aa2tQPX/9f/3aK6uQPb/9f/3Z6+vQPf/9f/2ZrCwQPj/9f/2ZbGxQPn/9f/2ZLKyQPr/9f/1Y7OzQPv/9f/1YrS0QPz/9f/1YbW1QP3/9f/0YLa2QP7/9f/0X7e3QP//9f/0Xri4QAD/9v/zXbm5QAH/9v/zXLq6QAL/9v/zW7u7QAP/9v/yWry8QAT/9v/yWb29QAX/9v/yWL6+QAb/9v/xV7+/QAf/9v/xVsDAwAj/9v/wVcHBwAn/9v/wVMLCwAr/9v/wU8PDwAv/9v/vUsTEwAz/9v/vUcXFwA3/9v/vUMbGwA7/9v/uT8fHwA//9v/uTsjIwBD/9v/uTcnJwBH/9v/tTMrKwBL/9v/tS8vLwBP/9v/tSszMwBT/9v/sSc3NwBX/9v/sSM7OwBb/9v/sR8/PwBf/9v/rRtDQwBj/9v/rRdHRwBn/9v/rRNLSwBr/9v/qQ9PTwBv/9v/qQtTUwBz/9v/qQdXVwB3/9v/pQNbWwB7/9v/pP9fXwB//9v/pPtjYwCD/9v/oPdnZwCH/9v/oPNrawCL/9v/oO9vbwCP/9v/nOtzcwCT/9v/nOd3dwCX/9v/nON7ewCb/9v/mN9/fwCf/9v/mNuDgwCj/9v/mNeHhwCn/9v/lNOLiwCr/9v/lM+PjwCv/9v/lMuTkwCz/9v/kMeXlwC3/9v/kMObmwC7/9v/kL+fnwC//9v/jLujowDD/9v/jLenpwDH/9v/jLOrqwDL/9v/iK+vrwDP/9v/iKuzswDT/9v/iKe3twDX/9v/hKO7uwDb/9v/hJ+/vwDf/9v/hJvDwwDj/9v/gJfHxwDn/9v/gJPLywDr/9v/gI/PzwDv/9v/fIvT0wDz/9v/fIfX1wD3/9v/fIPb2wD7/9v/eH/f3wD//9v/eHvj4wED/9v/eHfn5wEH/9v/dHPr6wEL/9v/dG/v7wEP/9v/dGvz8wET/9v/cGf39wEX/9v/cGP7+wEb/9v/cF///wEf/9v/bFgAAwEj/9v/bFQEBwEn/9v/bFAICwEr/9v/aEwMDwEv/9v/aEgQEwEz/9v/aEQUFwE3/9v/ZEAYGwE7/9v/ZDwcHwE//9v/ZDggIwFD/9v/YDQkJwFH/9v/YDAoKwFL/9v/YCwsLwFP/9v/XCgwMwFT/9v/XCQ0NwFX/9v/XCA4OwFb/9v/WBw8PwFf/9v/WBhAQwFj/9v/WBREREVn/9v/VBBISEVr/9v/VAxMTEVv/9v/VAhQUEVz/9v/UARUVwF3/9v/UABYWwF7/9v/T/xcXwF//9v/T/hgYwGD/9v/T/RkZwGH/9v/S/BoawGL/9v/S+xsbwGP/9v/S+hwcwGT/9v/R+R0dwGX/9v/R+B4ewGb/9v/R9x8fwGf/9v/Q9iAgwGj/9v/Q9SEhwGn/9v/Q9CIiwGr/9v/P8yMjwGv/9v/P8iQkwGz/9v/P8SUlwG3/9v/O8CYmwG7/9v/O7ycnwG//9v/O7igowHD/9v/N7SkpwHH/9v/N7CoqwHL/9v/N6ysrwHP/9v/M6iwswHT/9v/M6S0twHX/9v/M6C4uwHb/9v/L5y8vwHf/9v/L5jAwwHj/9v/L5TExwHn/9v/K5DIywHr/9v/K4zMzwHv/9v/K4jQ0wHz/9v/J4TU1wH3/9v/J4DY2wH7/9v/J3zc3wH//9v/I3jg4wID/9v/I3Tk5wIH/9v/I3Do6wIL/9v/H2zs7wIP/9v/H2jw8wIT/9v/H2T09wIX/9v/G2D4+wIb/9v/G1z8/wIf/9v/G1kBAwIj/9v/F1UFBwIn/9v/F1EJCwIr/9v/F00NDwIv/9v/E0kREwIz/9v/E0UVFwI3/9v/E0EZGwI7/9v/Dz0dHwI//9v/DzkgAAA==');
    }
    
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(console.log);
  };

  // Show browser notification
  const showBrowserNotification = (title: string, body: string, orderNumber: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const notification = new Notification(title, {
          body,
          icon: '/favicon.ico',
          tag: orderNumber,
          requireInteraction: true,
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      } catch (error) {
        console.log('Failed to show notification');
      }
    }
  };

  useEffect(() => {
    if (!user?.id) return;

    // Request permission on mount
    requestPermission();

    // Subscribe to order status changes
    const channel = supabase
      .channel('customer-order-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `customer_id=eq.${user.id}`
        },
        (payload) => {
          const newOrder = payload.new as any;
          const oldOrder = payload.old as any;
          
          // Only notify if status changed
          if (newOrder.status !== oldOrder.status) {
            const statusMessage = statusLabels[newOrder.status] || 'تم تحديث حالة طلبك';
            
            // Play sound
            playNotificationSound();
            
            // Show toast
            toast.info(statusMessage, {
              description: `الطلب رقم: ${newOrder.order_number}`,
              duration: 8000,
            });
            
            // Show browser notification
            showBrowserNotification(
              'تحديث الطلب',
              `${statusMessage}\nالطلب رقم: ${newOrder.order_number}`,
              newOrder.order_number
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return { requestPermission };
};
