import DashboardLayout from "../DashboardLayout";
import { 
  DollarSign,
  TrendingUp,
  Calendar,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Package
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from "date-fns";
import { ar } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";

const CourierEarnings = () => {
  const [period, setPeriod] = useState("today");
  const { user } = useAuth();

  const { data: orders, isLoading } = useQuery({
    queryKey: ['courier-earnings-orders', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          store:stores(name)
        `)
        .eq('courier_id', user?.id)
        .eq('status', 'delivered')
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  const { data: wallet } = useQuery({
    queryKey: ['courier-wallet', user?.id],
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

  const today = new Date();
  
  const getFilteredOrders = () => {
    if (!orders) return [];
    
    switch (period) {
      case "today":
        return orders.filter(o => {
          const date = new Date(o.updated_at || o.created_at || '');
          return date >= startOfDay(today) && date <= endOfDay(today);
        });
      case "week":
        return orders.filter(o => {
          const date = new Date(o.updated_at || o.created_at || '');
          return date >= startOfWeek(today, { locale: ar }) && date <= endOfWeek(today, { locale: ar });
        });
      case "month":
        return orders.filter(o => {
          const date = new Date(o.updated_at || o.created_at || '');
          return date >= startOfMonth(today) && date <= endOfMonth(today);
        });
      default:
        return orders;
    }
  };

  const filteredOrders = getFilteredOrders();
  const totalEarnings = filteredOrders.reduce((sum, o) => sum + (o.delivery_fee || 0), 0);
  const totalDeliveries = filteredOrders.length;

  // Calculate previous period for comparison
  const getPreviousPeriodOrders = () => {
    if (!orders) return [];
    
    switch (period) {
      case "today":
        const yesterday = subDays(today, 1);
        return orders.filter(o => {
          const date = new Date(o.updated_at || o.created_at || '');
          return date >= startOfDay(yesterday) && date <= endOfDay(yesterday);
        });
      case "week":
        const lastWeekStart = subDays(startOfWeek(today, { locale: ar }), 7);
        const lastWeekEnd = subDays(endOfWeek(today, { locale: ar }), 7);
        return orders.filter(o => {
          const date = new Date(o.updated_at || o.created_at || '');
          return date >= lastWeekStart && date <= lastWeekEnd;
        });
      case "month":
        const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        return orders.filter(o => {
          const date = new Date(o.updated_at || o.created_at || '');
          return date >= lastMonthStart && date <= lastMonthEnd;
        });
      default:
        return [];
    }
  };

  const previousOrders = getPreviousPeriodOrders();
  const previousEarnings = previousOrders.reduce((sum, o) => sum + (o.delivery_fee || 0), 0);
  const earningsChange = previousEarnings > 0 ? ((totalEarnings - previousEarnings) / previousEarnings) * 100 : 0;

  const formatDate = (date: string) => {
    return format(new Date(date), 'dd/MM/yyyy - hh:mm a', { locale: ar });
  };

  const periodLabels: Record<string, string> = {
    today: "اليوم",
    week: "هذا الأسبوع",
    month: "هذا الشهر",
    all: "الكل"
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
          <h1 className="text-2xl md:text-3xl font-bold mb-2">الأرباح</h1>
          <p className="text-muted-foreground">تتبع أرباحك ومعاملاتك</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card rounded-2xl p-6 border border-border/50">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-emerald-600 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                الرصيد الحالي
              </span>
            </div>
            <div className="text-3xl font-bold mb-1">{wallet?.balance?.toLocaleString() || 0} ر.س</div>
            <div className="text-sm text-muted-foreground">متاح للسحب</div>
          </div>

          <div className="bg-card rounded-2xl p-6 border border-border/50">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-primary-foreground" />
              </div>
              {earningsChange !== 0 && (
                <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${
                  earningsChange > 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                }`}>
                  {earningsChange > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {Math.abs(earningsChange).toFixed(0)}%
                </span>
              )}
            </div>
            <div className="text-3xl font-bold mb-1">{totalEarnings.toLocaleString()} ر.س</div>
            <div className="text-sm text-muted-foreground">أرباح {periodLabels[period]}</div>
          </div>

          <div className="bg-card rounded-2xl p-6 border border-border/50">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center">
                <Package className="w-6 h-6 text-primary-foreground" />
              </div>
            </div>
            <div className="text-3xl font-bold mb-1">{totalDeliveries}</div>
            <div className="text-sm text-muted-foreground">توصيلات {periodLabels[period]}</div>
          </div>
        </div>

        {/* Period Tabs */}
        <Tabs value={period} onValueChange={setPeriod}>
          <TabsList className="grid w-full grid-cols-4 max-w-lg">
            <TabsTrigger value="today">اليوم</TabsTrigger>
            <TabsTrigger value="week">الأسبوع</TabsTrigger>
            <TabsTrigger value="month">الشهر</TabsTrigger>
            <TabsTrigger value="all">الكل</TabsTrigger>
          </TabsList>

          <TabsContent value={period} className="mt-6">
            <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
              <div className="p-6 border-b border-border flex items-center justify-between">
                <h2 className="font-bold text-lg">سجل الأرباح</h2>
                <span className="text-sm text-muted-foreground">{totalDeliveries} توصيلة</span>
              </div>

              {filteredOrders.length === 0 ? (
                <div className="p-8 text-center">
                  <DollarSign className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="font-bold text-lg mb-2">لا توجد أرباح</h3>
                  <p className="text-muted-foreground">لم تكمل أي توصيلات في هذه الفترة</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredOrders.map((order) => (
                    <div key={order.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                          <TrendingUp className="w-5 h-5 text-success" />
                        </div>
                        <div>
                          <div className="font-medium">{order.order_number}</div>
                          <div className="text-sm text-muted-foreground">{order.store?.name}</div>
                        </div>
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-success">+{order.delivery_fee?.toLocaleString() || 0} ر.س</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(order.updated_at || order.created_at || '')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default CourierEarnings;
