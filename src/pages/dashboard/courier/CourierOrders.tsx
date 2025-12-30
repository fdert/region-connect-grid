import DashboardLayout from "../DashboardLayout";
import { 
  Package, 
  MapPin,
  Clock,
  Navigation,
  Loader2,
  Search,
  Filter,
  CheckCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, lazy, Suspense } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Lazy load courier location updater
const CourierLocationUpdater = lazy(() => import("@/components/tracking/CourierLocationUpdater"));

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

const CourierOrders = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("active");
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: orders, isLoading } = useQuery({
    queryKey: ['courier-all-orders', user?.id],
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

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, newStatus, oldStatus }: { orderId: string; newStatus: OrderStatus; oldStatus?: string }) => {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);
      
      if (error) throw error;

      // Send WhatsApp notification for status change
      try {
        const { notifyOrderStatusChange } = await import('@/lib/notifications');
        await notifyOrderStatusChange(orderId, newStatus, oldStatus);
      } catch (notifyError) {
        console.error('Failed to send notification:', notifyError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courier-all-orders'] });
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

  const activeStatuses = ['assigned_to_courier', 'ready', 'picked_up', 'on_the_way'];
  
  const filteredOrders = orders?.filter(order => {
    const matchesSearch = order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.delivery_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_phone?.includes(searchTerm);
    
    if (activeTab === "active") {
      return matchesSearch && activeStatuses.includes(order.status || '');
    } else {
      return matchesSearch && order.status === 'delivered';
    }
  }) || [];

  const formatTimeAgo = (date: string) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ar });
  };

  const formatDate = (date: string) => {
    return format(new Date(date), 'dd/MM/yyyy - hh:mm a', { locale: ar });
  };

  const handlePickup = (orderId: string, oldStatus?: string) => {
    updateStatusMutation.mutate({ orderId, newStatus: 'picked_up', oldStatus });
  };

  const handleOnTheWay = (orderId: string, oldStatus?: string) => {
    updateStatusMutation.mutate({ orderId, newStatus: 'on_the_way', oldStatus });
  };

  const handleDelivered = (orderId: string, oldStatus?: string) => {
    updateStatusMutation.mutate({ orderId, newStatus: 'delivered', oldStatus });
  };

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
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">الطلبات</h1>
          <p className="text-muted-foreground">إدارة جميع طلباتك</p>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="بحث برقم الطلب أو العنوان..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="active">
              النشطة ({orders?.filter(o => activeStatuses.includes(o.status || '')).length || 0})
            </TabsTrigger>
            <TabsTrigger value="completed">
              المكتملة ({orders?.filter(o => o.status === 'delivered').length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-6">
            {filteredOrders.length === 0 ? (
              <div className="bg-card rounded-2xl border border-border/50 p-8 text-center">
                <Package className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-bold text-lg mb-2">لا توجد طلبات نشطة</h3>
                <p className="text-muted-foreground">سيتم إشعارك عند تعيين طلبات جديدة لك</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => (
                  <div key={order.id} className="bg-card rounded-2xl border border-border/50 p-6">
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

                    {/* Location Tracking for active delivery orders */}
                    {(order.status === 'picked_up' || order.status === 'on_the_way') && (
                      <Suspense fallback={<div className="h-24 bg-muted animate-pulse rounded-xl mb-4" />}>
                        <CourierLocationUpdater orderId={order.id} isActive={true} />
                      </Suspense>
                    )}

                    <div className="flex gap-3">
                      {(order.status === 'assigned_to_courier' || order.status === 'ready') && (
                        <Button 
                          className="flex-1" 
                          onClick={() => handlePickup(order.id, order.status || undefined)}
                          disabled={updateStatusMutation.isPending}
                        >
                          تم الاستلام
                        </Button>
                      )}
                      {order.status === 'picked_up' && (
                        <Button 
                          className="flex-1" 
                          onClick={() => handleOnTheWay(order.id, order.status || undefined)}
                          disabled={updateStatusMutation.isPending}
                        >
                          في الطريق
                        </Button>
                      )}
                      {order.status === 'on_the_way' && (
                        <Button 
                          className="flex-1" 
                          onClick={() => handleDelivered(order.id, order.status || undefined)}
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
          </TabsContent>

          <TabsContent value="completed" className="mt-6">
            {filteredOrders.length === 0 ? (
              <div className="bg-card rounded-2xl border border-border/50 p-8 text-center">
                <CheckCircle className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-bold text-lg mb-2">لا توجد طلبات مكتملة</h3>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => (
                  <div key={order.id} className="bg-card rounded-2xl border border-border/50 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
                        <CheckCircle className="w-6 h-6 text-success" />
                      </div>
                      <div>
                        <div className="font-bold">{order.order_number}</div>
                        <div className="text-sm text-muted-foreground">{order.store?.name}</div>
                        <div className="text-xs text-muted-foreground">{formatDate(order.updated_at || order.created_at || '')}</div>
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-primary">{order.delivery_fee?.toLocaleString() || 0} ر.س</div>
                      <div className="text-xs text-muted-foreground">{order.delivery_address}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default CourierOrders;
