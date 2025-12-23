import DashboardLayout from "../DashboardLayout";
import { 
  Package, 
  Clock,
  Loader2,
  Search,
  CheckCircle,
  XCircle,
  MapPin,
  Store,
  Eye
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";

const statusLabels: Record<string, string> = {
  "new": "جديد",
  "accepted_by_merchant": "تم القبول",
  "preparing": "قيد التحضير",
  "ready": "جاهز",
  "assigned_to_courier": "تم تعيين مندوب",
  "picked_up": "تم الاستلام",
  "on_the_way": "في الطريق",
  "delivered": "تم التسليم",
  "cancelled": "ملغي",
  "failed": "فشل"
};

const statusColors: Record<string, string> = {
  "new": "bg-info",
  "accepted_by_merchant": "bg-blue-500",
  "preparing": "bg-warning",
  "ready": "bg-orange-500",
  "assigned_to_courier": "bg-cyan-500",
  "picked_up": "bg-indigo-500",
  "on_the_way": "bg-primary",
  "delivered": "bg-success",
  "cancelled": "bg-destructive",
  "failed": "bg-destructive"
};

const getOrderProgress = (status: string): number => {
  const progressMap: Record<string, number> = {
    "new": 10,
    "accepted_by_merchant": 20,
    "preparing": 40,
    "ready": 50,
    "assigned_to_courier": 60,
    "picked_up": 70,
    "on_the_way": 85,
    "delivered": 100,
    "cancelled": 0,
    "failed": 0
  };
  return progressMap[status] || 0;
};

const CustomerOrders = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("active");
  const { user } = useAuth();

  const { data: orders, isLoading } = useQuery({
    queryKey: ['customer-all-orders', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          store:stores(name, logo_url, address)
        `)
        .eq('customer_id', user?.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  const activeStatuses = ['new', 'accepted_by_merchant', 'preparing', 'ready', 'assigned_to_courier', 'picked_up', 'on_the_way'];
  
  const filteredOrders = orders?.filter(order => {
    const matchesSearch = order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.store?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === "active") {
      return matchesSearch && activeStatuses.includes(order.status || '');
    } else if (activeTab === "completed") {
      return matchesSearch && order.status === 'delivered';
    } else {
      return matchesSearch && (order.status === 'cancelled' || order.status === 'failed');
    }
  }) || [];

  const formatTimeAgo = (date: string) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ar });
  };

  const formatDate = (date: string) => {
    return format(new Date(date), 'dd/MM/yyyy - hh:mm a', { locale: ar });
  };

  const getItemsCount = (items: any) => {
    if (Array.isArray(items)) return items.length;
    return 0;
  };

  if (isLoading) {
    return (
      <DashboardLayout role="customer">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="customer">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">طلباتي</h1>
          <p className="text-muted-foreground">تتبع جميع طلباتك</p>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="بحث برقم الطلب أو اسم المتجر..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="active">
              النشطة ({orders?.filter(o => activeStatuses.includes(o.status || '')).length || 0})
            </TabsTrigger>
            <TabsTrigger value="completed">
              المكتملة ({orders?.filter(o => o.status === 'delivered').length || 0})
            </TabsTrigger>
            <TabsTrigger value="cancelled">
              الملغاة ({orders?.filter(o => o.status === 'cancelled' || o.status === 'failed').length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-6">
            {filteredOrders.length === 0 ? (
              <div className="bg-card rounded-2xl border border-border/50 p-8 text-center">
                <Package className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-bold text-lg mb-2">لا توجد طلبات نشطة</h3>
                <p className="text-muted-foreground">ابدأ بالتسوق واطلب من متاجرك المفضلة</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => (
                  <Link key={order.id} to={`/customer/orders/${order.id}`} className="block bg-card rounded-2xl border border-border/50 p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center overflow-hidden">
                          {order.store?.logo_url ? (
                            <img src={order.store.logo_url} alt={order.store?.name} className="w-full h-full object-cover" />
                          ) : (
                            <Store className="w-6 h-6 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <span className="font-bold">{order.order_number}</span>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium text-primary-foreground ${statusColors[order.status || 'new']}`}>
                              {statusLabels[order.status || 'new']}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {order.store?.name} • {getItemsCount(order.items)} منتجات
                          </div>
                        </div>
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-lg">{order.total?.toLocaleString()} ر.س</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTimeAgo(order.created_at || '')}
                        </div>
                      </div>
                    </div>

                    {order.delivery_address && (
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 mb-4">
                        <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <span className="text-sm">{order.delivery_address}</span>
                      </div>
                    )}

                    <Progress value={getOrderProgress(order.status || 'new')} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground mt-2">
                      <span>تم الطلب</span>
                      <span>قيد التحضير</span>
                      <span>في الطريق</span>
                      <span>تم التسليم</span>
                    </div>
                    <div className="flex items-center justify-center gap-2 mt-4 text-primary text-sm">
                      <Eye className="w-4 h-4" />
                      <span>عرض تفاصيل الطلب</span>
                    </div>
                  </Link>
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
                  <Link key={order.id} to={`/customer/orders/${order.id}`} className="block bg-card rounded-2xl border border-border/50 p-4 hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between">
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
                      <div className="text-left flex items-center gap-4">
                        <div>
                          <div className="font-bold">{order.total?.toLocaleString()} ر.س</div>
                          <div className="text-xs text-success">تم التسليم</div>
                        </div>
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="cancelled" className="mt-6">
            {filteredOrders.length === 0 ? (
              <div className="bg-card rounded-2xl border border-border/50 p-8 text-center">
                <XCircle className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-bold text-lg mb-2">لا توجد طلبات ملغاة</h3>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => (
                  <Link key={order.id} to={`/customer/orders/${order.id}`} className="block bg-card rounded-2xl border border-border/50 p-4 hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                          <XCircle className="w-6 h-6 text-destructive" />
                        </div>
                        <div>
                          <div className="font-bold">{order.order_number}</div>
                          <div className="text-sm text-muted-foreground">{order.store?.name}</div>
                          <div className="text-xs text-muted-foreground">{formatDate(order.created_at || '')}</div>
                        </div>
                      </div>
                      <div className="text-left flex items-center gap-4">
                        <div>
                          <div className="font-bold">{order.total?.toLocaleString()} ر.س</div>
                          <div className="text-xs text-destructive">{statusLabels[order.status || 'cancelled']}</div>
                        </div>
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default CustomerOrders;
