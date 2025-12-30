import MobileLayout from "@/components/courier/MobileLayout";
import { 
  Package, 
  DollarSign,
  TrendingUp,
  MapPin,
  Clock,
  CheckCircle,
  Navigation,
  Loader2,
  Bell,
  Truck,
  Box,
  ChevronLeft,
  Phone,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow, startOfDay, endOfDay } from "date-fns";
import { ar } from "date-fns/locale";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";
import { useCourierNotifications } from "@/hooks/useCourierNotifications";
import { useCourierGPS } from "@/hooks/useCourierGPS";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

type OrderStatus = Database['public']['Enums']['order_status'];

const statusLabels: Record<string, string> = {
  "assigned_to_courier": "تم تعيينك",
  "picked_up": "تم الاستلام",
  "on_the_way": "في الطريق",
  "delivered": "تم التسليم",
  "ready": "جاهز للاستلام",
};

const statusColors: Record<string, string> = {
  "assigned_to_courier": "bg-cyan-500",
  "ready": "bg-yellow-500",
  "picked_up": "bg-indigo-500",
  "on_the_way": "bg-primary",
  "delivered": "bg-green-500",
};

const MobileDashboard = () => {
  const [isAvailable, setIsAvailable] = useState(true);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Enable realtime notifications
  useCourierNotifications(user?.id);

  // GPS tracking for active order
  const gpsState = useCourierGPS(activeOrderId, true);

  // Fetch all orders assigned to courier
  const { data: allOrders, isLoading } = useQuery({
    queryKey: ['courier-orders-mobile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          store:stores(name, address, city, phone, logo_url, location_lat, location_lng)
        `)
        .eq('courier_id', user?.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    refetchInterval: 30000
  });

  // Fetch available orders
  const { data: availableOrders } = useQuery({
    queryKey: ['available-orders-mobile'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          store:stores(name, address, city, logo_url)
        `)
        .is('courier_id', null)
        .in('status', ['ready', 'accepted_by_merchant'])
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 15000
  });

  // Calculate stats
  const today = new Date();
  const activeStatuses = ['assigned_to_courier', 'ready', 'picked_up', 'on_the_way'];
  const activeOrders = allOrders?.filter(o => activeStatuses.includes(o.status || '')) || [];
  const completedToday = allOrders?.filter(o => {
    if (o.status !== 'delivered') return false;
    const orderDate = new Date(o.updated_at || o.created_at || '');
    return orderDate >= startOfDay(today) && orderDate <= endOfDay(today);
  }) || [];

  const todayEarnings = completedToday.reduce((sum, o) => sum + (o.delivery_fee || 0), 0);

  // Set active order for GPS tracking
  useEffect(() => {
    const trackableOrder = activeOrders.find(o => 
      o.status === 'picked_up' || o.status === 'on_the_way'
    );
    setActiveOrderId(trackableOrder?.id || null);
  }, [activeOrders]);

  // Update order status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, newStatus, oldStatus }: { orderId: string; newStatus: OrderStatus; oldStatus?: string }) => {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);
      
      if (error) throw error;
      
      try {
        const { notifyOrderStatusChange } = await import('@/lib/notifications');
        await notifyOrderStatusChange(orderId, newStatus, oldStatus);
      } catch (err) {
        console.error('Notification failed:', err);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courier-orders-mobile'] });
      toast.success("تم تحديث الحالة");
    },
    onError: () => {
      toast.error("حدث خطأ");
    }
  });

  // Accept order
  const acceptOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from('orders')
        .update({ 
          courier_id: user?.id,
          status: 'assigned_to_courier'
        })
        .eq('id', orderId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courier-orders-mobile'] });
      queryClient.invalidateQueries({ queryKey: ['available-orders-mobile'] });
      toast.success("تم قبول الطلب");
    },
    onError: () => {
      toast.error("حدث خطأ");
    }
  });

  const formatTimeAgo = (date: string) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ar });
  };

  const openGoogleMaps = (lat?: number | null, lng?: number | null, address?: string | null) => {
    if (lat && lng) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
    } else if (address) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
    }
  };

  const callPhone = (phone: string) => {
    window.open(`tel:${phone}`, '_self');
  };

  if (isLoading) {
    return (
      <MobileLayout title="لوحة التحكم">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="p-4 space-y-4">
        {/* Availability Toggle */}
        <div className="bg-card rounded-2xl p-4 flex items-center justify-between border border-border/50">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isAvailable ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            <span className="font-medium">{isAvailable ? 'متاح للطلبات' : 'غير متاح'}</span>
          </div>
          <Switch checked={isAvailable} onCheckedChange={setIsAvailable} />
        </div>

        {/* GPS Status */}
        {activeOrderId && (
          <div className={`rounded-2xl p-4 border ${gpsState.isTracking ? 'bg-primary/10 border-primary/30' : 'bg-muted border-border/50'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className={`w-5 h-5 ${gpsState.isTracking ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
                <span className="font-medium text-sm">
                  {gpsState.isTracking ? 'التتبع مفعّل' : 'التتبع متوقف'}
                </span>
              </div>
              {gpsState.accuracy && (
                <span className="text-xs text-muted-foreground">
                  دقة: {Math.round(gpsState.accuracy)}م
                </span>
              )}
            </div>
            {gpsState.error && (
              <div className="flex items-center gap-2 mt-2 text-destructive text-sm">
                <AlertCircle className="w-4 h-4" />
                {gpsState.error}
              </div>
            )}
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card rounded-2xl p-4 border border-border/50 text-center">
            <div className="text-2xl font-bold text-primary">{activeOrders.length}</div>
            <div className="text-xs text-muted-foreground">نشطة</div>
          </div>
          <div className="bg-card rounded-2xl p-4 border border-border/50 text-center">
            <div className="text-2xl font-bold text-green-500">{completedToday.length}</div>
            <div className="text-xs text-muted-foreground">مكتملة اليوم</div>
          </div>
          <div className="bg-card rounded-2xl p-4 border border-border/50 text-center">
            <div className="text-lg font-bold">{todayEarnings}</div>
            <div className="text-xs text-muted-foreground">ر.س</div>
          </div>
        </div>

        {/* Active Orders Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-lg">الطلبات النشطة</h2>
            <Link to="/courier/orders" className="text-sm text-primary flex items-center gap-1">
              عرض الكل
              <ChevronLeft className="w-4 h-4" />
            </Link>
          </div>

          {activeOrders.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border/50 p-8 text-center">
              <Package className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground text-sm">لا توجد طلبات نشطة</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeOrders.slice(0, 3).map((order) => (
                <div key={order.id} className="bg-card rounded-2xl border border-border/50 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{order.order_number}</span>
                      <Badge className={`${statusColors[order.status || '']} text-white border-0`}>
                        {statusLabels[order.status || '']}
                      </Badge>
                    </div>
                    <span className="font-bold text-primary">{order.delivery_fee || 0} ر.س</span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                        <MapPin className="w-3 h-3 text-primary" />
                      </div>
                      <span className="text-muted-foreground flex-1 truncate">{order.store?.name}</span>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8"
                        onClick={() => openGoogleMaps(order.store?.location_lat, order.store?.location_lng, order.store?.address)}
                      >
                        <Navigation className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center">
                        <Navigation className="w-3 h-3 text-green-500" />
                      </div>
                      <span className="text-muted-foreground flex-1 truncate">{order.delivery_address || 'لم يحدد'}</span>
                      {order.customer_phone && (
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8"
                          onClick={() => callPhone(order.customer_phone!)}
                        >
                          <Phone className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {(order.status === 'assigned_to_courier' || order.status === 'ready') && (
                      <Button 
                        className="flex-1 h-12"
                        onClick={() => updateStatusMutation.mutate({ orderId: order.id, newStatus: 'picked_up', oldStatus: order.status || undefined })}
                        disabled={updateStatusMutation.isPending}
                      >
                        <CheckCircle className="w-4 h-4 ml-2" />
                        تم الاستلام
                      </Button>
                    )}
                    {order.status === 'picked_up' && (
                      <Button 
                        className="flex-1 h-12"
                        onClick={() => updateStatusMutation.mutate({ orderId: order.id, newStatus: 'on_the_way', oldStatus: order.status || undefined })}
                        disabled={updateStatusMutation.isPending}
                      >
                        <Truck className="w-4 h-4 ml-2" />
                        في الطريق
                      </Button>
                    )}
                    {order.status === 'on_the_way' && (
                      <Button 
                        className="flex-1 h-12 bg-green-500 hover:bg-green-600"
                        onClick={() => updateStatusMutation.mutate({ orderId: order.id, newStatus: 'delivered', oldStatus: order.status || undefined })}
                        disabled={updateStatusMutation.isPending}
                      >
                        <CheckCircle className="w-4 h-4 ml-2" />
                        تم التسليم
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Available Orders */}
        {(availableOrders?.length || 0) > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                طلبات متاحة
                <Badge variant="destructive" className="mr-1">{availableOrders?.length}</Badge>
              </h2>
            </div>
            <div className="space-y-3">
              {availableOrders?.slice(0, 3).map((order) => (
                <div key={order.id} className="bg-card rounded-2xl border-2 border-primary/30 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold">{order.store?.name}</span>
                    <span className="font-bold text-primary">{order.delivery_fee || 0} ر.س</span>
                  </div>
                  <div className="text-sm text-muted-foreground mb-3">
                    <Clock className="w-3 h-3 inline ml-1" />
                    {formatTimeAgo(order.created_at || '')}
                  </div>
                  <Button 
                    className="w-full h-12"
                    onClick={() => acceptOrderMutation.mutate(order.id)}
                    disabled={acceptOrderMutation.isPending}
                  >
                    قبول الطلب
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </MobileLayout>
  );
};

export default MobileDashboard;
