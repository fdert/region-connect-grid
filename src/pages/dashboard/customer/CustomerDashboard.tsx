import DashboardLayout from "../DashboardLayout";
import { 
  Package, 
  Wallet,
  Gift,
  Star,
  ArrowLeft,
  Clock,
  Loader2,
  Eye
} from "lucide-react";
import { Link } from "react-router-dom";
import { useCustomerOrderNotifications } from "@/hooks/useCustomerOrderNotifications";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

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

const CustomerDashboard = () => {
  const { user } = useAuth();
  
  // تفعيل إشعارات الطلبات
  useCustomerOrderNotifications();

  // Fetch wallet data
  const { data: wallet } = useQuery({
    queryKey: ['customer-wallet', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  // Fetch orders
  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ['customer-orders', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          store:stores(name)
        `)
        .eq('customer_id', user?.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  // Fetch profile
  const { data: profile } = useQuery({
    queryKey: ['customer-profile', user?.id],
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

  // Fetch store reviews by user
  const { data: reviews } = useQuery({
    queryKey: ['customer-reviews', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_reviews')
        .select('*')
        .eq('user_id', user?.id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  // Calculate stats
  const totalOrders = orders?.length || 0;
  const walletBalance = wallet?.balance || 0;
  const points = wallet?.points || 0;
  const totalReviews = reviews?.length || 0;

  const stats = [
    {
      label: "طلباتي",
      value: totalOrders.toString(),
      icon: Package,
      color: "from-primary to-emerald-600",
    },
    {
      label: "رصيد المحفظة",
      value: `${walletBalance.toLocaleString()} ر.س`,
      icon: Wallet,
      color: "from-blue-500 to-cyan-500",
    },
    {
      label: "نقاطي",
      value: points.toLocaleString(),
      icon: Gift,
      color: "from-orange-500 to-amber-500",
    },
    {
      label: "تقييماتي",
      value: totalReviews.toString(),
      icon: Star,
      color: "from-purple-500 to-violet-500",
    },
  ];

  // Separate active and previous orders
  const activeStatuses = ['new', 'accepted_by_merchant', 'preparing', 'ready', 'assigned_to_courier', 'picked_up', 'on_the_way'];
  const activeOrders = orders?.filter(o => activeStatuses.includes(o.status || '')) || [];
  const previousOrders = orders?.filter(o => !activeStatuses.includes(o.status || '')).slice(0, 5) || [];

  // Calculate points progress (target: 2000 points)
  const targetPoints = 2000;
  const pointsProgress = Math.min((points / targetPoints) * 100, 100);
  const pointsNeeded = Math.max(targetPoints - points, 0);

  const formatTimeAgo = (date: string) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ar });
  };

  const formatDate = (date: string) => {
    return format(new Date(date), 'dd MMMM yyyy', { locale: ar });
  };

  const getItemsCount = (items: any) => {
    if (Array.isArray(items)) return items.length;
    return 0;
  };

  const firstName = profile?.full_name?.split(' ')[0] || 'عزيزي العميل';

  if (ordersLoading) {
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
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">مرحباً، {firstName}</h1>
          <p className="text-muted-foreground">مرحباً بعودتك! إليك آخر المستجدات</p>
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

        {/* Points Progress */}
        <div className="bg-gradient-to-br from-primary to-emerald-600 rounded-2xl p-6 text-primary-foreground">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-lg mb-1">برنامج المكافآت</h3>
              <p className="text-primary-foreground/80 text-sm">اجمع النقاط واستبدلها بهدايا رائعة</p>
            </div>
            <Gift className="w-10 h-10 opacity-50" />
          </div>
          <div className="mb-2">
            <div className="flex justify-between text-sm mb-1">
              <span>{points.toLocaleString()} نقطة</span>
              <span>{targetPoints.toLocaleString()} نقطة</span>
            </div>
            <Progress value={pointsProgress} className="h-2 bg-primary-foreground/20" />
          </div>
          <p className="text-sm text-primary-foreground/80">
            {pointsNeeded > 0 
              ? `تحتاج ${pointsNeeded.toLocaleString()} نقطة إضافية للحصول على قسيمة خصم 50 ر.س`
              : 'لقد وصلت للهدف! يمكنك استبدال نقاطك بمكافآت رائعة'
            }
          </p>
        </div>

        {/* Active Orders */}
        {activeOrders.length > 0 && (
          <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="font-bold text-lg">الطلبات النشطة</h2>
            </div>
            <div className="divide-y divide-border">
              {activeOrders.map((order) => (
                <Link key={order.id} to={`/customer/orders/${order.id}`} className="block p-6 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-bold">{order.order_number}</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium text-primary-foreground ${statusColors[order.status || 'new']}`}>
                          {statusLabels[order.status || 'new']}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {order.store?.name} • {getItemsCount(order.items)} منتجات
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="font-bold">{order.total?.toLocaleString()} ر.س</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimeAgo(order.created_at || '')}
                      </div>
                    </div>
                  </div>
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
          </div>
        )}

        {/* No Active Orders */}
        {activeOrders.length === 0 && (
          <div className="bg-card rounded-2xl border border-border/50 p-8 text-center">
            <Package className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-bold text-lg mb-2">لا توجد طلبات نشطة</h3>
            <p className="text-muted-foreground mb-4">ابدأ بالتسوق واطلب من متاجرك المفضلة</p>
            <Link to="/stores">
              <Button>تصفح المتاجر</Button>
            </Link>
          </div>
        )}

        {/* Previous Orders */}
        {previousOrders.length > 0 && (
          <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="font-bold text-lg">الطلبات السابقة</h2>
              <Link to="/customer/orders">
                <Button variant="ghost" size="sm" className="gap-2">
                  عرض الكل
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
            </div>
            <div className="divide-y divide-border">
              {previousOrders.map((order) => (
                <Link key={order.id} to={`/customer/orders/${order.id}`} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors block">
                  <div>
                    <div className="font-medium mb-1">{order.order_number}</div>
                    <div className="text-sm text-muted-foreground">{order.store?.name}</div>
                  </div>
                  <div className="text-left flex items-center gap-4">
                    <div>
                      <div className="font-semibold">{order.total?.toLocaleString()} ر.س</div>
                      <div className="text-xs text-muted-foreground">{formatDate(order.created_at || '')}</div>
                    </div>
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default CustomerDashboard;
