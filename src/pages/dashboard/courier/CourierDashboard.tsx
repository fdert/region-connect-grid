import DashboardLayout from "../DashboardLayout";
import { 
  Package, 
  DollarSign,
  TrendingUp,
  MapPin,
  Clock,
  CheckCircle,
  Navigation,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow, startOfDay, endOfDay } from "date-fns";
import { ar } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";

type OrderStatus = Database['public']['Enums']['order_status'];

const statusLabels: Record<string, string> = {
  "assigned_to_courier": "تم تعيينك",
  "picked_up": "تم الاستلام",
  "on_the_way": "في الطريق",
  "delivered": "تم التسليم",
  "ready": "جاهز للاستلام"
};

const statusColors: Record<string, string> = {
  "assigned_to_courier": "bg-cyan-500",
  "ready": "bg-warning",
  "picked_up": "bg-indigo-500",
  "on_the_way": "bg-primary",
  "delivered": "bg-success",
};

const CourierDashboard = () => {
  const [isAvailable, setIsAvailable] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch profile
  const { data: profile } = useQuery({
    queryKey: ['courier-profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  // Fetch all orders assigned to courier
  const { data: allOrders, isLoading } = useQuery({
    queryKey: ['courier-orders', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          store:stores(name, address, city)
        `)
        .eq('courier_id', user?.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  // Update order status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, newStatus }: { orderId: string; newStatus: OrderStatus }) => {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courier-orders'] });
      toast({
        title: "تم التحديث",
        description: "تم تحديث حالة الطلب بنجاح",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحديث حالة الطلب",
        variant: "destructive",
      });
    }
  });

  // Separate active and completed orders
  const activeStatuses = ['assigned_to_courier', 'ready', 'picked_up', 'on_the_way'];
  const activeOrders = allOrders?.filter(o => activeStatuses.includes(o.status || '')) || [];
  
  // Today's completed orders
  const today = new Date();
  const completedOrdersToday = allOrders?.filter(o => {
    if (o.status !== 'delivered') return false;
    const orderDate = new Date(o.updated_at || o.created_at || '');
    return orderDate >= startOfDay(today) && orderDate <= endOfDay(today);
  }) || [];

  // Calculate stats
  const todayOrders = allOrders?.filter(o => {
    const orderDate = new Date(o.created_at || '');
    return orderDate >= startOfDay(today) && orderDate <= endOfDay(today);
  }) || [];

  const todayEarnings = completedOrdersToday.reduce((sum, o) => sum + (o.delivery_fee || 0), 0);
  const totalEarnings = allOrders?.filter(o => o.status === 'delivered').reduce((sum, o) => sum + (o.delivery_fee || 0), 0) || 0;
  const totalDelivered = allOrders?.filter(o => o.status === 'delivered').length || 0;

  const stats = [
    {
      label: "طلبات اليوم",
      value: todayOrders.length.toString(),
      icon: Package,
      color: "from-primary to-emerald-600",
    },
    {
      label: "أرباح اليوم",
      value: `${todayEarnings.toLocaleString()} ر.س`,
      icon: DollarSign,
      color: "from-blue-500 to-cyan-500",
    },
    {
      label: "إجمالي الأرباح",
      value: `${totalEarnings.toLocaleString()} ر.س`,
      icon: TrendingUp,
      color: "from-orange-500 to-amber-500",
    },
    {
      label: "طلبات مكتملة",
      value: totalDelivered.toString(),
      icon: CheckCircle,
      color: "from-purple-500 to-violet-500",
    },
  ];

  const formatTimeAgo = (date: string) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ar });
  };

  const formatTime = (date: string) => {
    return format(new Date(date), 'hh:mm a', { locale: ar });
  };

  const handlePickup = (orderId: string) => {
    updateStatusMutation.mutate({ orderId, newStatus: 'picked_up' });
  };

  const handleOnTheWay = (orderId: string) => {
    updateStatusMutation.mutate({ orderId, newStatus: 'on_the_way' });
  };

  const handleDelivered = (orderId: string) => {
    updateStatusMutation.mutate({ orderId, newStatus: 'delivered' });
  };

  const firstName = profile?.full_name?.split(' ')[0] || 'المندوب';

  if (isLoading) {
    return (
      <DashboardLayout role="courier">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="courier">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">مرحباً، {firstName}</h1>
            <p className="text-muted-foreground">لديك {activeOrders.length} طلبات نشطة</p>
          </div>
          <div className="flex items-center gap-3 bg-card rounded-xl p-4 border border-border/50">
            <span className="text-sm font-medium">حالة التوفر</span>
            <Switch 
              checked={isAvailable} 
              onCheckedChange={setIsAvailable}
            />
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              isAvailable ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"
            }`}>
              {isAvailable ? "متاح" : "غير متاح"}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <div 
              key={index}
              className="bg-card rounded-2xl p-6 border border-border/50 hover:shadow-lg transition-shadow"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-4`}>
                <stat.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="text-2xl font-bold mb-1">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Active Orders */}
        <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 className="font-bold text-lg">الطلبات النشطة</h2>
          </div>
          {activeOrders.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="font-bold text-lg mb-2">لا توجد طلبات نشطة</h3>
              <p className="text-muted-foreground">سيتم إشعارك عند تعيين طلبات جديدة لك</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {activeOrders.map((order) => (
                <div key={order.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-bold text-lg">{order.order_number}</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium text-primary-foreground ${statusColors[order.status || 'assigned_to_courier']}`}>
                          {statusLabels[order.status || 'assigned_to_courier']}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        {formatTimeAgo(order.created_at || '')}
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="text-lg font-bold text-primary">{order.delivery_fee?.toLocaleString() || 0} ر.س</div>
                      <div className="text-xs text-muted-foreground">رسوم التوصيل</div>
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <MapPin className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">الاستلام من</div>
                        <div className="font-medium">{order.store?.name}</div>
                        <div className="text-sm text-muted-foreground">{order.store?.address || order.store?.city}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                        <Navigation className="w-4 h-4 text-accent-foreground" />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">التوصيل إلى</div>
                        <div className="font-medium">{order.customer_phone || 'العميل'}</div>
                        <div className="text-sm text-muted-foreground">{order.delivery_address || 'لم يتم تحديد العنوان'}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    {(order.status === 'assigned_to_courier' || order.status === 'ready') && (
                      <Button 
                        className="flex-1" 
                        onClick={() => handlePickup(order.id)}
                        disabled={updateStatusMutation.isPending}
                      >
                        تم الاستلام
                      </Button>
                    )}
                    {order.status === 'picked_up' && (
                      <Button 
                        className="flex-1" 
                        onClick={() => handleOnTheWay(order.id)}
                        disabled={updateStatusMutation.isPending}
                      >
                        في الطريق
                      </Button>
                    )}
                    {order.status === 'on_the_way' && (
                      <Button 
                        className="flex-1" 
                        variant="default"
                        onClick={() => handleDelivered(order.id)}
                        disabled={updateStatusMutation.isPending}
                      >
                        تم التسليم
                      </Button>
                    )}
                    <Button variant="outline" size="icon">
                      <Navigation className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Completed Today */}
        <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 className="font-bold text-lg">الطلبات المكتملة اليوم ({completedOrdersToday.length})</h2>
          </div>
          {completedOrdersToday.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">لم تكمل أي طلبات اليوم بعد</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {completedOrdersToday.map((order) => (
                <div key={order.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <div className="font-medium">{order.order_number}</div>
                      <div className="text-sm text-muted-foreground">{order.customer_phone || 'العميل'}</div>
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">{order.delivery_fee?.toLocaleString() || 0} ر.س</div>
                    <div className="text-xs text-muted-foreground">{formatTime(order.updated_at || order.created_at || '')}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CourierDashboard;
