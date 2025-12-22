import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";
import DashboardLayout from "../DashboardLayout";
import { 
  Package, 
  DollarSign,
  TrendingUp,
  ArrowLeft,
  ShoppingBag,
  Star,
  Eye,
  Loader2,
  Store,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Database } from "@/integrations/supabase/types";

type OrderStatus = Database["public"]["Enums"]["order_status"];

const statusLabels: Record<OrderStatus, string> = {
  new: "جديد",
  accepted_by_merchant: "مقبول",
  preparing: "قيد التحضير",
  ready: "جاهز للتسليم",
  assigned_to_courier: "تم تعيين مندوب",
  picked_up: "تم الاستلام",
  on_the_way: "في الطريق",
  delivered: "تم التوصيل",
  cancelled: "ملغي",
  failed: "فشل",
};

const statusColors: Record<OrderStatus, string> = {
  new: "bg-blue-500",
  accepted_by_merchant: "bg-cyan-500",
  preparing: "bg-yellow-500",
  ready: "bg-green-500",
  assigned_to_courier: "bg-purple-500",
  picked_up: "bg-indigo-500",
  on_the_way: "bg-orange-500",
  delivered: "bg-emerald-500",
  cancelled: "bg-red-500",
  failed: "bg-gray-500",
};

const MerchantDashboard = () => {
  const navigate = useNavigate();

  // Check if merchant has a store
  const { data: store, isLoading } = useQuery({
    queryKey: ["merchant-store-check"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth/login");
        return null;
      }
      
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .eq("merchant_id", user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  // Get orders for the store
  const { data: orders } = useQuery({
    queryKey: ["merchant-dashboard-orders", store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("store_id", store.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!store?.id,
  });

  // Get products for the store
  const { data: products } = useQuery({
    queryKey: ["merchant-dashboard-products", store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("store_id", store.id);

      if (error) throw error;
      return data;
    },
    enabled: !!store?.id,
  });

  // Calculate statistics
  const today = new Date().toISOString().split("T")[0];
  const todayOrders = orders?.filter(o => o.created_at?.startsWith(today)) || [];
  const totalSales = orders?.reduce((sum, o) => sum + o.subtotal, 0) || 0;
  const totalProducts = products?.length || 0;
  const storeRating = store?.rating || 0;

  // Get recent orders (last 5)
  const recentOrders = orders?.slice(0, 5) || [];

  // Calculate top products from order items
  const productSales: Record<string, { name: string; count: number; revenue: number }> = {};
  orders?.forEach(order => {
    const items = order.items as any[];
    items?.forEach(item => {
      const name = item.name || "منتج";
      if (!productSales[name]) {
        productSales[name] = { name, count: 0, revenue: 0 };
      }
      productSales[name].count += item.quantity || 1;
      productSales[name].revenue += (item.price || 0) * (item.quantity || 1);
    });
  });

  const topProducts = Object.values(productSales)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Format time ago
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "الآن";
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    return `منذ ${diffDays} يوم`;
  };

  // Stats data
  const stats = [
    {
      label: "طلبات اليوم",
      value: todayOrders.length.toString(),
      icon: Package,
      color: "from-primary to-emerald-600",
    },
    {
      label: "إجمالي المبيعات",
      value: `${totalSales.toFixed(0)} ر.س`,
      icon: DollarSign,
      color: "from-blue-500 to-cyan-500",
    },
    {
      label: "المنتجات",
      value: totalProducts.toString(),
      icon: ShoppingBag,
      color: "from-orange-500 to-amber-500",
    },
    {
      label: "التقييم",
      value: storeRating.toFixed(1),
      icon: Star,
      color: "from-purple-500 to-violet-500",
    },
  ];

  // Show loading state
  if (isLoading) {
    return (
      <DashboardLayout role="merchant">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  // Show create store prompt if no store exists
  if (!store) {
    return (
      <DashboardLayout role="merchant">
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="max-w-md w-full">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Store className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold mb-2">مرحباً بك!</h2>
              <p className="text-muted-foreground mb-6">
                لم تقم بإنشاء متجرك بعد. أنشئ متجرك الآن وابدأ البيع على سوقنا.
              </p>
              <Button onClick={() => navigate("/merchant/create-store")} className="gap-2">
                <Store className="w-4 h-4" />
                إنشاء متجر جديد
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="merchant">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">مرحباً، {store.name}</h1>
            <p className="text-muted-foreground">إليك نظرة عامة على أداء متجرك اليوم</p>
            {!store.is_approved && (
              <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 text-sm">
                <Clock className="w-4 h-4" />
                في انتظار موافقة الإدارة
              </div>
            )}
          </div>
          <Link to={`/store/${store.id}`}>
            <Button variant="outline" className="gap-2">
              <Eye className="w-4 h-4" />
              معاينة المتجر
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <div 
              key={index}
              className="bg-card rounded-2xl p-6 border border-border/50 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                  <stat.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <div className="flex items-center gap-1 text-sm font-medium text-success">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold mb-1">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Orders */}
          <div className="lg:col-span-2 bg-card rounded-2xl border border-border/50 overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="font-bold text-lg">أحدث الطلبات</h2>
              <Link to="/merchant/orders">
                <Button variant="ghost" size="sm" className="gap-2">
                  عرض الكل
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
            </div>
            <div className="divide-y divide-border">
              {recentOrders.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>لا توجد طلبات حتى الآن</p>
                </div>
              ) : (
                recentOrders.map((order) => {
                  const items = order.items as any[];
                  const itemCount = items?.reduce((sum, i) => sum + (i.quantity || 1), 0) || 0;
                  
                  return (
                    <div key={order.id} className="p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <span className="font-semibold">{order.order_number}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs text-white ${statusColors[order.status as OrderStatus]}`}>
                              {statusLabels[order.status as OrderStatus]}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {order.customer_phone || "عميل"} • {itemCount} منتجات • {formatTimeAgo(order.created_at!)}
                          </div>
                        </div>
                        <div className="text-left font-semibold">{order.total} ر.س</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Top Products */}
          <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="font-bold text-lg">الأكثر مبيعاً</h2>
            </div>
            <div className="divide-y divide-border">
              {topProducts.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>لا توجد مبيعات بعد</p>
                </div>
              ) : (
                topProducts.map((product, index) => (
                  <div key={index} className="p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center">
                        {index + 1}
                      </span>
                      <span className="font-medium truncate">{product.name}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{product.count} مبيعات</span>
                      <span className="font-semibold text-foreground">{product.revenue.toFixed(0)} ر.س</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default MerchantDashboard;
